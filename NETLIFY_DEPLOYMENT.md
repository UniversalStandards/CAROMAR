# CAROMAR Netlify Deployment Guide

[![Netlify Status](https://api.netlify.com/api/v1/badges/YOUR-SITE-ID/deploy-status)](https://app.netlify.com/sites/YOUR-SITE-NAME/deploys)

## Quick Deploy to Netlify

Click the button below to deploy CAROMAR to Netlify with one click:

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/UniversalStandards/CAROMAR)

---

## Manual Deployment Instructions

### Prerequisites

- GitHub account
- Netlify account (free tier works perfectly)
- GitHub Personal Access Token (for GitHub API operations)

### Step 1: Fork or Clone Repository

```bash
git clone https://github.com/UniversalStandards/CAROMAR.git
cd CAROMAR
```

### Step 2: Connect to Netlify

#### Option A: Deploy via Netlify CLI

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify:**
   ```bash
   netlify login
   ```

3. **Initialize Netlify site:**
   ```bash
   netlify init
   ```

4. **Deploy:**
   ```bash
   netlify deploy --prod
   ```

#### Option B: Deploy via Netlify Web UI

1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Click "Add new site" → "Import an existing project"
3. Choose your Git provider (GitHub)
4. Select the CAROMAR repository
5. Configure build settings (pre-filled from netlify.toml):
   - **Build command:** `npm run validate`
   - **Publish directory:** `public`
   - **Functions directory:** `functions`
6. Click "Deploy site"

### Step 3: Configure Environment Variables

CAROMAR works without environment variables for basic functionality, but you can optionally configure:

Navigate to: **Site settings → Environment variables**

**Optional Variables:**
- `NODE_ENV` = `production` (automatically set by Netlify)
- `GITHUB_CLIENT_ID` = Your GitHub OAuth App Client ID (for future OAuth features)
- `GITHUB_CLIENT_SECRET` = Your GitHub OAuth App Secret (for future OAuth features)
- `SESSION_SECRET` = Random secure string (for future session features)

**Note:** Users will need to provide their own GitHub Personal Access Tokens via the application UI.

### Step 4: Configure Custom Domain (Optional)

1. Go to **Site settings → Domain management**
2. Click "Add custom domain"
3. Follow instructions to configure DNS records

---

## Build Configuration

The repository includes a comprehensive `netlify.toml` configuration file that handles:

### Build Settings

```toml
[build]
  command = "npm run validate"
  publish = "public"
```

### Node.js Version

Specified in `.nvmrc`:
```
22
```

And in `package.json`:
```json
"engines": {
  "node": ">=18.0.0",
  "npm": ">=9.0.0"
}
```

### Functions Configuration

```toml
[functions]
  directory = "functions"
  node_bundler = "esbuild"
  included_files = ["views/**", "utils/**"]
```

### Redirects & Headers

All routes are properly configured to:
- Serve static files from `/public`
- Route API requests to serverless functions
- Apply security headers
- Enable caching for static assets

---

## Serverless Architecture

CAROMAR is deployed as a Netlify serverless application:

### Function Structure

```
CAROMAR/
├── functions/
│   └── server.js          # Serverless wrapper
├── server.js              # Express application
├── views/                 # EJS templates
├── utils/                 # Utility modules
└── public/                # Static assets
```

### How It Works

1. All HTTP requests hit Netlify's CDN
2. Static assets (`/public`) are served directly from CDN
3. API routes (`/api/*`) and dynamic routes (`/`) are forwarded to serverless function
4. The serverless function runs the Express.js application
5. Views are rendered using EJS templates

### Performance Optimizations

- **Static Asset Caching:** 1 year cache for CSS/JS/images
- **API No-Cache:** Dynamic API responses always fresh
- **CDN Distribution:** Global edge network delivery
- **Function Bundling:** Optimized with esbuild

---

## Monitoring & Debugging

### Health Check Endpoint

Monitor application health:
```
GET https://your-site.netlify.app/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-10T23:00:00.000Z",
  "environment": "netlify-serverless",
  "version": "1.0.0",
  "uptime": 123.45
}
```

### Netlify Function Logs

View real-time function logs:
```bash
netlify functions:log
```

Or via Netlify Dashboard:
1. Go to your site dashboard
2. Navigate to **Functions** tab
3. View logs for each function invocation

### Build Logs

View build logs in Netlify Dashboard:
1. Go to **Deploys** tab
2. Click on any deploy
3. View full build log output

---

## Troubleshooting

### Common Issues

#### 1. Build Fails with "Module not found"

**Solution:** Ensure all dependencies are in `package.json`:
```bash
npm install
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

#### 2. Views Not Rendering (404 Error)

**Solution:** This has been fixed with the `VIEWS_PATH` environment variable in `functions/server.js`. If issues persist:
- Check that `views/` directory is included in repository
- Verify `netlify.toml` has `included_files = ["views/**", "utils/**"]`

#### 3. API Endpoints Returning 404

**Solution:** Check redirect configuration in `netlify.toml`:
```toml
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/server/:splat"
  status = 200
  force = true
```

#### 4. Rate Limiting Issues with GitHub API

**Solution:** 
- Users must provide their own GitHub Personal Access Tokens
- Authenticated requests have 5,000/hour rate limit
- Unauthenticated requests have only 60/hour

#### 5. Function Size Too Large

**Solution:**
- Remove unnecessary `node_modules` by using `npm ci --production`
- Current function size should be well under 50MB limit
- Check Netlify dashboard for actual function size

### Debug Mode

Enable detailed logging by checking function logs in Netlify Dashboard.

---

## Performance Metrics

Expected performance metrics:

- **Cold Start:** ~1-2 seconds (first request after idle)
- **Warm Response:** ~50-200ms (subsequent requests)
- **Static Assets:** <50ms (served from CDN)
- **Build Time:** ~30-60 seconds

---

## Security Considerations

### Implemented Security Features

1. **Helmet.js:** Security headers for XSS, clickjacking protection
2. **CORS:** Configured for secure cross-origin requests
3. **Rate Limiting:** API endpoints limited to 100 requests per 15 minutes per IP
4. **Input Validation:** All user inputs sanitized and validated
5. **GitHub Token Security:** Tokens never stored server-side, only client-side localStorage

### Security Headers

Applied via `netlify.toml`:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

---

## Scaling & Costs

### Netlify Free Tier Includes:

- **Bandwidth:** 100 GB/month
- **Build Minutes:** 300 minutes/month
- **Function Invocations:** 125,000/month
- **Function Runtime:** 100 hours/month

### Expected Usage (Low-Medium Traffic):

- **Function Invocations:** ~1,000-10,000/month
- **Bandwidth:** ~1-10 GB/month
- **Build Minutes:** ~1-5 minutes/month

**Result:** CAROMAR runs completely free on Netlify's free tier for typical usage.

### Upgrade Triggers:

Only upgrade if you exceed:
- 100 GB bandwidth/month (very high traffic)
- 125,000 function calls/month (enterprise-level usage)

---

## Continuous Deployment

### Automatic Deployments

Netlify automatically deploys when you push to GitHub:

1. **Push to Main Branch:**
   ```bash
   git push origin main
   ```
   → Triggers production deployment

2. **Push to Feature Branch:**
   ```bash
   git push origin feature-branch
   ```
   → Creates deploy preview

3. **Pull Request:**
   → Automatic deploy preview linked in PR

### Deploy Contexts

Configured in `netlify.toml`:

- **Production:** Main branch deployments
- **Deploy Preview:** Branch and PR deployments
- **Development:** Local development context

---

## Rollback Strategy

### Roll Back to Previous Deploy

Via Netlify Dashboard:
1. Go to **Deploys** tab
2. Find the deploy you want to restore
3. Click **"..."** menu → **"Publish deploy"**

Via Netlify CLI:
```bash
netlify rollback
```

---

## Support & Resources

### Official Documentation

- [CAROMAR Documentation](./README.md)
- [Setup Guide](./SETUP.md)
- [Development Guide](./DEVELOPMENT.md)
- [API Documentation](./API.md)

### Netlify Resources

- [Netlify Documentation](https://docs.netlify.com/)
- [Netlify Functions Guide](https://docs.netlify.com/functions/overview/)
- [Netlify CLI Reference](https://docs.netlify.com/cli/get-started/)

### Support Channels

- **GitHub Issues:** [Report bugs or request features](https://github.com/UniversalStandards/CAROMAR/issues)
- **Netlify Community:** [Netlify Support Forum](https://answers.netlify.com/)

---

## License

MIT License - See [LICENSE](./LICENSE) file for details.

---

## Acknowledgments

- Built with Express.js and Netlify Functions
- Powered by GitHub API
- Deployed on Netlify Edge Network

---

**Last Updated:** February 10, 2026
