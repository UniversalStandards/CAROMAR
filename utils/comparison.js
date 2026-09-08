/**
 * Repository comparison utilities
 */

class RepositoryComparison {
    /**
     * Compare two repositories
     * @param {object} repo1 - First repository
     * @param {object} repo2 - Second repository
     * @returns {object} - Comparison results
     */
    static compareTwo(repo1, repo2) {
        return {
            names: {
                repo1: repo1.name,
                repo2: repo2.name
            },
            metrics: {
                stars: {
                    repo1: repo1.stargazers_count,
                    repo2: repo2.stargazers_count,
                    difference: repo1.stargazers_count - repo2.stargazers_count,
                    winner: repo1.stargazers_count > repo2.stargazers_count ? repo1.name : 
                        repo2.stargazers_count > repo1.stargazers_count ? repo2.name : 'tie'
                },
                forks: {
                    repo1: repo1.forks_count,
                    repo2: repo2.forks_count,
                    difference: repo1.forks_count - repo2.forks_count,
                    winner: repo1.forks_count > repo2.forks_count ? repo1.name : 
                        repo2.forks_count > repo1.forks_count ? repo2.name : 'tie'
                },
                watchers: {
                    repo1: repo1.watchers_count,
                    repo2: repo2.watchers_count,
                    difference: repo1.watchers_count - repo2.watchers_count,
                    winner: repo1.watchers_count > repo2.watchers_count ? repo1.name : 
                        repo2.watchers_count > repo1.watchers_count ? repo2.name : 'tie'
                },
                size: {
                    repo1: repo1.size,
                    repo2: repo2.size,
                    difference: repo1.size - repo2.size,
                    larger: repo1.size > repo2.size ? repo1.name : repo2.name
                },
                issues: {
                    repo1: repo1.open_issues_count,
                    repo2: repo2.open_issues_count,
                    difference: repo1.open_issues_count - repo2.open_issues_count,
                    more: repo1.open_issues_count > repo2.open_issues_count ? repo1.name : repo2.name
                }
            },
            attributes: {
                languages: {
                    repo1: repo1.language || 'None',
                    repo2: repo2.language || 'None',
                    same: repo1.language === repo2.language
                },
                license: {
                    repo1: repo1.license?.name || 'None',
                    repo2: repo2.license?.name || 'None',
                    same: repo1.license?.name === repo2.license?.name
                },
                visibility: {
                    repo1: repo1.private ? 'Private' : 'Public',
                    repo2: repo2.private ? 'Private' : 'Public',
                    same: repo1.private === repo2.private
                },
                archived: {
                    repo1: repo1.archived,
                    repo2: repo2.archived,
                    same: repo1.archived === repo2.archived
                }
            },
            dates: {
                created: {
                    repo1: repo1.created_at,
                    repo2: repo2.created_at,
                    older: new Date(repo1.created_at) < new Date(repo2.created_at) ? repo1.name : repo2.name,
                    daysDifference: Math.floor(Math.abs((new Date(repo1.created_at) - new Date(repo2.created_at)) / (1000 * 60 * 60 * 24)))
                },
                updated: {
                    repo1: repo1.updated_at,
                    repo2: repo2.updated_at,
                    moreRecent: new Date(repo1.updated_at) > new Date(repo2.updated_at) ? repo1.name : repo2.name,
                    daysDifference: Math.floor(Math.abs((new Date(repo1.updated_at) - new Date(repo2.updated_at)) / (1000 * 60 * 60 * 24)))
                }
            },
            topics: {
                repo1: repo1.topics || [],
                repo2: repo2.topics || [],
                common: (repo1.topics || []).filter(topic => (repo2.topics || []).includes(topic)),
                unique_to_repo1: (repo1.topics || []).filter(topic => !(repo2.topics || []).includes(topic)),
                unique_to_repo2: (repo2.topics || []).filter(topic => !(repo1.topics || []).includes(topic))
            },
            similarity: this.calculateSimilarity(repo1, repo2)
        };
    }

