/**
 * Atomic repository merge utilities for CAROMAR.
 *
 * The merge engine stages source blobs and one Git tree/commit in the target
 * repository, then advances the target branch exactly once. A source or
 * staging failure therefore cannot publish a partially merged branch.
 */

const { isValidRepoPath } = require('./validation');

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
const MAX_FILES_PER_REPOSITORY = 10_000;
const MAX_TOTAL_FILES = 50_000;
const MAX_TOTAL_BYTES = 500 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const SUPPORTED_BLOB_MODES = new Set(['100644', '100755', '120000']);

class MergeAutomationError extends Error {
    constructor(code, message, details = {}, statusCode = 502) {
        super(message);
        this.name = 'MergeAutomationError';
        this.code = code;
        this.details = details;
        this.statusCode = statusCode;
    }
}

function normalizeBase64Content(content = '') {
    return String(content).replace(/\s/g, '');
}

function encodeContentPath(path) {
    return path
        .split('/')
        .map(segment => encodeURIComponent(segment))
        .join('/');
}

function encodeReference(reference) {
    return encodeURIComponent(reference);
}

function githubRepoUrl(fullName, suffix = '') {
    return `https://api.github.com/repos/${fullName}${suffix}`;
}

function errorMessage(error) {
    return error.response?.data?.message || error.message || 'GitHub API request failed';
}

function isRetryableError(error) {
    return !error.response || RETRYABLE_STATUS_CODES.has(error.response.status);
}

function retryDelay(error, attempt) {
    const retryAfter = Number(error.response?.headers?.['retry-after']);
    if (Number.isFinite(retryAfter) && retryAfter >= 0) {
        return Math.min(retryAfter * 1000, 10_000);
    }

    return Math.min(250 * (2 ** attempt), 5_000);
}

async function requestWithRetry(axiosClient, method, url, data, config = {}) {
    const request = axiosClient[method];
    if (typeof request !== 'function') {
        throw new MergeAutomationError(
            'client_method_unavailable',
            `Configured HTTP client does not support ${method.toUpperCase()} requests`,
            { method, url },
            500
        );
    }

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
        try {
            const requestConfig = {
                ...config,
                timeout: config.timeout || REQUEST_TIMEOUT_MS
            };

            if (method === 'get' || method === 'delete') {
                return await request(url, requestConfig);
            }

            return await request(url, data, requestConfig);
        } catch (error) {
            if (attempt >= MAX_RETRIES || !isRetryableError(error)) {
                throw error;
            }

            await new Promise(resolve => setTimeout(resolve, retryDelay(error, attempt)));
        }
    }

    throw new MergeAutomationError('request_failed', 'GitHub API request failed after retries', { url }, 502);
}

function inferRepositoryCapabilities(files) {
    const capabilitySignals = [
        { key: 'api', patterns: ['openapi', 'swagger', 'routes/', '/api/'] },
        { key: 'frontend', patterns: ['package.json', 'src/components', 'public/', '.css', '.tsx', '.jsx'] },
        { key: 'ci_cd', patterns: ['.github/workflows', 'jenkinsfile', 'dockerfile'] },
        { key: 'testing', patterns: ['__tests__', '.test.', '.spec.', 'jest.config', 'pytest.ini'] },
        { key: 'infrastructure', patterns: ['terraform', '.tf', 'k8s', 'helm', 'docker-compose'] }
    ];

    const filePaths = files.map(file => (file.path || '').toLowerCase());
    return capabilitySignals
        .filter(signal => signal.patterns.some(pattern => filePaths.some(path => path.includes(pattern.toLowerCase()))))
        .map(signal => signal.key);
}

function getFailureEntries(repositoryResult) {
    return repositoryResult.failedFiles || repositoryResult.skippedFiles || [];
}

function computeRepositoryRiskScore(repositoryResult) {
    const failureCount = getFailureEntries(repositoryResult).length;
    const failurePenalty = Math.min(0.8, failureCount * 0.2);
    const mergePenalty = repositoryResult.mergedFiles === 0 ? 0.4 : 0;
    const score = Math.min(1, 0.1 + failurePenalty + mergePenalty);
    return Number(score.toFixed(2));
}

/**
 * Produce deterministic merge analysis. This is deliberately not labelled as
 * AI: it is a transparent, repeatable rules engine over observed file paths
 * and merge results.
 */
