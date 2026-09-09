/**
 * Security utilities for CAROMAR
 * Provides enhanced security features and validation
 * @module utils/security
 */

function containsSuspiciousPatterns(input) {
    if (typeof input !== 'string') {
        return false;
    }

    const dangerousPatterns = [
        /javascript:/i,
        /data:/i,
        /vbscript:/i,
        /on\w+\s*=/i,
        /<iframe/i,
        /<object/i,
        /<embed/i,
        /eval\s*\(/i,
        /document\.cookie/i,
        /window\.location/i
    ];

    return dangerousPatterns.some(pattern => pattern.test(input));
}

function isValidURL(url) {
    if (!url || typeof url !== 'string') {
        return false;
    }

    try {
        const parsedURL = new URL(url);
        return ['http:', 'https:'].includes(parsedURL.protocol);
    } catch {
        return false;
    }
}

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

        recentRequests.push(now);
        this.requests.set(identifier, recentRequests);
        return true;
    }

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

    getRemaining(identifier) {
        const now = Date.now();
        const userRequests = this.requests.get(identifier) || [];
        const recentRequests = userRequests.filter(
            timestamp => now - timestamp < this.windowMs
        );
        return Math.max(0, this.maxRequests - recentRequests.length);
    }
}

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

    return allowedOrigins.some(allowed => {
        if (allowed === '*') return true;
        if (allowed.endsWith('*')) {
            const prefix = allowed.slice(0, -1);
            return origin.startsWith(prefix);
        }
        return origin === allowed;
    });
}

function sanitizeObject(obj) {
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }

    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    const sanitized = {};

    for (const [key, value] of Object.entries(obj)) {
        if (!dangerousKeys.includes(key)) {
            if (typeof value === 'object' && value !== null) {
                sanitized[key] = sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }
    }

    return sanitized;
}

function isAllowedContentType(contentType, allowed = ['application/json']) {
    if (!contentType) return false;

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
