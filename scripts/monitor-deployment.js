#!/usr/bin/env node

/**
 * CAROMAR Deployment Health Monitor
 * Monitors the health and performance of deployed CAROMAR instance
 * Run with: node scripts/monitor-deployment.js <site-url>
 */

const https = require('https');
const http = require('http');

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// Get site URL from command line argument
const siteUrl = process.argv[2];

if (!siteUrl) {
    console.error(`${colors.red}Error: Site URL is required${colors.reset}`);
    console.log(`Usage: node scripts/monitor-deployment.js <site-url>`);
    console.log(`Example: node scripts/monitor-deployment.js https://caromar.netlify.app`);
    process.exit(1);
}

// Parse URL
let parsedUrl;
try {
    parsedUrl = new URL(siteUrl);
} catch (error) {
    console.error(`${colors.red}Error: Invalid URL${colors.reset}`);
    process.exit(1);
}

// Select appropriate protocol
const client = parsedUrl.protocol === 'https:' ? https : http;

/**
 * Make HTTP request
 */
function makeRequest(path) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: path,
            method: 'GET',
            headers: {
                'User-Agent': 'CAROMAR-Monitor/1.0'
            }
        };
        
        const req = client.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                const duration = Date.now() - startTime;
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: data,
                    duration: duration
                });
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.end();
    });
}

/**
 * Check health endpoint
 */
async function checkHealth() {
    console.log(`${colors.cyan}Checking health endpoint...${colors.reset}`);
    
    try {
        const response = await makeRequest('/api/health');
        
        if (response.statusCode === 200) {
            const health = JSON.parse(response.data);
            console.log(`${colors.green}✓ Health check passed${colors.reset}`);
            console.log(`  Status: ${health.status}`);
            console.log(`  Environment: ${health.environment || 'unknown'}`);
            console.log(`  Version: ${health.version || 'unknown'}`);
            console.log(`  Uptime: ${health.uptime ? Math.floor(health.uptime) + 's' : 'N/A'}`);
            console.log(`  Response time: ${response.duration}ms`);
            return true;
        } else {
            console.log(`${colors.red}✗ Health check failed${colors.reset}`);
            console.log(`  Status code: ${response.statusCode}`);
            return false;
        }
    } catch (error) {
        console.log(`${colors.red}✗ Health check failed${colors.reset}`);
        console.log(`  Error: ${error.message}`);
        return false;
    }
}

/**
 * Check main page
 */
async function checkMainPage() {
    console.log(`\n${colors.cyan}Checking main page...${colors.reset}`);
    
    try {
        const response = await makeRequest('/');
        
        if (response.statusCode === 200) {
            console.log(`${colors.green}✓ Main page accessible${colors.reset}`);
            console.log(`  Response time: ${response.duration}ms`);
            console.log(`  Content length: ${response.data.length} bytes`);
            
            // Check for key elements
            const hasTitle = response.data.includes('CAROMAR');
            const hasApp = response.data.includes('app') || response.data.includes('enhanced-app');
            
            if (hasTitle && hasApp) {
                console.log(`${colors.green}  ✓ Page content validated${colors.reset}`);
            } else {
                console.log(`${colors.yellow}  ⚠ Page content may be incomplete${colors.reset}`);
            }
            
            return true;
        } else {
            console.log(`${colors.red}✗ Main page check failed${colors.reset}`);
            console.log(`  Status code: ${response.statusCode}`);
            return false;
        }
    } catch (error) {
        console.log(`${colors.red}✗ Main page check failed${colors.reset}`);
        console.log(`  Error: ${error.message}`);
        return false;
    }
}

/**
 * Check static assets
 */
async function checkStaticAssets() {
    console.log(`\n${colors.cyan}Checking static assets...${colors.reset}`);
    
    const assets = [
        '/css/style.css',
        '/js/enhanced-app.js',
        '/robots.txt',
        '/sitemap.xml'
    ];
    
    let allPassed = true;
    
    for (const asset of assets) {
        try {
            const response = await makeRequest(asset);
            
            if (response.statusCode === 200) {
                console.log(`${colors.green}  ✓ ${asset}${colors.reset} (${response.duration}ms)`);
            } else {
                console.log(`${colors.yellow}  ⚠ ${asset}${colors.reset} (Status: ${response.statusCode})`);
                allPassed = false;
            }
        } catch (error) {
            console.log(`${colors.red}  ✗ ${asset}${colors.reset} (${error.message})`);
            allPassed = false;
        }
    }
    
    return allPassed;
}

