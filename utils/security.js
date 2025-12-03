/**
 * Security utilities for CAROMAR
 * Provides enhanced security features and validation
 * @module utils/security
 */

<<<<<<< HEAD
=======
/**
 * Check if a string contains potentially dangerous patterns
 * @param {string} input - String to check
 * @returns {boolean} - True if suspicious patterns detected
 */
>>>>>>> 28740d6 (Add comprehensive security module and enhanced test suite)
function containsSuspiciousPatterns(input) {
    if (typeof input !== 'string') {
        return false;
    }
<<<<<<< HEAD

=======
    
>>>>>>> 28740d6 (Add comprehensive security module and enhanced test suite)
    const dangerousPatterns = [
        /javascript:/i,
        /data:/i,
        /vbscript:/i,
<<<<<<< HEAD
        /on\w+\s*=/i,
=======
        /on\w+\s*=/i, // Event handlers like onclick=
>>>>>>> 28740d6 (Add comprehensive security module and enhanced test suite)
        /<iframe/i,
        /<object/i,
        /<embed/i,
        /eval\s*\(/i,
        /document\.cookie/i,
        /window\.location/i
    ];
<<<<<<< HEAD

    return dangerousPatterns.some(pattern => pattern.test(input));
}

=======
    
    return dangerousPatterns.some(pattern => pattern.test(input));
}

/**
 * Validate and sanitize URL parameters
 * @param {string} url - URL to validate
 * @returns {boolean} - True if URL is safe
 */
>>>>>>> 28740d6 (Add comprehensive security module and enhanced test suite)
function isValidURL(url) {
    if (!url || typeof url !== 'string') {
        return false;
    }
<<<<<<< HEAD

    try {
        const parsedURL = new URL(url);
=======
    
    try {
        const parsedURL = new URL(url);
        // Only allow https and http protocols
>>>>>>> 28740d6 (Add comprehensive security module and enhanced test suite)
        return ['http:', 'https:'].includes(parsedURL.protocol);
    } catch {
        return false;
    }
}

<<<<<<< HEAD
class RateLimiter {
    constructor() {
        this.requests = new Map();
        this.windowMs = 60 * 1000;
        this.maxRequests = 60;

        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000);

        this.cleanupInterval.unref();
    }

    checkLimit(identifier) {
        const now = Date.now();
        const userRequests = this.requests.get(identifier) || [];

        const recentRequests = userRequests.filter(
            timestamp => now - timestamp < this.windowMs
        );

        if (recentRequests.length >= this.maxRequests) {
            return false;
        }

=======
/**
 * Rate limit check per user/token
 * Simple in-memory rate limiter (use Redis in production)
 */
class RateLimiter {
    constructor() {
        this.requests = new Map();
        this.windowMs = 60 * 1000; // 1 minute
        this.maxRequests = 60; // 60 requests per minute per token
        
        // Clean up old entries every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000);
        
        // Allow cleanup interval to not block process exit
        if (this.cleanupInterval.unref) {
            this.cleanupInterval.unref();
        }
    }
    
    /**
     * Check if request should be allowed
     * @param {string} identifier - Unique identifier (token hash, IP, etc.)
     * @returns {boolean} - True if request is allowed
     */
    checkLimit(identifier) {
        const now = Date.now();
        const userRequests = this.requests.get(identifier) || [];
        
        // Filter out old requests
        const recentRequests = userRequests.filter(
            timestamp => now - timestamp < this.windowMs
        );
        
        if (recentRequests.length >= this.maxRequests) {
            return false;
        }
        
>>>>>>> 28740d6 (Add comprehensive security module and enhanced test suite)
        recentRequests.push(now);
        this.requests.set(identifier, recentRequests);
        return true;
    }
<<<<<<< HEAD

=======
    
    /**
     * Clean up expired entries
     * @private
     */
>>>>>>> 28740d6 (Add comprehensive security module and enhanced test suite)
    cleanup() {
        const now = Date.now();
        for (const [identifier, timestamps] of this.requests.entries()) {
            const recent = timestamps.filter(
                timestamp => now - timestamp < this.windowMs
            );
            if (recent.length === 0) {
                this.requests.delete(identifier);
            } else {
                this.requests.set(identifier, recent);
            }
        }
    }
<<<<<<< HEAD

=======
    
    /**
     * Get remaining requests for identifier
     * @param {string} identifier - Unique identifier
     * @returns {number} - Remaining requests in current window
     */
>>>>>>> 28740d6 (Add comprehensive security module and enhanced test suite)
    getRemaining(identifier) {
        const now = Date.now();
        const userRequests = this.requests.get(identifier) || [];
        const recentRequests = userRequests.filter(
            timestamp => now - timestamp < this.windowMs
        );
        return Math.max(0, this.maxRequests - recentRequests.length);
    }
}

<<<<<<< HEAD
function simpleHash(input) {
    if (!input || input.length === 0) return '0';

    const crypto = require('crypto');
    return crypto.createHash('sha256')
        .update(input)
        .digest('hex')
        .substring(0, 16);
}

function isAllowedOrigin(origin, allowedOrigins = []) {
    if (!origin) return true;

=======
/**
 * Hash a string for privacy (simple hash for rate limiting)
 * @param {string} input - String to hash
 * @returns {string} - Hashed string
 */
function simpleHash(input) {
    let hash = 0;
    if (!input || input.length === 0) return hash.toString();
    
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
}

/**
 * Validate request origin for CSRF protection
 * @param {string} origin - Request origin header
 * @param {Array<string>} allowedOrigins - List of allowed origins
 * @returns {boolean} - True if origin is allowed
 */
function isAllowedOrigin(origin, allowedOrigins = []) {
    if (!origin) return true; // Allow same-origin requests
    
    // Check if origin is in allowed list
>>>>>>> 28740d6 (Add comprehensive security module and enhanced test suite)
    return allowedOrigins.some(allowed => {
        if (allowed === '*') return true;
        if (allowed.endsWith('*')) {
            const prefix = allowed.slice(0, -1);
            return origin.startsWith(prefix);
        }
        return origin === allowed;
    });
}

<<<<<<< HEAD
function sanitizeObject(obj) {
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }

    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    const sanitized = {};

=======
/**
 * Sanitize object to prevent prototype pollution
 * @param {Object} obj - Object to sanitize
 * @returns {Object} - Sanitized object
 */
function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }
    
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    const sanitized = {};
    
>>>>>>> 28740d6 (Add comprehensive security module and enhanced test suite)
    for (const [key, value] of Object.entries(obj)) {
        if (!dangerousKeys.includes(key)) {
            if (typeof value === 'object' && value !== null) {
                sanitized[key] = sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }
    }
<<<<<<< HEAD

    return sanitized;
}

function isAllowedContentType(contentType, allowed = ['application/json']) {
    if (!contentType) return false;

=======
    
    return sanitized;
}

/**
 * Validate Content-Type header
 * @param {string} contentType - Content-Type header value
 * @param {Array<string>} allowed - Allowed content types
 * @returns {boolean} - True if content type is allowed
 */
function isAllowedContentType(contentType, allowed = ['application/json']) {
    if (!contentType) return false;
    
    // Extract base content type (remove charset, etc.)
>>>>>>> 28740d6 (Add comprehensive security module and enhanced test suite)
    const baseType = contentType.split(';')[0].trim().toLowerCase();
    return allowed.some(type => baseType === type.toLowerCase());
}

module.exports = {
    containsSuspiciousPatterns,
    isValidURL,
    RateLimiter,
    simpleHash,
    isAllowedOrigin,
    sanitizeObject,
    isAllowedContentType
};
