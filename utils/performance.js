/**
 * Performance monitoring and metrics utilities
 * @module utils/performance
 */

/**
 * Track API endpoint performance
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.requests = [];
        this.maxStoredRequests = 1000; // Keep last 1000 requests
        this.slowestRequest = null; // Track slowest request incrementally
    }

    /**
     * Start tracking a request
     * @param {string} endpoint - API endpoint
     * @param {string} method - HTTP method
     * @returns {Function} - Function to call when request completes
     */
    startRequest(endpoint, method) {
        const startTime = Date.now();
        const requestId = `${Date.now()}-${Math.random()}`;

        return (statusCode, error = null) => {
            const duration = Date.now() - startTime;
            this.recordRequest({
                requestId,
                endpoint,
                method,
                statusCode,
                duration,
                timestamp: new Date().toISOString(),
                error: error ? error.message : null
            });
        };
    }

    /**
     * Record a completed request
     * @param {Object} request - Request data
     * @private
     */
    recordRequest(request) {
        this.requests.push(request);

        // Keep only last N requests to prevent memory issues
        if (this.requests.length > this.maxStoredRequests) {
            this.requests.shift();
        }

        // Track slowest request incrementally for efficiency
        if (!this.slowestRequest || request.duration > this.slowestRequest.duration) {
            this.slowestRequest = {
                endpoint: request.endpoint,
                duration: request.duration,
                timestamp: request.timestamp
            };
        }

        // Update endpoint metrics
        const key = `${request.method}:${request.endpoint}`;
        if (!this.metrics.has(key)) {
            this.metrics.set(key, {
                count: 0,
                totalDuration: 0,
                minDuration: Infinity,
                maxDuration: 0,
                errors: 0,
                statusCodes: {}
            });
        }

        const metric = this.metrics.get(key);
        metric.count++;
        metric.totalDuration += request.duration;
        metric.minDuration = Math.min(metric.minDuration, request.duration);
        metric.maxDuration = Math.max(metric.maxDuration, request.duration);

        if (request.error) {
            metric.errors++;
        }

        const status = request.statusCode.toString();
        metric.statusCodes[status] = (metric.statusCodes[status] || 0) + 1;
    }

    /**
     * Get metrics for a specific endpoint
     * @param {string} endpoint - API endpoint
     * @param {string} method - HTTP method
     * @returns {Object|null} - Endpoint metrics
     */
    getEndpointMetrics(endpoint, method) {
        const key = `${method}:${endpoint}`;
        const metric = this.metrics.get(key);

        if (!metric) {
            return null;
        }

        return {
            ...metric,
            avgDuration: metric.count > 0 ? metric.totalDuration / metric.count : 0,
            errorRate: metric.count > 0 ? (metric.errors / metric.count) * 100 : 0
        };
    }

    /**
     * Get all metrics
     * @returns {Object} - All performance metrics
     */
    getAllMetrics() {
        const result = {};

        for (const [key, metric] of this.metrics.entries()) {
            result[key] = {
                ...metric,
                avgDuration: metric.count > 0 ? metric.totalDuration / metric.count : 0,
                errorRate: metric.count > 0 ? (metric.errors / metric.count) * 100 : 0
            };
        }

        return result;
    }

    /**
     * Get recent requests
     * @param {number} limit - Number of requests to return
     * @returns {Array} - Recent requests
     */
    getRecentRequests(limit = 100) {
        return this.requests.slice(-limit);
    }

    /**
     * Get slow requests (above threshold)
     * @param {number} threshold - Duration threshold in ms
     * @param {number} limit - Number of requests to return
     * @returns {Array} - Slow requests
     */
    getSlowRequests(threshold = 1000, limit = 50) {
        return this.requests
            .filter(req => req.duration > threshold)
            .slice(-limit)
            .sort((a, b) => b.duration - a.duration);
    }

    /**
     * Get error requests
     * @param {number} limit - Number of requests to return
     * @returns {Array} - Requests with errors
     */
    getErrorRequests(limit = 50) {
        return this.requests
            .filter(req => req.error)
            .slice(-limit);
    }

    /**
     * Get summary statistics
     * @returns {Object} - Summary statistics
     */
    getSummary() {
        const totalRequests = this.requests.length;
        const totalErrors = this.requests.filter(r => r.error).length;

        // Calculate overall average duration
        const avgDuration = totalRequests > 0
            ? this.requests.reduce((sum, r) => sum + r.duration, 0) / totalRequests
            : 0;

        // Status code distribution
        const statusDistribution = {};
        for (const request of this.requests) {
            const status = request.statusCode.toString();
            statusDistribution[status] = (statusDistribution[status] || 0) + 1;
        }

        return {
            totalRequests,
            totalErrors,
            errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
            avgDuration: Math.round(avgDuration),
            slowestRequest: this.slowestRequest,
            statusDistribution,
            endpointCount: this.metrics.size
        };
    }

    /**
     * Clear all stored data
     * @returns {void}
     */
    clear() {
        this.metrics.clear();
        this.requests = [];
        this.slowestRequest = null;
    }

    /**
     * Get health status based on metrics
     * @returns {Object} - Health status
     */
    getHealthStatus() {
        const recentRequests = this.getRecentRequests(100);

        // Calculate recent error rate (last 100 requests)
        const recentErrors = recentRequests.filter(r => r.error).length;
        const recentErrorRate = recentRequests.length > 0
            ? (recentErrors / recentRequests.length) * 100
            : 0;

        // Calculate recent average duration
        const recentAvgDuration = recentRequests.length > 0
            ? recentRequests.reduce((sum, r) => sum + r.duration, 0) / recentRequests.length
            : 0;

        // Determine health status
        let status = 'healthy';
        const issues = [];

        if (recentErrorRate > 10) {
            status = 'degraded';
            issues.push(`High error rate: ${recentErrorRate.toFixed(1)}%`);
        }

        if (recentAvgDuration > 2000) {
            status = 'degraded';
            issues.push(`Slow response times: ${Math.round(recentAvgDuration)}ms avg`);
        }

        if (recentErrorRate > 25) {
            status = 'unhealthy';
        }

        return {
            status,
            issues,
            recentErrorRate: recentErrorRate.toFixed(2),
            recentAvgDuration: Math.round(recentAvgDuration),
            uptime: process.uptime()
        };
    }
}

module.exports = PerformanceMonitor;