/**
 * Check response headers
 */
async function checkSecurityHeaders() {
    console.log(`\n${colors.cyan}Checking security headers...${colors.reset}`);
    
    try {
        const response = await makeRequest('/');
        
        const securityHeaders = {
            'x-frame-options': 'X-Frame-Options',
            'x-content-type-options': 'X-Content-Type-Options',
            'x-xss-protection': 'X-XSS-Protection',
            'referrer-policy': 'Referrer-Policy'
        };
        
        let allPresent = true;
        
        for (const [header, displayName] of Object.entries(securityHeaders)) {
            if (response.headers[header]) {
                console.log(`${colors.green}  ✓ ${displayName}${colors.reset}: ${response.headers[header]}`);
            } else {
                console.log(`${colors.yellow}  ⚠ ${displayName}${colors.reset}: Not set`);
                allPresent = false;
            }
        }
        
        return allPresent;
    } catch (error) {
        console.log(`${colors.red}  ✗ Failed to check headers${colors.reset}`);
        return false;
    }
}

/**
 * Performance test
 */
async function performanceTest() {
    console.log(`\n${colors.cyan}Running performance test (10 requests)...${colors.reset}`);
    
    const iterations = 10;
    const durations = [];
    
    for (let i = 0; i < iterations; i++) {
        try {
            const response = await makeRequest('/api/health');
            durations.push(response.duration);
            process.stdout.write('.');
        } catch (error) {
            process.stdout.write('x');
        }
    }
    
    console.log(''); // New line
    
    if (durations.length > 0) {
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        const min = Math.min(...durations);
        const max = Math.max(...durations);
        
        console.log(`${colors.green}Performance results:${colors.reset}`);
        console.log(`  Average: ${Math.round(avg)}ms`);
        console.log(`  Min: ${min}ms`);
        console.log(`  Max: ${max}ms`);
        console.log(`  Success rate: ${durations.length}/${iterations} (${Math.round(durations.length/iterations*100)}%)`);
        
        return true;
    } else {
        console.log(`${colors.red}All requests failed${colors.reset}`);
        return false;
    }
}

/**
 * Main monitoring function
 */
async function runMonitoring() {
    console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.blue}CAROMAR Deployment Health Monitor${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
    console.log(`\nMonitoring: ${colors.cyan}${siteUrl}${colors.reset}`);
    console.log(`Time: ${new Date().toISOString()}\n`);
    
    const results = {
        health: false,
        mainPage: false,
        assets: false,
        headers: false,
        performance: false
    };
    
    // Run all checks
    results.health = await checkHealth();
    results.mainPage = await checkMainPage();
    results.assets = await checkStaticAssets();
    results.headers = await checkSecurityHeaders();
    results.performance = await performanceTest();
    
    // Summary
    console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.blue}Summary${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
    
    const passed = Object.values(results).filter(r => r === true).length;
    const total = Object.keys(results).length;
    
    console.log(`Health Check:      ${results.health ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`);
    console.log(`Main Page:         ${results.mainPage ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`);
    console.log(`Static Assets:     ${results.assets ? colors.green + '✓ PASS' : colors.yellow + '⚠ WARN'}${colors.reset}`);
    console.log(`Security Headers:  ${results.headers ? colors.green + '✓ PASS' : colors.yellow + '⚠ WARN'}${colors.reset}`);
    console.log(`Performance:       ${results.performance ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`);
    
    console.log(`\n${passed === total ? colors.green : colors.yellow}Overall: ${passed}/${total} checks passed${colors.reset}\n`);
    
    // Exit code
    if (results.health && results.mainPage && results.performance) {
        console.log(`${colors.green}✓ Deployment is healthy and operational${colors.reset}\n`);
        process.exit(0);
    } else {
        console.log(`${colors.red}✗ Deployment has issues that need attention${colors.reset}\n`);
        process.exit(1);
    }
}

// Run monitoring
runMonitoring().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
});
