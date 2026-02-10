/**
 * Netlify Serverless Function Wrapper for CAROMAR
 * Handles Express app in serverless environment with proper path resolution
 */

const serverless = require('serverless-http');
const path = require('path');

// Set views path relative to project root for serverless context
// This ensures EJS templates are found correctly in Netlify Functions
process.env.VIEWS_PATH = path.join(__dirname, '..', 'views');

// Import the Express application
const app = require('../server.js');

// Export serverless handler
exports.handler = serverless(app, {
    binary: ['image/*', 'font/*', 'application/pdf']
});
