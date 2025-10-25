/**
 * Logger utility for CAROMAR
 */

const LOG_LEVELS = {
    ERROR: 'ERROR',
    WARN: 'WARN',
    INFO: 'INFO',
    DEBUG: 'DEBUG'
};

class Logger {
    constructor(context = 'CAROMAR') {
        this.context = context;
        this.logLevel = process.env.LOG_LEVEL || 'INFO';
    }

    /**
     * Format log message
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @param {object} meta - Additional metadata
     * @returns {string} - Formatted log message
     */
    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const metaString = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
        return `[${timestamp}] [${level}] [${this.context}] ${message} ${metaString}`;
    }

    /**
     * Log error message
     * @param {string} message - Error message
     * @param {Error|object} error - Error object or metadata
     */
    error(message, error = {}) {
        const meta = error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            code: error.code
        } : error;
        console.error(this.formatMessage(LOG_LEVELS.ERROR, message, meta));
    }

    /**
     * Log warning message
     * @param {string} message - Warning message
     * @param {object} meta - Additional metadata
     */
    warn(message, meta = {}) {
        console.warn(this.formatMessage(LOG_LEVELS.WARN, message, meta));
    }

    /**
     * Log info message
     * @param {string} message - Info message
     * @param {object} meta - Additional metadata
     */
    info(message, meta = {}) {
        console.log(this.formatMessage(LOG_LEVELS.INFO, message, meta));
    }

    /**
     * Log debug message
     * @param {string} message - Debug message
     * @param {object} meta - Additional metadata
     */
    debug(message, meta = {}) {
        if (this.logLevel === 'DEBUG') {
            console.log(this.formatMessage(LOG_LEVELS.DEBUG, message, meta));
        }
    }

    /**
     * Log API request
     * @param {object} req - Express request object
     */
    logRequest(req) {
        this.info('API Request', {
            method: req.method,
            path: req.path,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });
    }

    /**
     * Log API response
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     * @param {number} duration - Request duration in ms
     */
    logResponse(req, res, duration) {
        const level = res.statusCode >= 400 ? 'warn' : 'info';
        this[level]('API Response', {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`
        });
    }
}

module.exports = new Logger();
