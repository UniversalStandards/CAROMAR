const request = require('supertest');
const axios = require('axios');

jest.mock('axios');

const app = require('../server');

describe('Merged Repository Endpoint Validation (Real Server)', () => {
    const validToken = `ghp_${'a'.repeat(40)}`;
    const validRepository = {
        name: 'repo-one',
        full_name: 'octocat/repo-one',
        clone_url: 'https://github.com/octocat/repo-one.git'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('rejects repositories with non-GitHub clone URLs before creating a target', async () => {
        const response = await request(app)
            .post('/api/create-merged-repo')
            .set('Authorization', `Bearer ${validToken}`)
            .send({
                name: 'secure-merge',
                repositories: [{
                    name: 'unsafe-repo',
                    full_name: 'octocat/unsafe-repo',
                    clone_url: 'https://evil.example.com/repo.git'
                }]
            });

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toContain('invalid clone_url');
        expect(axios.post).not.toHaveBeenCalled();
    });

    it('automatically merges repository content with one atomic publication', async () => {
        axios.post.mockImplementation(async url => {
            if (url === 'https://api.github.com/user/repos') {
                return {
                    data: {
                        name: 'secure-merge',
                        full_name: 'octocat/secure-merge',
                        html_url: 'https://github.com/octocat/secure-merge',
                        clone_url: 'https://github.com/octocat/secure-merge.git',
                        ssh_url: 'git@github.com:octocat/secure-merge.git',
                        default_branch: 'main'
                    }
                };
            }
            if (url.endsWith('/git/blobs')) return { data: { sha: 'target-blob' } };
            if (url.endsWith('/git/trees')) return { data: { sha: 'merge-tree' } };
            if (url.endsWith('/git/commits')) return { data: { sha: 'merge-commit' } };
            throw new Error(`Unexpected axios.post URL: ${url}`);
        });

        axios.get.mockImplementation(async url => {
            if (url === 'https://api.github.com/repos/octocat/repo-one') {
                return { data: { default_branch: 'main', private: false, disabled: false } };
            }
            if (url.includes('/git/trees/main?recursive=1')) {
                return {
                    data: {
                        tree: [{ type: 'blob', mode: '100644', path: 'README.md', sha: 'blob-sha', size: 5 }],
                        truncated: false
                    }
                };
            }
            if (url.includes('/git/blobs/blob-sha')) {
                return { data: { encoding: 'base64', content: Buffer.from('hello').toString('base64') } };
            }
            if (url.includes('/git/ref/heads/main')) {
                return { data: { object: { sha: 'base-commit' } } };
            }
            if (url.includes('/git/commits/base-commit')) {
                return { data: { tree: { sha: 'base-tree' } } };
            }
            throw new Error(`Unexpected axios.get URL in test: ${url}`);
        });
        axios.patch.mockResolvedValue({ data: { ref: 'refs/heads/main' } });
        axios.delete.mockResolvedValue({ data: {} });

        const response = await request(app)
            .post('/api/create-merged-repo')
            .set('Authorization', `Bearer ${validToken}`)
            .send({
                name: 'secure-merge',
                repositories: [validRepository],
                private: false
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.automated_merge).toEqual(expect.objectContaining({
            atomic: true,
            commitSha: 'merge-commit',
            mergedFiles: 1,
            mergedBytes: 5
        }));
        expect(response.body.automated_merge.insights[0].analysisType).toBe('deterministic');
        expect(response.body.automated_merge).not.toHaveProperty('aiInsights');
        expect(axios.post).toHaveBeenCalledTimes(4);
        expect(axios.patch).toHaveBeenCalledTimes(1);
        expect(axios.delete).not.toHaveBeenCalled();
    });

    it('rolls back a newly created target when staging fails', async () => {
        axios.post.mockImplementation(async url => {
            if (url === 'https://api.github.com/user/repos') {
                return {
                    data: {
                        name: 'rollback-merge',
                        full_name: 'octocat/rollback-merge',
                        html_url: 'https://github.com/octocat/rollback-merge',
                        clone_url: 'https://github.com/octocat/rollback-merge.git',
                        default_branch: 'main'
                    }
                };
            }
            throw new Error(`Unexpected target POST URL: ${url}`);
        });
        axios.get.mockImplementation(async url => {
            if (url === 'https://api.github.com/repos/octocat/repo-one') {
                return { data: { default_branch: 'main', private: false, disabled: false } };
            }
            if (url.includes('/git/trees/main?recursive=1')) {
                return { data: { tree: [{ type: 'blob', mode: '100644', path: 'README.md', sha: 'blob-sha', size: 5 }], truncated: false } };
            }
            if (url.includes('/git/ref/heads/main')) return { data: { object: { sha: 'base-commit' } } };
            if (url.includes('/git/commits/base-commit')) return { data: { tree: { sha: 'base-tree' } } };
            if (url.includes('/git/blobs/blob-sha')) {
                throw Object.assign(new Error('upstream unavailable'), { response: { status: 503, data: { message: 'upstream unavailable' } } });
            }
            throw new Error(`Unexpected axios.get URL in rollback test: ${url}`);
        });
        axios.delete.mockResolvedValue({ data: {} });

        const response = await request(app)
            .post('/api/create-merged-repo')
            .set('Authorization', `Bearer ${validToken}`)
            .send({
                name: 'rollback-merge',
                repositories: [validRepository],
                private: false
            });

        expect(response.statusCode).toBe(502);
        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('source_blob_unavailable');
        expect(response.body.rollback).toEqual({ attempted: true, succeeded: true });
        expect(axios.delete).toHaveBeenCalledWith(
            'https://api.github.com/repos/octocat/rollback-merge',
            expect.objectContaining({ headers: expect.any(Object) })
        );
        expect(axios.patch).not.toHaveBeenCalled();
    });

    it('rolls back when GitHub returns a truncated tree', async () => {
        axios.post.mockImplementation(async url => {
            if (url === 'https://api.github.com/user/repos') {
                return { data: { full_name: 'octocat/truncated-merge', default_branch: 'main' } };
            }
            throw new Error(`Unexpected target POST URL: ${url}`);
        });
        axios.get.mockImplementation(async url => {
            if (url === 'https://api.github.com/repos/octocat/repo-one') {
                return { data: { default_branch: 'main', private: false, disabled: false } };
            }
            if (url.includes('/git/trees/main?recursive=1')) return { data: { tree: [], truncated: true } };
            throw new Error(`Unexpected axios.get URL in truncated test: ${url}`);
        });
        axios.delete.mockResolvedValue({ data: {} });

        const response = await request(app)
            .post('/api/create-merged-repo')
            .set('Authorization', `Bearer ${validToken}`)
            .send({ name: 'truncated-merge', repositories: [validRepository] });

        expect(response.statusCode).toBe(409);
        expect(response.body.code).toBe('source_tree_truncated');
        expect(response.body.rollback).toEqual({ attempted: true, succeeded: true });
        expect(axios.delete).toHaveBeenCalledTimes(1);
        expect(axios.patch).not.toHaveBeenCalled();
    });
});
