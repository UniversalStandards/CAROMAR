/**
 * Integration tests for CAROMAR server
 */

const request = require('supertest');
const express = require('express');
const { 
    isValidGitHubUsername, 
    isValidRepositoryName, 
    isValidGitHubToken,
    sanitizeString,
    validatePagination
} = require('../utils/validation');

// Create a minimal test server
const app = express();
app.use(express.json());

// Mock routes for server testing
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
    });
});

app.post('/api/create-merged-repo', (req, res) => {
    const { name, repositories, token } = req.body;
    
    if (!name || !isValidRepositoryName(name)) {
        return res.status(400).json({ error: 'Valid repository name is required' });
    }
    
    if (!repositories || !Array.isArray(repositories) || repositories.length === 0) {
        return res.status(400).json({ error: 'At least one repository is required' });
    }
    
    if (repositories.length > 50) {
        return res.status(400).json({ error: 'Maximum 50 repositories can be merged at once' });
    }
    
    if (!token || !isValidGitHubToken(token)) {
        return res.status(400).json({ error: 'Valid token is required' });
    }
    
    res.json({
        success: true,
        repository: {
            name: sanitizeString(name),
            full_name: `testuser/${sanitizeString(name)}`,
            html_url: `https://github.com/testuser/${sanitizeString(name)}`,
            clone_url: `https://github.com/testuser/${sanitizeString(name)}.git`
        },
        message: 'Repository created successfully'
    });
});

describe('Server Health and Validation', () => {
    describe('GET /api/health', () => {
        it('should return health status', async () => {
            const res = await request(app)
                .get('/api/health');
            
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('status', 'healthy');
            expect(res.body).toHaveProperty('uptime');
            expect(res.body).toHaveProperty('version');
        });
    });
});

describe('Repository Merge Operations', () => {
    describe('POST /api/create-merged-repo', () => {
        const validToken = 'ghp_' + 'a'.repeat(40);
        const validRepos = [
            {
                name: 'repo1',
                full_name: 'user/repo1',
                clone_url: 'https://github.com/user/repo1.git'
            },
            {
                name: 'repo2',
                full_name: 'user/repo2',
                clone_url: 'https://github.com/user/repo2.git'
            }
        ];

        it('should create merged repository with valid input', async () => {
            const res = await request(app)
                .post('/api/create-merged-repo')
                .send({
                    name: 'merged-repo',
                    repositories: validRepos,
                    token: validToken
                });
            
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('success', true);
            expect(res.body.repository).toHaveProperty('name', 'merged-repo');
        });

        it('should reject invalid repository name', async () => {
            const res = await request(app)
                .post('/api/create-merged-repo')
                .send({
                    name: '',
                    repositories: validRepos,
                    token: validToken
                });
            
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toContain('repository name');
        });

        it('should reject empty repository array', async () => {
            const res = await request(app)
                .post('/api/create-merged-repo')
                .send({
                    name: 'merged-repo',
                    repositories: [],
                    token: validToken
                });
            
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toContain('At least one repository');
        });

        it('should reject too many repositories', async () => {
            const tooManyRepos = Array(51).fill({
                name: 'repo',
                full_name: 'user/repo',
                clone_url: 'https://github.com/user/repo.git'
            });

            const res = await request(app)
                .post('/api/create-merged-repo')
                .send({
                    name: 'merged-repo',
                    repositories: tooManyRepos,
                    token: validToken
                });
            
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toContain('Maximum 50');
        });

        it('should reject invalid token', async () => {
            const res = await request(app)
                .post('/api/create-merged-repo')
                .send({
                    name: 'merged-repo',
                    repositories: validRepos,
                    token: 'invalid-token'
                });
            
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toContain('Valid token');
        });
    });
});

describe('Input Validation Edge Cases', () => {
    describe('sanitizeString', () => {
        it('should handle very long strings', () => {
            const longString = 'a'.repeat(2000);
            const result = sanitizeString(longString);
            expect(result.length).toBeLessThanOrEqual(1000);
        });

        it('should handle strings with special characters', () => {
            const special = '<script>alert("xss")</script>';
            const result = sanitizeString(special);
            expect(result).not.toContain('<');
            expect(result).not.toContain('>');
        });
    });

    describe('validatePagination', () => {
        it('should handle negative page numbers', () => {
            const result = validatePagination(-5, 10);
            expect(result.page).toBe(1);
        });

        it('should handle string inputs', () => {
            const result = validatePagination('abc', 'xyz');
            expect(result.page).toBe(1);
            expect(result.perPage).toBeGreaterThan(0);
        });

        it('should enforce maximum perPage limit', () => {
            const result = validatePagination(1, 500);
            expect(result.perPage).toBeLessThanOrEqual(100);
        });
    });
});

describe('GitHub Username Validation', () => {
    it('should accept valid usernames', () => {
        expect(isValidGitHubUsername('github')).toBe(true);
        expect(isValidGitHubUsername('my-user')).toBe(true);
        expect(isValidGitHubUsername('user123')).toBe(true);
        expect(isValidGitHubUsername('a')).toBe(true);
    });

    it('should reject invalid usernames', () => {
        expect(isValidGitHubUsername('-start')).toBe(false);
        expect(isValidGitHubUsername('end-')).toBe(false);
        expect(isValidGitHubUsername('')).toBe(false);
        expect(isValidGitHubUsername('a'.repeat(40))).toBe(false);
        expect(isValidGitHubUsername('user@name')).toBe(false);
    });
});

describe('Repository Name Validation', () => {
    it('should accept valid repository names', () => {
        expect(isValidRepositoryName('repo')).toBe(true);
        expect(isValidRepositoryName('my-repo')).toBe(true);
        expect(isValidRepositoryName('repo_name')).toBe(true);
        expect(isValidRepositoryName('repo.name')).toBe(true);
    });

    it('should reject invalid repository names', () => {
        expect(isValidRepositoryName('')).toBe(false);
        expect(isValidRepositoryName('a'.repeat(101))).toBe(false);
        expect(isValidRepositoryName('repo/name')).toBe(false);
        expect(isValidRepositoryName('repo name')).toBe(false);
    });
});

module.exports = app;
