const fs = require('fs');
const path = require('path');

describe('Frontend merge response contract', () => {
    const frontend = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'enhanced-app.js'), 'utf8');

    it('renders the automated_merge response instead of the removed manual instructions contract', () => {
        expect(frontend).toContain('showMergeResult(result)');
        expect(frontend).toContain('result.automated_merge');
        expect(frontend).toContain('merge.commitSha');
        expect(frontend).not.toContain('merge_instructions');
        expect(frontend).not.toContain('aiInsights');
    });

    it('sends merge credentials through the Authorization header', () => {
        expect(frontend).toContain("'Authorization': `Bearer ${this.githubToken}`");
        expect(frontend).not.toMatch(/token:\s*this\.githubToken/);
    });

    it('provides a user-controlled token clearing path', () => {
        expect(frontend).toContain("document.getElementById('clear-token')");
        expect(frontend).toContain("localStorage.removeItem('github_token')");
        expect(frontend).toContain('clearToken()');
    });

    it('encodes repository names before direct GitHub availability checks', () => {
        expect(frontend).toContain('encodeURIComponent(repoName)');
    });

    it('applies the selected client-side sort after repository search', () => {
        expect(frontend).toContain('this.applyFilters();');
        expect(frontend).toContain('case \'stars\':');
        expect(frontend).toContain('case \'size\':');
    });

    it('escapes external repository data before rendering HTML', () => {
        expect(frontend).toContain('escapeHtml(repo.name)');
        expect(frontend).toContain('escapeHtml(repo.description || \'No description available\')');
        expect(frontend).toContain('escapeHtml(topic)');
        expect(frontend).toContain('escapeHtml(comparison.names.repo1)');
    });
});