    /**
     * Calculate similarity score between two repositories
     * @param {object} repo1 - First repository
     * @param {object} repo2 - Second repository
     * @returns {number} - Similarity score (0-100)
     */
    static calculateSimilarity(repo1, repo2) {
        let score = 0;
        let maxScore = 0;

        // Language similarity (20 points)
        maxScore += 20;
        if (repo1.language === repo2.language) {
            score += 20;
        }

        // License similarity (10 points)
        maxScore += 10;
        if (repo1.license?.name === repo2.license?.name) {
            score += 10;
        }

        // Topics similarity (30 points)
        maxScore += 30;
        const topics1 = repo1.topics || [];
        const topics2 = repo2.topics || [];
        const commonTopics = topics1.filter(topic => topics2.includes(topic));
        const totalTopics = new Set([...topics1, ...topics2]).size;
        if (totalTopics > 0) {
            score += (commonTopics.length / totalTopics) * 30;
        }

        // Size similarity (20 points)
        maxScore += 20;
        const sizeDiff = Math.abs(repo1.size - repo2.size);
        const avgSize = (repo1.size + repo2.size) / 2;
        if (avgSize > 10) { // Only calculate if average size is meaningful
            const sizeRatio = 1 - (sizeDiff / avgSize);
            score += Math.max(0, sizeRatio * 20);
        } else if (repo1.size === 0 && repo2.size === 0) {
            // Both empty repos are perfectly similar in size
            score += 20;
        }

        // Visibility similarity (10 points)
        maxScore += 10;
        if (repo1.private === repo2.private) {
            score += 10;
        }

        // Fork status similarity (10 points)
        maxScore += 10;
        if (repo1.fork === repo2.fork) {
            score += 10;
        }

        return Math.round((score / maxScore) * 100);
    }

    /**
     * Compare multiple repositories and find the best one
     * @param {Array} repositories - Array of repositories
     * @param {string} criteria - Comparison criteria
     * @returns {object} - Best repository and rankings
     */
    static findBest(repositories, criteria = 'stars') {
        const sortFunctions = {
            stars: (a, b) => b.stargazers_count - a.stargazers_count,
            forks: (a, b) => b.forks_count - a.forks_count,
            watchers: (a, b) => b.watchers_count - a.watchers_count,
            recent: (a, b) => new Date(b.updated_at) - new Date(a.updated_at),
            size: (a, b) => b.size - a.size,
            issues: (a, b) => a.open_issues_count - b.open_issues_count // fewer is better
        };

        const sortFn = sortFunctions[criteria] || sortFunctions.stars;
        const sorted = [...repositories].sort(sortFn);

        return {
            best: sorted[0],
            rankings: sorted.map((repo, index) => ({
                rank: index + 1,
                name: repo.name,
                value: this.getMetricValue(repo, criteria)
            })),
            criteria
        };
    }

    /**
     * Get metric value from repository
     * @param {object} repo - Repository object
     * @param {string} metric - Metric name
     * @returns {number|string} - Metric value
     */
    static getMetricValue(repo, metric) {
        const metrics = {
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            watchers: repo.watchers_count,
            recent: repo.updated_at,
            size: repo.size,
            issues: repo.open_issues_count
        };
        return metrics[metric] || 0;
    }

    /**
     * Generate a comparison matrix for multiple repositories
     * @param {Array} repositories - Array of repositories
     * @returns {object} - Comparison matrix
     */
    static compareMultiple(repositories) {
        const metrics = ['stargazers_count', 'forks_count', 'watchers_count', 'size', 'open_issues_count'];
        const matrix = {};

        metrics.forEach(metric => {
            matrix[metric] = repositories.map(repo => ({
                name: repo.name,
                value: repo[metric],
                rank: 0
            }));

            // Calculate ranks
            matrix[metric].sort((a, b) => b.value - a.value);
            matrix[metric].forEach((item, index) => {
                item.rank = index + 1;
            });
        });

        return matrix;
    }
}

module.exports = RepositoryComparison;
