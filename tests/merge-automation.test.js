const {
    MAX_FILE_SIZE_BYTES,
    MAX_FILES_PER_REPOSITORY,
    MergeAutomationError,
    encodeContentPath,
    computeRepositoryRiskScore,
    generateMergeInsights,
    inferRepositoryCapabilities,
    mergeRepositoriesIntoTarget,
    preflightSourceRepositories,
    normalizeBase64Content
} = require('../utils/merge-automation');

function sourceRepository(overrides = {}) {
    return {
        name: 'repo-a',
        folder: 'repo-a',
        full_name: 'octocat/repo-a',
        clone_url: 'https://github.com/octocat/repo-a.git',
        ...overrides
    };
}

function createAxiosClient({ tree, blobContent = 'c21hbGw=', blobError, privateSource = false } = {}) {
    const files = tree || [
        { type: 'blob', mode: '100644', path: 'README.md', sha: 'source-readme', size: 5 }
    ];

    const client = {
        get: jest.fn(async url => {
            if (url === 'https://api.github.com/repos/octocat/repo-a') {
                return { data: { default_branch: 'main', private: privateSource, disabled: false } };
            }

            if (url.includes('/git/trees/main?recursive=1')) {
                return { data: { tree: files, truncated: false } };
            }

            if (url.includes('/git/blobs/')) {
                if (blobError) throw blobError;
                return { data: { encoding: 'base64', content: blobContent } };
            }

            if (url.includes('/git/ref/heads/main')) {
                return { data: { object: { sha: 'base-commit' } } };
            }

            if (url.includes('/git/commits/base-commit')) {
                return { data: { tree: { sha: 'base-tree' } } };
            }

            throw new Error(`Unexpected GET URL: ${url}`);
        }),
        post: jest.fn(async url => {
            if (url.endsWith('/git/blobs')) return { data: { sha: 'target-blob' } };
            if (url.endsWith('/git/trees')) return { data: { sha: 'merge-tree' } };
            if (url.endsWith('/git/commits')) return { data: { sha: 'merge-commit' } };
            throw new Error(`Unexpected POST URL: ${url}`);
        }),
        patch: jest.fn(async () => ({ data: { ref: 'refs/heads/main' } })),
        delete: jest.fn(async () => ({ data: {} }))
    };

    return client;
}