function generateMergeInsights(repositoryResults) {
    return repositoryResults.map(result => {
        const failedCount = getFailureEntries(result).length;
        const recommendation = failedCount === 0
            ? 'Repository merged cleanly. No additional remediation required.'
            : 'Repository merge failed validation or staging. Review the recorded failure before retrying.';

        return {
            analysisType: 'deterministic',
            repository: result.full_name,
            recommendation,
            evidence: {
                mergedFiles: result.mergedFiles,
                mergedBytes: result.mergedBytes,
                failedFiles: failedCount,
                capabilities: result.capabilities
            },
            riskScore: computeRepositoryRiskScore(result)
        };
    });
}

async function getRepositoryMetadata(axiosClient, headers, sourceFullName) {
    try {
        const response = await requestWithRetry(
            axiosClient,
            'get',
            githubRepoUrl(sourceFullName),
            undefined,
            { headers }
        );
        return response.data;
    } catch (error) {
        throw new MergeAutomationError(
            'source_repository_unavailable',
            `Unable to inspect source repository ${sourceFullName}: ${errorMessage(error)}`,
            { sourceRepository: sourceFullName, upstreamStatus: error.response?.status },
            error.response?.status === 404 ? 404 : 502
        );
    }
}

async function preflightSourceRepositories({ axiosClient, headers, sourceRepositories, targetPrivate = false }) {
    const metadataByFullName = new Map();

    for (const sourceRepository of sourceRepositories) {
        const metadata = await getRepositoryMetadata(axiosClient, headers, sourceRepository.full_name);
        if (metadata.disabled) {
            throw new MergeAutomationError(
                'source_repository_disabled',
                `Source repository ${sourceRepository.full_name} is disabled`,
                { sourceRepository: sourceRepository.full_name },
                409
            );
        }

        if (metadata.private && !targetPrivate) {
            throw new MergeAutomationError(
                'private_source_requires_private_target',
                `Private source repository ${sourceRepository.full_name} requires a private target repository`,
                { sourceRepository: sourceRepository.full_name },
                409
            );
        }

        metadataByFullName.set(sourceRepository.full_name.toLowerCase(), metadata);
    }

    return metadataByFullName;
}

async function getRepositoryTree(axiosClient, headers, sourceFullName, defaultBranch) {
    const metadata = defaultBranch ? null : await getRepositoryMetadata(axiosClient, headers, sourceFullName);
    const branch = defaultBranch || metadata.default_branch || 'main';
    let treeResponse;
    try {
        treeResponse = await requestWithRetry(
            axiosClient,
            'get',
            `${githubRepoUrl(sourceFullName)}/git/trees/${encodeReference(branch)}?recursive=1`,
            undefined,
            { headers }
        );
    } catch (error) {
        throw new MergeAutomationError(
            'source_tree_unavailable',
            `Unable to read the source tree for ${sourceFullName}: ${errorMessage(error)}`,
            { sourceRepository: sourceFullName, defaultBranch: branch, upstreamStatus: error.response?.status },
            error.response?.status === 404 ? 404 : 502
        );
    }
    const treeData = treeResponse.data || {};

    if (treeData.truncated) {
        throw new MergeAutomationError(
            'source_tree_truncated',
            `GitHub returned a truncated tree for ${sourceFullName}; refusing to publish an incomplete merge`,
            { sourceRepository: sourceFullName, defaultBranch: branch },
            409
        );
    }

    const files = (treeData.tree || []).filter(item => item.type === 'blob' || item.type === 'commit');
    if (files.length === 0) {
        throw new MergeAutomationError(
            'empty_source_repository',
            `Source repository ${sourceFullName} has no mergeable files`,
            { sourceRepository: sourceFullName },
            422
        );
    }

    return {
        files,
        defaultBranch: branch,
        metadata
    };
}

function validateTreeFile(file, sourceFullName) {
    if (!file.path || !isValidRepoPath(file.path)) {
        throw new MergeAutomationError(
            'invalid_source_path',
            `Source repository ${sourceFullName} contains an invalid path`,
            { sourceRepository: sourceFullName, path: file.path },
            422
        );
    }

    const mode = file.mode || '100644';
    if (file.type === 'blob' && !SUPPORTED_BLOB_MODES.has(mode)) {
        throw new MergeAutomationError(
            'unsupported_git_mode',
            `Source repository ${sourceFullName} contains unsupported Git mode ${mode}`,
            { sourceRepository: sourceFullName, path: file.path, mode },
            422
        );
    }

    if (file.type === 'commit' && mode !== '160000') {
        throw new MergeAutomationError(
            'invalid_submodule_mode',
            `Source repository ${sourceFullName} contains a submodule with invalid mode`,
            { sourceRepository: sourceFullName, path: file.path, mode },
            422
        );
    }
}

