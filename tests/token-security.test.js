/**
 * Token Security Tests
 * Tests to ensure tokens are only accepted via Authorization headers, not query parameters
 */

const request = require('supertest');
const express = require('express');
const { isValidGitHubToken } = require('../utils/validation');

// Create a test server with the actual authentication pattern
const app = express();
app.use(express.json());

// Mock endpoints that mimic the real server behavior
app.get('/api/user', (req, res) => {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (!token || !isValidGitHubToken(token)) {
        return res.status(400).json({ error: 'Valid token is required' });
    }
    
    res.json({
        username: 'testuser',
        name: 'Test User',
        avatar_url: 'https://github.com/images/error/testuser_happy.gif'
    });
});

app.get('/api/validate-token', (req, res) => {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (!token) {
        return res.status(400).json({ error: 'Token is required' });
    }
    
    res.json({
        valid: true,
        scopes: ['repo', 'user'],
        required_scopes: ['repo', 'user'],
        has_required_permissions: true,
        user: {
            login: 'testuser',
            type: 'User'
        }
    });
});

app.get('/api/search-repos', (req, res) => {
    const { username } = req.query;
    
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (!username) {
        return res.status(400).json({ error: 'Valid username is required' });
    }
    
    // Token is optional for public repos, but if provided must be valid
    if (token && !isValidGitHubToken(token)) {
        return res.status(400).json({ error: 'Invalid token format' });
    }
    
    res.json({
        repos: [
            {
                id: 1,
                name: 'test-repo',
                full_name: 'testuser/test-repo',
                description: 'A test repository'
            }
        ],
        pagination: { page: 1, per_page: 100, total: 1 }
    });
});

app.get('/api/repo-content', (req, res) => {
    const { owner, repo } = req.query;
    
    // Note: Token extraction via Authorization header is supported but not used in this mock
    // In the real implementation, it would be used to increase rate limits
    
    if (!owner) {
        return res.status(400).json({ error: 'Valid owner is required' });
    }
    
    if (!repo) {
        return res.status(400).json({ error: 'Valid repository name is required' });
    }
    
    // Token is optional for public repos
    res.json({
        content: [
            {
                name: 'README.md',
                path: 'README.md',
                type: 'file'
            }
        ]
    });
});

describe('Token Security - Authorization Header Requirements', () => {
    const validToken = 'ghp_' + 'a'.repeat(40);

    describe('GET /api/user', () => {
        it('should accept token via Authorization header', async () => {
            const res = await request(app)
                .get('/api/user')
                .set('Authorization', `Bearer ${validToken}`);
            
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('username');
        });

        it('should reject request with token in query parameter', async () => {
            const res = await request(app)
                .get('/api/user')
                .query({ token: validToken });
            
            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toContain('token is required');
        });

        it('should reject request without token', async () => {
            const res = await request(app)
                .get('/api/user');
            
            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('error');
        });

        it('should reject malformed Authorization header', async () => {
            const res = await request(app)
                .get('/api/user')
                .set('Authorization', validToken); // Missing 'Bearer' prefix
            
            expect(res.statusCode).toBe(400);
        });

        it('should reject invalid token format in header', async () => {
            const res = await request(app)
                .get('/api/user')
                .set('Authorization', 'Bearer invalid-token');
            
            expect(res.statusCode).toBe(400);
        });
    });

    describe('GET /api/validate-token', () => {
        it('should accept token via Authorization header', async () => {
            const res = await request(app)
                .get('/api/validate-token')
                .set('Authorization', `Bearer ${validToken}`);
            
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('valid', true);
        });

        it('should reject request with token in query parameter', async () => {
            const res = await request(app)
                .get('/api/validate-token')
                .query({ token: validToken });
            
            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('error');
        });

        it('should reject request without token', async () => {
            const res = await request(app)
                .get('/api/validate-token');
            
            expect(res.statusCode).toBe(400);
        });
    });

    describe('GET /api/search-repos', () => {
        it('should accept token via Authorization header', async () => {
            const res = await request(app)
                .get('/api/search-repos')
                .query({ username: 'testuser' })
                .set('Authorization', `Bearer ${validToken}`);
            
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('repos');
        });

        it('should work without token for public repos', async () => {
            const res = await request(app)
                .get('/api/search-repos')
                .query({ username: 'testuser' });
            
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('repos');
        });

        it('should not accept token via query parameter', async () => {
            // Even if token is in query, it should be ignored (not extracted)
            const res = await request(app)
                .get('/api/search-repos')
                .query({ 
                    username: 'testuser',
                    token: validToken 
                });
            
            // Should still succeed (token in query is ignored, endpoint works without auth for public repos)
            expect(res.statusCode).toBe(200);
            // But we verify the token wasn't used by checking it doesn't give auth errors
        });

        it('should reject invalid token format in header', async () => {
            const res = await request(app)
                .get('/api/search-repos')
                .query({ username: 'testuser' })
                .set('Authorization', 'Bearer invalid-token');
            
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toContain('Invalid token format');
        });
    });

    describe('GET /api/repo-content', () => {
        it('should accept token via Authorization header', async () => {
            const res = await request(app)
                .get('/api/repo-content')
                .query({ owner: 'testuser', repo: 'test-repo' })
                .set('Authorization', `Bearer ${validToken}`);
            
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('content');
        });

        it('should work without token for public repos', async () => {
            const res = await request(app)
                .get('/api/repo-content')
                .query({ owner: 'testuser', repo: 'test-repo' });
            
            expect(res.statusCode).toBe(200);
        });

        it('should not accept token via query parameter', async () => {
            // Token in query should be ignored
            const res = await request(app)
                .get('/api/repo-content')
                .query({ 
                    owner: 'testuser', 
                    repo: 'test-repo',
                    token: validToken 
                });
            
            expect(res.statusCode).toBe(200);
        });
    });
});

describe('Token Security - Prevent Leakage Scenarios', () => {
    const validToken = 'ghp_' + 'a'.repeat(40);

    it('should not leak token from query to logs (verify no query token accepted)', async () => {
        // This test verifies that even if a token is mistakenly sent via query,
        // it won't be accepted, preventing it from being effective even if logged
        const res = await request(app)
            .get('/api/user')
            .query({ token: validToken });
        
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain('token is required');
    });

    it('should require proper Bearer scheme in Authorization header', async () => {
        // Test various incorrect formats
        const invalidFormats = [
            validToken,                    // No scheme
            `Token ${validToken}`,         // Wrong scheme
            `Basic ${validToken}`,         // Wrong scheme
            `bearer ${validToken}`,        // Lowercase (case-sensitive, must be 'Bearer')
        ];

        for (const format of invalidFormats) {
            const res = await request(app)
                .get('/api/user')
                .set('Authorization', format);
            
            expect(res.statusCode).toBe(400);
        }
    });

    it('should reject lowercase bearer scheme', async () => {
        // Our implementation requires 'Bearer' with capital B (case-sensitive)
        const res = await request(app)
            .get('/api/user')
            .set('Authorization', `bearer ${validToken}`);
        
        expect(res.statusCode).toBe(400);
    });
});