describe('Merge Automation Utilities', () => {
    it('normalizes base64 content by removing all whitespace', () => {
        expect(normalizeBase64Content('YWJj\n ZGVm\r\n')).toBe('YWJjZGVm');
    });

    it('encodes nested content paths safely', () => {
        expect(encodeContentPath('repo name/src/file one.js')).toBe('repo%20name/src/file%20one.js');
    });

    it('infers capabilities deterministically from file paths', () => {
        const capabilities = inferRepositoryCapabilities([
            { path: 'src/components/App.tsx' },
            { path: '.github/workflows/ci.yml' },
            { path: 'openapi.yaml' }
        ]);

        expect(capabilities).toEqual(expect.arrayContaining(['frontend', 'ci_cd', 'api']));
    });

    it('computes deterministic risk from failed file evidence', () => {
        expect(computeRepositoryRiskScore({ mergedFiles: 5, failedFiles: [] })).toBe(0.1);
        expect(computeRepositoryRiskScore({ mergedFiles: 0, failedFiles: [{ path: 'file' }] })).toBeGreaterThan(0.4);
    });

    it('does not label deterministic insights as AI', () => {
        const insights = generateMergeInsights([
            { full_name: 'octocat/repo-a', failedFiles: [], mergedFiles: 3, mergedBytes: 12, capabilities: ['testing'] }
        ]);

        expect(insights).toEqual([
            expect.objectContaining({
                analysisType: 'deterministic',
                repository: 'octocat/repo-a'
            })
        ]);
        expect(JSON.stringify(insights)).not.toContain('AI');
    });

    it('publishes one Git Data commit and preserves Git modes', async () => {
        const axiosClient = createAxiosClient({
            tree: [
                { type: 'blob', mode: '100755', path: 'bin/run.sh', sha: 'source-script', size: 5 },
                { type: 'blob', mode: '120000', path: 'current', sha: 'source-link', size: 5 },
                { type: 'commit', mode: '160000', path: 'vendor/lib', sha: 'submodule-commit' }
            ]
        });

        const result = await mergeRepositoriesIntoTarget({
            axiosClient,
            headers: {},
            sourceRepositories: [sourceRepository()],
            targetFullName: 'octocat/merged-repo',
            targetBranch: 'main',
            targetPrivate: false
        });

        expect(result).toEqual(expect.objectContaining({
            status: 'completed',
            atomic: true,
            commitSha: 'merge-commit',
            mergedFiles: 3,
            mergedBytes: 10,
            sourceHistoryPreserved: false
        }));
        expect(axiosClient.patch).toHaveBeenCalledTimes(1);
        expect(axiosClient.patch.mock.calls[0][1]).toEqual({ sha: 'merge-commit', force: false });
        expect(axiosClient.post.mock.calls.filter(([url]) => url.endsWith('/git/trees')).length).toBe(1);
        expect(axiosClient.post.mock.calls.filter(([url]) => url.endsWith('/git/commits')).length).toBe(1);

        const treePayload = axiosClient.post.mock.calls.find(([url]) => url.endsWith('/git/trees'))[1];
        expect(treePayload.base_tree).toBe('base-tree');
        expect(treePayload.tree).toEqual(expect.arrayContaining([
            expect.objectContaining({ path: 'repo-a/bin/run.sh', mode: '100755', type: 'blob' }),
            expect.objectContaining({ path: 'repo-a/current', mode: '120000', type: 'blob' }),
            expect.objectContaining({ path: 'repo-a/vendor/lib', mode: '160000', type: 'commit', sha: 'submodule-commit' })
        ]));
    });

    it('fails closed on a truncated source tree before publishing', async () => {
        const axiosClient = createAxiosClient();
        axiosClient.get.mockImplementation(async url => {
            if (url === 'https://api.github.com/repos/octocat/repo-a') {
                return { data: { default_branch: 'main', private: false, disabled: false } };
            }
            if (url.includes('/git/trees/main?recursive=1')) {
                return { data: { tree: [], truncated: true } };
            }
            throw new Error(`Unexpected GET URL: ${url}`);
        });

        await expect(mergeRepositoriesIntoTarget({
            axiosClient,
            headers: {},
            sourceRepositories: [sourceRepository()],
            targetFullName: 'octocat/merged-repo'
        })).rejects.toMatchObject({
            name: 'MergeAutomationError',
            code: 'source_tree_truncated'
        });
        expect(axiosClient.post).not.toHaveBeenCalled();
        expect(axiosClient.patch).not.toHaveBeenCalled();
    });

    it('rejects oversized files during preflight', async () => {
        const axiosClient = createAxiosClient({
            tree: [{ type: 'blob', mode: '100644', path: 'large.bin', sha: 'large', size: MAX_FILE_SIZE_BYTES + 1 }]
        });

        await expect(mergeRepositoriesIntoTarget({
            axiosClient,
            headers: {},
            sourceRepositories: [sourceRepository()],
            targetFullName: 'octocat/merged-repo'
        })).rejects.toMatchObject({ code: 'source_file_too_large' });
        expect(axiosClient.post).not.toHaveBeenCalled();
        expect(axiosClient.patch).not.toHaveBeenCalled();
    });

    it('rejects excessive source file counts before staging', async () => {
        const axiosClient = createAxiosClient({
            tree: Array.from({ length: MAX_FILES_PER_REPOSITORY + 1 }, (_, index) => ({
                type: 'blob', mode: '100644', path: `file-${index}.txt`, sha: `sha-${index}`, size: 1
            }))
        });

        await expect(mergeRepositoriesIntoTarget({
            axiosClient,
            headers: {},
            sourceRepositories: [sourceRepository()],
            targetFullName: 'octocat/merged-repo'
        })).rejects.toMatchObject({ code: 'source_file_count_exceeded' });
        expect(axiosClient.post).not.toHaveBeenCalled();
    });

    it('leaves the target branch unpublished when blob staging fails', async () => {
        const axiosClient = createAxiosClient({
            tree: [
                { type: 'blob', mode: '100644', path: 'first.txt', sha: 'first', size: 1 },
                { type: 'blob', mode: '100644', path: 'second.txt', sha: 'second', size: 1 }
            ],
            blobError: Object.assign(new Error('blob unavailable'), { response: { status: 503, data: { message: 'unavailable' } } })
        });

        await expect(mergeRepositoriesIntoTarget({
            axiosClient,
            headers: {},
            sourceRepositories: [sourceRepository()],
            targetFullName: 'octocat/merged-repo'
        })).rejects.toMatchObject({
            name: 'MergeAutomationError',
            code: 'source_blob_unavailable'
        });
        expect(axiosClient.patch).not.toHaveBeenCalled();
    });

    it('rejects private sources when the target is public', async () => {
        const axiosClient = createAxiosClient({ privateSource: true });

        await expect(preflightSourceRepositories({
            axiosClient,
            headers: {},
            sourceRepositories: [sourceRepository()],
            targetPrivate: false
        })).rejects.toMatchObject({
            code: 'private_source_requires_private_target',
            statusCode: 409
        });
    });

    it('exposes the structured error type', () => {
        const error = new MergeAutomationError('example', 'Example failure', { safe: true }, 409);
        expect(error).toMatchObject({ name: 'MergeAutomationError', code: 'example', statusCode: 409 });
    });
});
