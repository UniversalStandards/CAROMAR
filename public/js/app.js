/**
 * CAROMAR - Basic Frontend Implementation
 * 
 * Note: This is a simplified version of the frontend application.
 * The production version uses enhanced-app.js (EnhancedCaromarApp) 
 * which includes additional features like:
 * - Advanced filtering and sorting
 * - Repository analytics and comparison
 * - Import/Export functionality
 * - Auto-save and local storage
 * - Keyboard shortcuts
 * 
 * This file is maintained as a reference implementation showing
 * the core functionality in a simpler form.
 */

class CaromarApp {
    constructor() {
        this.githubToken = null;
        this.selectedRepos = new Set();
        this.repositories = [];
        this.currentUser = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadStoredToken();
    }

    bindEvents() {
        // Token validation
        document.getElementById('validate-token').addEventListener('click', () => {
            this.validateToken();
        });

        // Repository search
        document.getElementById('search-repos').addEventListener('click', () => {
            this.searchRepositories();
        });

        // Enter key support
        document.getElementById('github-token').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.validateToken();
        });

        document.getElementById('username-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchRepositories();
        });

        // Selection controls
        document.getElementById('select-all').addEventListener('click', () => {
            this.selectAllRepos(true);
        });

        document.getElementById('deselect-all').addEventListener('click', () => {
            this.selectAllRepos(false);
        });

        // Operation mode change
        document.querySelectorAll('input[name="operation"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.handleOperationChange();
            });
        });

        // Execute action
        document.getElementById('execute-action').addEventListener('click', () => {
            this.executeAction();
        });
    }

    loadStoredToken() {
        const storedToken = localStorage.getItem('github_token');
        if (storedToken) {
            document.getElementById('github-token').value = storedToken;
            this.validateToken();
        }
    }

    async validateToken() {
        const tokenInput = document.getElementById('github-token');
        const validateBtn = document.getElementById('validate-token');
        const token = tokenInput.value.trim();

        if (!token) {
            this.showError('Please enter a GitHub Personal Access Token');
            return;
        }

        validateBtn.innerHTML = '<div class="loading"></div> Validating...';
        validateBtn.disabled = true;

        try {
            const response = await fetch(`/api/user?token=${encodeURIComponent(token)}`);
            const data = await response.json();

            if (response.ok) {
                this.githubToken = token;
                this.currentUser = data;
                localStorage.setItem('github_token', token);
                
                // Show user info
                document.getElementById('user-avatar').src = data.avatar_url;
                document.getElementById('user-name').textContent = data.name || data.username;
                document.getElementById('user-username').textContent = `@${data.username}`;
                
                document.getElementById('user-info').style.display = 'flex';
                document.getElementById('repo-section').style.display = 'block';
                
                // Pre-fill username with current user
                document.getElementById('username-input').value = data.username;
                
                this.showSuccess('Token validated successfully!');
            } else {
                throw new Error(data.error || 'Invalid token');
            }
        } catch (error) {
            this.showError(`Token validation failed: ${error.message}`);
        } finally {
            validateBtn.innerHTML = '<i class="fas fa-check"></i> Validate Token';
            validateBtn.disabled = false;
        }
    }

    async searchRepositories() {
        const usernameInput = document.getElementById('username-input');
        const searchBtn = document.getElementById('search-repos');
        const username = usernameInput.value.trim();

        if (!username) {
            this.showError('Please enter a GitHub username');
            return;
        }

        if (!this.githubToken) {
            this.showError('Please validate your GitHub token first');
            return;
        }

        searchBtn.innerHTML = '<div class="loading"></div> Searching...';
        searchBtn.disabled = true;

        try {
            const response = await fetch(`/api/search-repos?username=${encodeURIComponent(username)}&token=${encodeURIComponent(this.githubToken)}`);
            const data = await response.json();

            if (response.ok) {
                this.repositories = data.repos;
                this.renderRepositories();
                document.getElementById('repos-list-section').style.display = 'block';
                this.showSuccess(`Found ${data.repos.length} repositories for ${username}`);
            } else {
                throw new Error(data.error || 'Failed to fetch repositories');
            }
        } catch (error) {
            this.showError(`Repository search failed: ${error.message}`);
        } finally {
            searchBtn.innerHTML = '<i class="fas fa-search"></i> Search Repositories';
            searchBtn.disabled = false;
        }
    }

    renderRepositories() {
        const container = document.getElementById('repos-list');
        container.innerHTML = '';

        this.repositories.forEach(repo => {
            const repoElement = this.createRepositoryElement(repo);
            container.appendChild(repoElement);
        });

        this.updateActionButton();
    }

    createRepositoryElement(repo) {
        const div = document.createElement('div');
        div.className = 'repo-item';
        div.dataset.repoId = repo.id;

        const languageDot = repo.language ? 
            `<div class="language-dot" style="background-color: ${this.getLanguageColor(repo.language)}"></div>` : 
            '';

        div.innerHTML = `
            <div class="repo-header">
                <h3 class="repo-name">${repo.name}</h3>
                <input type="checkbox" class="repo-checkbox" data-repo-id="${repo.id}">
            </div>
            <p class="repo-description">${repo.description || 'No description available'}</p>
            <div class="repo-meta">
                ${repo.language ? `
                    <span class="repo-language">
                        ${languageDot}
                        ${repo.language}
                    </span>
                ` : ''}
                ${repo.fork ? '<span><i class="fas fa-code-branch"></i> Fork</span>' : ''}
                <span><i class="fas fa-clock"></i> ${this.formatDate(repo.updated_at)}</span>
            </div>
        `;

        const checkbox = div.querySelector('.repo-checkbox');
        
        div.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox') {
                checkbox.checked = !checkbox.checked;
                this.handleRepoSelection(checkbox);
            }
        });

        checkbox.addEventListener('change', () => {
            this.handleRepoSelection(checkbox);
        });

        return div;
    }

    handleRepoSelection(checkbox) {
        const repoId = checkbox.dataset.repoId;
        const repoElement = checkbox.closest('.repo-item');

        if (checkbox.checked) {
            this.selectedRepos.add(repoId);
            repoElement.classList.add('selected');
        } else {
            this.selectedRepos.delete(repoId);
            repoElement.classList.remove('selected');
        }

        this.updateActionButton();
    }

    selectAllRepos(select) {
        const checkboxes = document.querySelectorAll('.repo-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = select;
            this.handleRepoSelection(checkbox);
        });
    }

    handleOperationChange() {
        const mergeMode = document.querySelector('input[name="operation"]:checked').value === 'merge';
        const mergeOptions = document.getElementById('merge-options');
        mergeOptions.style.display = mergeMode ? 'block' : 'none';

        // Update radio label styling
        document.querySelectorAll('.radio-group label').forEach(label => {
            label.classList.remove('selected');
            if (label.querySelector('input').checked) {
                label.classList.add('selected');
            }
        });

        this.updateActionButton();
    }

    updateActionButton() {
        const executeBtn = document.getElementById('execute-action');
        const selectedCount = this.selectedRepos.size;
        const operation = document.querySelector('input[name="operation"]:checked').value;

        executeBtn.disabled = selectedCount === 0;

        if (selectedCount > 0) {
            const action = operation === 'fork' ? 'Fork' : 'Merge';
            executeBtn.innerHTML = `<i class="fas fa-play"></i> ${action} ${selectedCount} Selected Repositor${selectedCount === 1 ? 'y' : 'ies'}`;
        } else {
            executeBtn.innerHTML = '<i class="fas fa-play"></i> Execute Selected Action';
        }
    }

    async executeAction() {
        const operation = document.querySelector('input[name="operation"]:checked').value;
        const selectedRepoIds = Array.from(this.selectedRepos);
        const selectedRepos = this.repositories.filter(repo => selectedRepoIds.includes(repo.id.toString()));

        if (operation === 'fork') {
            await this.forkRepositories(selectedRepos);
        } else {
            await this.mergeRepositories(selectedRepos);
        }
    }

    async forkRepositories(repos) {
        this.showProgressSection();
        const results = [];
        
        for (let i = 0; i < repos.length; i++) {
            const repo = repos[i];
            const progress = ((i + 1) / repos.length) * 100;
            
            this.updateProgress(progress, `Forking ${repo.name} (${i + 1}/${repos.length})`);
            
            try {
                const [owner, repoName] = repo.full_name.split('/');
                const response = await fetch('/api/fork-repo', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        owner,
                        repo: repoName,
                        token: this.githubToken
                    })
                });

                const result = await response.json();
                
                if (response.ok) {
                    results.push({
                        repo: repo.name,
                        success: true,
                        url: result.fork_url,
                        message: result.message
                    });
                } else {
                    results.push({
                        repo: repo.name,
                        success: false,
                        error: result.error
                    });
                }
            } catch (error) {
                results.push({
                    repo: repo.name,
                    success: false,
                    error: error.message
                });
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        this.updateProgress(100, 'Forking complete!');
        this.showResults(results);
    }

    async mergeRepositories(_repos) {
        const mergedRepoName = document.getElementById('merged-repo-name').value.trim();
        
        if (!mergedRepoName) {
            this.showError('Please enter a name for the merged repository');
            return;
        }

        this.showProgressSection();
        this.updateProgress(0, 'Preparing merge operation...');

        // Note: This is a simplified implementation
        // In a real-world scenario, you'd need to create the repository and clone/merge the repos
        const results = [{
            repo: mergedRepoName,
            success: false,
            error: 'Merge functionality requires additional server-side implementation with git operations'
        }];

        this.updateProgress(100, 'Merge preparation complete');
        this.showResults(results);
    }

    showProgressSection() {
        document.getElementById('progress-section').style.display = 'block';
        document.getElementById('execute-action').disabled = true;
    }

    updateProgress(percentage, text) {
        document.getElementById('progress-fill').style.width = `${percentage}%`;
        document.getElementById('progress-text').textContent = text;
    }

    showResults(results) {
        const resultsSection = document.getElementById('results-section');
        const resultsContent = document.getElementById('results-content');
        
        resultsContent.innerHTML = '';
        
        results.forEach(result => {
            const div = document.createElement('div');
            div.className = `result-item ${result.success ? '' : 'error'}`;
            
            if (result.success) {
                div.innerHTML = `
                    <strong>${result.repo}</strong> - Success
                    ${result.url ? `<br><a href="${result.url}" target="_blank" class="link">View Repository</a>` : ''}
                `;
            } else {
                div.innerHTML = `
                    <strong>${result.repo}</strong> - Error: ${result.error}
                `;
            }
            
            resultsContent.appendChild(div);
        });
        
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    getLanguageColor(language) {
        const colors = {
            'JavaScript': '#f7df1e',
            'Python': '#3776ab',
            'Java': '#ed8b00',
            'C++': '#00599c',
            'C': '#a8b9cc',
            'HTML': '#e34c26',
            'CSS': '#1572b6',
            'TypeScript': '#3178c6',
            'Go': '#00add8',
            'Rust': '#dea584',
            'PHP': '#777bb4',
            'Ruby': '#cc342d',
            'Swift': '#fa7343',
            'Kotlin': '#7f52ff',
            'Dart': '#0175c2'
        };
        return colors[language] || '#8c959f';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            max-width: 400px;
            background: ${type === 'success' ? '#1a7f37' : '#d73a49'};
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new CaromarApp();
});