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
});