function createRepositoryResult(sourceRepository, files) {
    return {
        full_name: sourceRepository.full_name,
        folder: sourceRepository.folder || sourceRepository.name,
        sourceFiles: files.length,
        mergedFiles: 0,
        mergedBytes: 0,
        failedFiles: [],
        capabilities: inferRepositoryCapabilities(files),
        analysisType: 'deterministic',
        riskScore: 0
    };
}

async function createMergePlan({ axiosClient, headers, sourceRepositories, metadataByFullName }) {
    const plans = [];
    let totalFiles = 0;
    let totalBytes = 0;

    for (const sourceRepository of sourceRepositories) {
        const metadata = metadataByFullName.get(sourceRepository.full_name.toLowerCase());
        const tree = await getRepositoryTree(
            axiosClient,
            headers,
            sourceRepository.full_name,
            metadata?.default_branch
        );
        const repositoryResult = createRepositoryResult(sourceRepository, tree.files);

        if (tree.files.length > MAX_FILES_PER_REPOSITORY) {
            throw new MergeAutomationError(
                'source_file_count_exceeded',
                `Source repository ${sourceRepository.full_name} exceeds the per-repository file limit`,
                { sourceRepository: sourceRepository.full_name, fileCount: tree.files.length, limit: MAX_FILES_PER_REPOSITORY },
                413
            );
        }

        let repositoryBytes = 0;
        for (const file of tree.files) {
            validateTreeFile(file, sourceRepository.full_name);
            const fileSize = file.type === 'commit' ? 0 : Number(file.size);
            if (!Number.isFinite(fileSize) || fileSize < 0) {
                throw new MergeAutomationError(
                    'source_file_size_unknown',
                    `GitHub did not provide a valid size for ${sourceRepository.full_name}/${file.path}`,
                    { sourceRepository: sourceRepository.full_name, path: file.path },
                    502
                );
            }

            if (fileSize > MAX_FILE_SIZE_BYTES) {
                throw new MergeAutomationError(
                    'source_file_too_large',
                    `Source file ${sourceRepository.full_name}/${file.path} exceeds the per-file limit`,
                    { sourceRepository: sourceRepository.full_name, path: file.path, size: fileSize, limit: MAX_FILE_SIZE_BYTES },
                    413
                );
            }

            repositoryBytes += fileSize;
        }

        totalFiles += tree.files.length;
        totalBytes += repositoryBytes;
        if (totalFiles > MAX_TOTAL_FILES) {
            throw new MergeAutomationError(
                'merge_file_count_exceeded',
                'The selected repositories exceed the aggregate file limit',
                { fileCount: totalFiles, limit: MAX_TOTAL_FILES },
                413
            );
        }

        if (totalBytes > MAX_TOTAL_BYTES) {
            throw new MergeAutomationError(
                'merge_size_exceeded',
                'The selected repositories exceed the aggregate size limit',
                { totalBytes, limit: MAX_TOTAL_BYTES },
                413
            );
        }

        plans.push({ sourceRepository, metadata, tree, repositoryResult });
    }

    return { plans, totalFiles, totalBytes };
}

function getBase64BlobContent(blobResponse, sourceFullName, path) {
    const blobData = blobResponse.data || {};
    const content = normalizeBase64Content(blobData.content);
    if (blobData.encoding && blobData.encoding !== 'base64') {
        throw new MergeAutomationError(
            'unsupported_blob_encoding',
            `GitHub returned unsupported encoding for ${sourceFullName}/${path}`,
            { sourceRepository: sourceFullName, path, encoding: blobData.encoding },
            502
        );
    }

    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(content) || content.length % 4 === 1) {
        throw new MergeAutomationError(
            'invalid_blob_content',
            `GitHub returned invalid blob content for ${sourceFullName}/${path}`,
            { sourceRepository: sourceFullName, path },
            502
        );
    }

    return content;
}

