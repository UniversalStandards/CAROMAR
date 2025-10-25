/**
 * Analytics and statistics utilities for CAROMAR
 */

class RepositoryAnalytics {
    constructor(repositories) {
        this.repositories = repositories;
    }

    /**
     * Get total statistics across all repositories
     * @returns {object} - Statistics object
     */
    getTotalStats() {
        return {
            totalRepos: this.repositories.length,
            totalStars: this.repositories.reduce((sum, repo) => sum + repo.stargazers_count, 0),
            totalForks: this.repositories.reduce((sum, repo) => sum + repo.forks_count, 0),
            totalWatchers: this.repositories.reduce((sum, repo) => sum + repo.watchers_count, 0),
            totalSize: this.repositories.reduce((sum, repo) => sum + repo.size, 0),
            totalIssues: this.repositories.reduce((sum, repo) => sum + repo.open_issues_count, 0),
            privateRepos: this.repositories.filter(r => r.private).length,
            forkedRepos: this.repositories.filter(r => r.fork).length,
            archivedRepos: this.repositories.filter(r => r.archived).length
        };
    }

    /**
     * Get language distribution
     * @returns {object} - Language distribution with counts
     */
    getLanguageDistribution() {
        const languages = {};
        this.repositories.forEach(repo => {
            if (repo.language) {
                languages[repo.language] = (languages[repo.language] || 0) + 1;
            }
        });
        return Object.entries(languages)
            .sort((a, b) => b[1] - a[1])
            .reduce((obj, [lang, count]) => {
                obj[lang] = count;
                return obj;
            }, {});
    }

    /**
     * Get most popular repositories by stars
     * @param {number} limit - Number of repositories to return
     * @returns {Array} - Top repositories
     */
    getMostPopular(limit = 10) {
        return [...this.repositories]
            .sort((a, b) => b.stargazers_count - a.stargazers_count)
            .slice(0, limit);
    }

    /**
     * Get most recently updated repositories
     * @param {number} limit - Number of repositories to return
     * @returns {Array} - Recently updated repositories
     */
    getRecentlyUpdated(limit = 10) {
        return [...this.repositories]
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
            .slice(0, limit);
    }

    /**
     * Get repositories by creation date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Array} - Filtered repositories
     */
    getByDateRange(startDate, endDate) {
        return this.repositories.filter(repo => {
            const createdAt = new Date(repo.created_at);
            return createdAt >= startDate && createdAt <= endDate;
        });
    }

    /**
     * Get activity timeline (repositories created by month)
     * @returns {object} - Timeline data
     */
    getActivityTimeline() {
        const timeline = {};
        this.repositories.forEach(repo => {
            const date = new Date(repo.created_at);
            const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            timeline[monthYear] = (timeline[monthYear] || 0) + 1;
        });
        return timeline;
    }

    /**
     * Get average repository metrics
     * @returns {object} - Average metrics
     */
    getAverageMetrics() {
        const count = this.repositories.length;
        if (count === 0) return null;

        const stats = this.getTotalStats();
        return {
            avgStars: Math.round(stats.totalStars / count),
            avgForks: Math.round(stats.totalForks / count),
            avgWatchers: Math.round(stats.totalWatchers / count),
            avgSize: Math.round(stats.totalSize / count),
            avgIssues: Math.round(stats.totalIssues / count)
        };
    }

    /**
     * Get repositories with specific characteristics
     * @param {string} type - Type of filter
     * @returns {Array} - Filtered repositories
     */
    getSpecialRepos(type) {
        switch (type) {
        case 'trending':
            // Repos with high stars and recent activity
            return this.repositories
                .filter(r => r.stargazers_count > 10)
                .filter(r => {
                    const daysSinceUpdate = (new Date() - new Date(r.updated_at)) / (1000 * 60 * 60 * 24);
                    return daysSinceUpdate < 30;
                })
                .sort((a, b) => b.stargazers_count - a.stargazers_count);
        case 'abandoned':
            // Repos not updated in over a year
            return this.repositories.filter(r => {
                const daysSinceUpdate = (new Date() - new Date(r.updated_at)) / (1000 * 60 * 60 * 24);
                return daysSinceUpdate > 365;
            });
        case 'active':
            // Repos updated in the last week
            return this.repositories.filter(r => {
                const daysSinceUpdate = (new Date() - new Date(r.updated_at)) / (1000 * 60 * 60 * 24);
                return daysSinceUpdate < 7;
            });
        default:
            return this.repositories;
        }
    }

    /**
     * Generate a comprehensive report
     * @returns {object} - Comprehensive analytics report
     */
    generateReport() {
        return {
            overview: this.getTotalStats(),
            languages: this.getLanguageDistribution(),
            topRepositories: this.getMostPopular(5),
            recentActivity: this.getRecentlyUpdated(5),
            averages: this.getAverageMetrics(),
            timeline: this.getActivityTimeline(),
            trending: this.getSpecialRepos('trending').length,
            abandoned: this.getSpecialRepos('abandoned').length,
            active: this.getSpecialRepos('active').length
        };
    }
}

module.exports = RepositoryAnalytics;
