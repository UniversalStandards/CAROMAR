const request = require('supertest');
const app = require('../server');

describe('Production application contract', () => {
    it('renders the application shell from the production Express app', async () => {
        const response = await request(app).get('/');

        expect(response.status).toBe(200);
        expect(response.type).toMatch(/^text\/html/);
        expect(response.text).toContain('CAROMAR');
        expect(response.text).toContain('/js/enhanced-app.js');
    });

    it('emits the required security headers', async () => {
        const response = await request(app).get('/api/health');

        expect(response.status).toBe(200);
        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['x-frame-options']).toBe('DENY');
        expect(response.headers['content-security-policy']).toBeDefined();
    });

    it('serves health and metrics from the production app', async () => {
        const health = await request(app).get('/api/health');
        const metrics = await request(app).get('/api/metrics');

        expect(health.body).toMatchObject({ status: 'healthy', version: expect.any(String) });
        expect(metrics.status).toBe(200);
        expect(metrics.body).toHaveProperty('summary');
        expect(metrics.body).toHaveProperty('endpoints');
    });

    it('executes analytics and comparison on supplied repository metadata', async () => {
        const repositories = [
            { name: 'alpha', stargazers_count: 10, forks_count: 2, watchers_count: 4, size: 100, language: 'JavaScript' },
            { name: 'beta', stargazers_count: 5, forks_count: 3, watchers_count: 2, size: 200, language: 'Python' }
        ];

        const analysis = await request(app).post('/api/analyze-repos').send({ repositories });
        const comparison = await request(app).post('/api/compare-repos').send({ repositories, mode: 'two' });

        expect(analysis.status).toBe(200);
        expect(analysis.body).toMatchObject({ success: true, analysis: expect.any(Object) });
        expect(comparison.status).toBe(200);
        expect(comparison.body).toMatchObject({ success: true, mode: 'two', comparison: expect.any(Object) });
    });

    it('rejects unsafe repository content paths before contacting GitHub', async () => {
        const response = await request(app)
            .get('/api/repo-content')
            .query({ owner: 'octocat', repo: 'Hello-World', path: '../secret' });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('repository path');
    });
});
