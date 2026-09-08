const {
    MAX_FILE_SIZE_BYTES,
    normalizeBase64Content,
    encodeContentPath,
    inferRepositoryCapabilities,
    computeRepositoryRiskScore,
    generateAIMergeInsights,
    mergeRepositoriesIntoTarget
} = require('../utils/merge-automation');

describe('Merge Automation Utilities', () => {
    it('normalizes base64 content by removing new lines', () => {
        expect(normalizeBase64Content('YWJj\nZGVm')).toBe('YWJjZGVm');
    });

    it('encodes nested content path safely', () => {
        expect(encodeContentPath('repo name/src/file one.js')).toBe('repo%20name/src/file%20one.js');
    });



    it('infers repository capabilities from file paths', () => {
        const capabilities = inferRepositoryCapabilities([
            { path: 'src/components/App.tsx' },
            { path: '.github/workflows/ci.yml' },
            { path: 'openapi.yaml' }
        ]);

        expect(capabilities).toEqual(expect.arrayContaining(['frontend', 'ci_cd', 'api']));
    });

    it('computes repository risk score using skipped files and merge count', () => {
        expect(computeRepositoryRiskScore({ mergedFiles: 5, skippedFiles: [] })).toBeGreaterThan(0);
        expect(computeRepositoryRiskScore({ mergedFiles: 0, skippedFiles: ['failure'] })).toBeGreaterThan(0.4);
    });

    it('generates AI merge insights from repository results', () => {
        const insights = generateAIMergeInsights([
            { full_name: 'octocat/repo-a', skippedFiles: [], mergedFiles: 3 },
            { full_name: 'octocat/repo-b', skippedFiles: ['Skipped repo-b/large.bin: file exceeds 1048576 bytes'], mergedFiles: 0 }
        ]);

        expect(insights).toHaveLength(2);
        expect(insights[0].confidence).toBeGreaterThan(0.9);
        expect(insights[1].recommendation).toContain('Git LFS');
    });

    it('skips oversized files and merges valid blobs', async () => {
        const axiosClient = {
            get: jest.fn(url => {
                if (url === 'https://api.github.com/repos/octocat/repo-a') {
                    return Promise.resolve({ data: { default_branch: 'main' } });
                }

                if (url.includes('/git/trees/main?recursive=1')) {
                    return Promise.resolve({
                        data: {
                            tree: [
                                { type: 'blob', path: '__tests__/small.test.js', sha: 'sha-small', size: 32 },
                                { type: 'blob', path: 'large.bin', sha: 'sha-large', size: MAX_FILE_SIZE_BYTES + 1 }
                            ]
                        }
                    });
                }

                if (url.includes('/git/blobs/sha-small')) {
                    return Promise.resolve({ data: { content: Buffer.from('small').toString('base64') } });
                }

                throw new Error(`Unexpected get URL: ${url}`);
            }),
            put: jest.fn(() => Promise.resolve({ data: {} }))
        };

        const result = await mergeRepositoriesIntoTarget({
            axiosClient,
            headers: {},
            sourceRepositories: [
                {
                    name: 'repo-a',
                    full_name: 'octocat/repo-a',
                    clone_url: 'https://github.com/octocat/repo-a.git'
                }
            ],
            targetFullName: 'octocat/merged-repo',
            targetBranch: 'main'
        });

        expect(result.mergedFiles).toBe(1);
        expect(result.skippedFiles.length).toBe(1);
        expect(result.skippedFiles[0]).toContain('exceeds');
        expect(axiosClient.put).toHaveBeenCalledTimes(1);
        expect(result.aiInsights).toHaveLength(1);
        expect(result.repositoryResults[0].capabilities).toContain('testing');
    });
});