async function copyBlobToTarget({ axiosClient, headers, targetFullName, sourceFullName, file }) {
    let blobResponse;
    try {
        blobResponse = await requestWithRetry(
            axiosClient,
            'get',
            `${githubRepoUrl(sourceFullName)}/git/blobs/${encodeReference(file.sha)}`,
            undefined,
            { headers }
        );
    } catch (error) {
        throw new MergeAutomationError(
            'source_blob_unavailable',
            `Unable to read ${sourceFullName}/${file.path}: ${errorMessage(error)}`,
            { sourceRepository: sourceFullName, path: file.path, upstreamStatus: error.response?.status },
            502
        );
    }

    const content = getBase64BlobContent(blobResponse, sourceFullName, file.path);
    const bytes = Buffer.from(content, 'base64').length;
    if (bytes > MAX_FILE_SIZE_BYTES) {
        throw new MergeAutomationError(
            'source_file_too_large',
            `Source file ${sourceFullName}/${file.path} exceeds the per-file limit`,
            { sourceRepository: sourceFullName, path: file.path, size: bytes, limit: MAX_FILE_SIZE_BYTES },
            413
        );
    }

    try {
        const targetBlobResponse = await requestWithRetry(
            axiosClient,
            'post',
            `${githubRepoUrl(targetFullName)}/git/blobs`,
            { encoding: 'base64', content },
            { headers }
        );
        const targetSha = targetBlobResponse.data?.sha;
        if (!targetSha) {
            throw new MergeAutomationError(
                'target_blob_missing_sha',
                `GitHub did not return a blob SHA for ${sourceFullName}/${file.path}`,
                { sourceRepository: sourceFullName, path: file.path },
                502
            );
        }

        return { sha: targetSha, bytes };
    } catch (error) {
        if (error instanceof MergeAutomationError) {
            throw error;
        }

        throw new MergeAutomationError(
            'target_blob_unavailable',
            `Unable to stage ${sourceFullName}/${file.path}: ${errorMessage(error)}`,
            { sourceRepository: sourceFullName, path: file.path, upstreamStatus: error.response?.status },
            502
        );
    }
}

async function getTargetBaseTree({ axiosClient, headers, targetFullName, targetBranch }) {
    let refResponse;
    try {
        refResponse = await requestWithRetry(
            axiosClient,
            'get',
            `${githubRepoUrl(targetFullName)}/git/ref/heads/${encodeReference(targetBranch)}`,
            undefined,
            { headers }
        );
        const baseCommitSha = refResponse.data?.object?.sha;
        if (!baseCommitSha) {
            throw new MergeAutomationError('target_ref_missing_sha', 'Target branch did not return a commit SHA', { targetBranch }, 502);
        }

        const commitResponse = await requestWithRetry(
            axiosClient,
            'get',
            `${githubRepoUrl(targetFullName)}/git/commits/${encodeReference(baseCommitSha)}`,
            undefined,
            { headers }
        );
        const baseTreeSha = commitResponse.data?.tree?.sha;
        if (!baseTreeSha) {
            throw new MergeAutomationError('target_tree_missing_sha', 'Target branch commit did not return a tree SHA', { targetBranch }, 502);
        }

        return { baseCommitSha, baseTreeSha };
    } catch (error) {
        if (error instanceof MergeAutomationError) {
            throw error;
        }

        throw new MergeAutomationError(
            'target_branch_unavailable',
            `Unable to read target branch ${targetBranch}: ${errorMessage(error)}`,
            { targetRepository: targetFullName, targetBranch, upstreamStatus: error.response?.status },
            502
        );
    }
}

async function mergeRepositoriesIntoTarget({
    axiosClient,
    headers,
    sourceRepositories,
    targetFullName,
    targetBranch = 'main',
    targetPrivate = false,
    sourceMetadata
}) {
    const metadataByFullName = sourceMetadata || await preflightSourceRepositories({
        axiosClient,
        headers,
        sourceRepositories,
        targetPrivate
    });
    const { plans, totalFiles, totalBytes } = await createMergePlan({
        axiosClient,
        headers,
        sourceRepositories,
        metadataByFullName
    });
    const { baseCommitSha, baseTreeSha } = await getTargetBaseTree({
        axiosClient,
        headers,
        targetFullName,
        targetBranch
    });
    const treeEntries = [];
    const repositoryResults = [];
    let mergedFiles = 0;
    let mergedBytes = 0;

    for (const plan of plans) {
        const { sourceRepository, tree, repositoryResult } = plan;
        for (const file of tree.files) {
            const targetPath = `${sourceRepository.folder || sourceRepository.name}/${file.path}`;
            let targetSha = file.sha;
            let bytes = 0;

            try {
                if (file.type === 'blob') {
                    const copiedBlob = await copyBlobToTarget({
                        axiosClient,
                        headers,
                        targetFullName,
                        sourceFullName: sourceRepository.full_name,
                        file
                    });
                    targetSha = copiedBlob.sha;
                    bytes = copiedBlob.bytes;
                }

                treeEntries.push({
                    path: targetPath,
                    mode: file.mode || (file.type === 'commit' ? '160000' : '100644'),
                    type: file.type,
                    sha: targetSha
                });
                repositoryResult.mergedFiles += 1;
                repositoryResult.mergedBytes += bytes;
                mergedFiles += 1;
                mergedBytes += bytes;
            } catch (error) {
                const mergeError = error instanceof MergeAutomationError
                    ? error
                    : new MergeAutomationError('file_staging_failed', errorMessage(error), { path: file.path }, 502);
                repositoryResult.failedFiles.push({ path: file.path, code: mergeError.code, message: mergeError.message });
                mergeError.details = {
                    ...mergeError.details,
                    progress: { mergedFiles, mergedBytes },
                    sourceRepository: sourceRepository.full_name,
                    path: file.path
                };
                throw mergeError;
            }
        }

        repositoryResult.riskScore = computeRepositoryRiskScore(repositoryResult);
        repositoryResults.push(repositoryResult);
    }

    if (treeEntries.length !== totalFiles) {
        throw new MergeAutomationError(
            'tree_entry_count_mismatch',
            'The staged Git tree does not contain the expected number of source entries',
            { expected: totalFiles, actual: treeEntries.length },
            502
        );
    }

    if (mergedBytes !== totalBytes) {
        throw new MergeAutomationError(
            'staged_content_mismatch',
            'The staged blob bytes do not match the source tree metadata; refusing to publish an unverifiable merge',
            { expectedBytes: totalBytes, actualBytes: mergedBytes, progress: { mergedFiles, mergedBytes } },
            502
        );
    }

    try {
        const treeResponse = await requestWithRetry(
            axiosClient,
            'post',
            `${githubRepoUrl(targetFullName)}/git/trees`,
            { base_tree: baseTreeSha, tree: treeEntries },
            { headers }
        );
        const treeSha = treeResponse.data?.sha;
        if (!treeSha) {
            throw new MergeAutomationError('target_tree_missing_sha', 'GitHub did not return the staged tree SHA', {}, 502);
        }

        const commitResponse = await requestWithRetry(
            axiosClient,
            'post',
            `${githubRepoUrl(targetFullName)}/git/commits`,
            {
                message: 'CAROMAR: atomically merge selected repositories',
                tree: treeSha,
                parents: [baseCommitSha]
            },
            { headers }
        );
        const commitSha = commitResponse.data?.sha;
        if (!commitSha) {
            throw new MergeAutomationError('target_commit_missing_sha', 'GitHub did not return the merge commit SHA', {}, 502);
        }

        await requestWithRetry(
            axiosClient,
            'patch',
            `${githubRepoUrl(targetFullName)}/git/refs/heads/${encodeReference(targetBranch)}`,
            { sha: commitSha, force: false },
            { headers }
        );

        return {
            status: 'completed',
            atomic: true,
            targetBranch,
            commitSha,
            sourceHistoryPreserved: false,
            mergedFiles,
            mergedBytes,
            sourceRepositories: sourceRepositories.length,
            repositoryResults,
            insights: generateMergeInsights(repositoryResults),
            plannedFiles: totalFiles,
            plannedBytes: totalBytes
        };
    } catch (error) {
        if (error instanceof MergeAutomationError) {
            throw error;
        }

        throw new MergeAutomationError(
            'publication_failed',
            `Unable to publish the atomic merge commit: ${errorMessage(error)}`,
            {
                targetRepository: targetFullName,
                targetBranch,
                progress: { mergedFiles, mergedBytes },
                upstreamStatus: error.response?.status
            },
            502
        );
    }
}

module.exports = {
    MAX_FILE_SIZE_BYTES,
    MAX_FILES_PER_REPOSITORY,
    MAX_TOTAL_FILES,
    MAX_TOTAL_BYTES,
    MergeAutomationError,
    normalizeBase64Content,
    encodeContentPath,
    inferRepositoryCapabilities,
    computeRepositoryRiskScore,
    generateMergeInsights,
    getRepositoryMetadata,
    preflightSourceRepositories,
    getRepositoryTree,
    mergeRepositoriesIntoTarget
};
