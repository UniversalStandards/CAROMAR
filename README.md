# CAROMAR
**C**opy **A** **R**epository **O**r **M**erge **A**ll **R**epositories

[![Netlify Status](https://api.netlify.com/api/v1/badges/YOUR-SITE-ID/deploy-status)](https://app.netlify.com/sites/YOUR-SITE-NAME/deploys)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/UniversalStandards/CAROMAR)

A secure, production-ready web application that allows users to efficiently manage GitHub repositories by either forking individual repositories or merging multiple repositories into a single repository with organized folder structure.

![CAROMAR Interface](https://github.com/user-attachments/assets/a044e51e-4b80-4165-ada5-611b47eab378)

## 🚀 Quick Deploy

Deploy CAROMAR to Netlify with one click:

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/UniversalStandards/CAROMAR)

**[📖 Full Deployment Guide](./NETLIFY_DEPLOYMENT.md)** | **[✅ Deployment Fixes](./DEPLOYMENT_FIXES.md)** | **[⚡ Quickstart](./QUICKSTART.md)**

---

## Features

### 🔐 GitHub Authentication
- Secure GitHub Personal Access Token integration
- User profile validation and display
- Token storage for session persistence

### 🔍 Repository Discovery
- Search repositories by GitHub username
- Support for both personal and other users' repositories
- Comprehensive repository information display
- Language detection and visual indicators

### 📋 Repository Selection
- Interactive repository grid with checkboxes
- Bulk selection controls (Select All/Deselect All)
- Real-time selection counter and status updates

### 🚀 Two Operation Modes

#### 1. Fork Individual Repositories
- Fork each selected repository individually to your GitHub account
- Preserves original repository structure and history
- Batch processing with progress tracking
- Error handling for failed forks

#### 2. Merge into Single Repository
- Combines multiple repositories into one organized repository
- Each source repository becomes a main folder
- Maintains separation while creating unified access
- Fully automated server-side merge execution with one atomic Git Data API publication (no manual git steps required)
- Fail-closed merge validation for truncated trees, empty sources, unsupported Git modes, oversized files, and aggregate limits
- Automatic rollback of a newly created target when staging or publication fails
- Deterministic capability detection (API/frontend/testing/CI/infrastructure) and per-repository risk scoring in merge output; no model is claimed where none is used
- Structured merge results include the published commit SHA, file/byte counts, target branch, and source-history limitation
- Custom naming for the merged repository
- Repository descriptor validation (name/full_name/clone_url) before merge repo creation

### 📈 Repository Analytics & Comparison
- Aggregate statistics across a selected repository set: total stars/forks/watchers/size, private/forked/archived counts
- Language distribution, activity timeline, and trending/abandoned/active classification
- Two-way repository comparison, multi-repository comparison matrix, and "find best" ranking by a chosen criterion (stars, forks, watchers, recency, size, or open issues)
- Powered by `/api/analyze-repos` and `/api/compare-repos`, with a dedicated Analytics and Comparison panel in the UI

### 🛡️ Security Hardening
- Helmet-managed security headers with a strict Content Security Policy
- Layered rate limiting: per-IP (express-rate-limit) plus a per-identifier (token or IP) limiter for defense in depth
- Prototype-pollution-safe sanitization applied to every incoming request body
- Suspicious-pattern (XSS) detection on free-text fields such as repository descriptions
- Origin validation on state-changing API requests (CSRF defense-in-depth), configurable via `ALLOWED_ORIGINS`
- Strict Content-Type enforcement on write endpoints
- Repository descriptor validation (name/full_name/HTTPS GitHub clone_url) before any merge repository is created
- Tokens accepted only via the `Authorization` header — never via query parameters — to prevent leakage through logs or browser history

### ⚡ Performance Monitoring
- Real-time per-endpoint request and error tracking via a built-in `PerformanceMonitor`
- Slow-request detection and automatic health status evaluation (healthy/degraded/unhealthy)
- Exposed at `/api/metrics`, and folded into the `/api/health` check

### 📊 Progress Tracking
- Real-time progress bars during operations
- Detailed status messages
- Comprehensive results display with success/error reporting
- Direct links to newly created repositories

### 🎨 User Experience
- Responsive design for desktop and mobile devices
- Modern, clean interface with GitHub-inspired styling
- Intuitive workflow with step-by-step guidance
- Error notifications and success confirmations

---

## Installation & Setup

### Prerequisites
- Node.js (v24 or higher)
- npm (v9 or higher)
- GitHub Personal Access Token

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/UniversalStandards/CAROMAR.git
   cd CAROMAR
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables (optional):**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Validate deployment configuration:**
   ```bash
   npm run validate
   ```

5. **Start the application:**
   ```bash
   npm start
   ```

6. **Open your browser:**
   Navigate to `http://localhost:3000`

### Development Mode

For development with auto-restart on file changes:
```bash
npm run dev
```

### Deployment

#### Deploy to Netlify (Recommended)

**Option 1: One-Click Deploy**
1. Click the "Deploy to Netlify" button above
2. Configure your site name
3. Deploy!

**Option 2: Manual Deploy with CLI**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

**Option 3: GitHub Integration**
1. Push to GitHub
2. Connect repository in Netlify Dashboard
3. Automatic deployments on every push

**📖 See [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md) for detailed instructions**

---

## Usage Guide

### Step 1: Authentication
1. Visit the CAROMAR web application
2. Click "Create Personal Access Token" to generate a GitHub token
3. Enter your token and click "Validate Token"
4. Your GitHub profile will be displayed once validated

### Step 2: Find Repositories
1. Enter a GitHub username (yours or another user's)
2. Click "Search Repositories" to load their repositories
3. Browse the repository grid with detailed information

### Step 3: Select Operation Mode
Choose between two operation modes:

**Fork Individual Repositories:**
- Select repositories you want to fork
- Each will be forked individually to your account
- Maintains original repository structure

**Merge into Single Repository:**
- Select multiple repositories to combine
- Enter a name for the merged repository
- Creates one repository with all selected repos as folders

### Step 4: Execute Action
1. Select your desired repositories using checkboxes
2. Use "Select All" or "Deselect All" for bulk operations
3. Click the "Execute" button to start the process
4. Monitor progress with real-time status updates

### Step 5: Review Results
- View detailed results of the operation
- Access direct links to newly created repositories
- Review any errors or issues encountered

### Optional: Analytics & Comparison
- Use the Analytics panel to generate a statistics report across your selected (or all) repositories
- Use the Comparison panel to compare two repositories head-to-head, build a multi-repository ranking matrix, or find the "best" repository by a chosen criterion

---

## GitHub Token Setup

To use CAROMAR, you need a GitHub Personal Access Token:

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select appropriate scopes:
   - ✅ `repo` (for repository access)
   - ✅ `user` (for user information)
4. Copy the generated token
5. Enter it in the CAROMAR application

**Security Note:** Your token is stored locally in your browser and sent to CAROMAR only in the `Authorization` header for the request that needs it. It is never sent in query parameters or request bodies, so it is not exposed through URLs or browser history. Use HTTPS in production and grant the minimum GitHub permissions required for the operation.

---

## API Endpoints

The application provides several REST API endpoints:

### Authentication & User
- `GET /api/user` - Get authenticated user information
- `GET /api/validate-token` - Validate GitHub token and permissions

### Repository Management
- `GET /api/search-repos` - Search repositories for a user
- `POST /api/fork-repo` - Fork a specific repository
- `POST /api/create-merged-repo` - Create merged repository
- `GET /api/repo-content` - Get repository content preview

### Analytics & Comparison
- `POST /api/analyze-repos` - Analyze repository statistics
- `POST /api/compare-repos` - Compare multiple repositories

### System
- `GET /api/health` - Health check endpoint
- `GET /api/metrics` - Performance metrics

**📖 See [API.md](./API.md) for detailed API documentation**

---

## Technology Stack

### Frontend
- HTML5, CSS3, Vanilla JavaScript
- EJS templating engine
- Responsive design
- Real-time progress tracking

### Backend
- Node.js (v24+)
- Express.js
- Serverless-ready architecture
- RESTful API design

### Security
- Helmet (security headers & CSP)
- express-rate-limit (per-IP rate limiting) plus a custom per-identifier rate limiter
- Custom input validation, sanitization, and suspicious-pattern (XSS) detection
- CSRF-style origin validation and Content-Type enforcement on write endpoints

### Infrastructure
- Netlify Functions (Serverless)
- Netlify CDN (Static assets)
- GitHub REST API v3 integration

### Development
- Jest + Supertest (Testing)
- ESLint (Linting)
- Nodemon (Development)

---

## Project Structure

```
CAROMAR/
├── public/                          # Static assets (served from CDN)
│   ├── css/
│   │   ├── style.css                # Application styling
│   │   └── icons-fallback.css       # Icon fallbacks
│   ├── js/
│   │   ├── app.js                   # Basic frontend
│   │   └── enhanced-app.js          # Full-featured frontend
│   ├── robots.txt                   # SEO crawler rules
│   └── sitemap.xml                  # SEO sitemap
├── views/
│   └── index.ejs                    # Main HTML template
├── functions/
│   └── server.js                    # Netlify serverless wrapper
├── utils/
│   ├── analytics.js                 # Repository analytics
│   ├── comparison.js                # Repository comparison
│   ├── logger.js                    # Logging utility
│   ├── merge-automation.js          # Atomic Git Data API merge engine + deterministic analysis
│   ├── validation.js                # Input validation & sanitization
│   ├── performance.js               # Performance monitoring
│   └── security.js                  # Security hardening utilities
├── scripts/
│   ├── validate-deployment.js       # Pre-deploy validation
│   └── monitor-deployment.js        # Post-deploy health monitoring
├── tests/
│   ├── app.test.js                  # API tests
│   ├── merge-automation.test.js     # Merge engine tests
│   ├── merged-repo.validation.integration.test.js  # Real-server integration tests
│   ├── security.test.js             # Security utility tests
│   ├── server.test.js               # Server endpoint integration tests
│   ├── token-security.test.js       # Token/Authorization-header handling tests
│   └── utils.test.js                # Utility function tests
├── server.js                        # Express application
├── package.json                     # Dependencies & scripts
├── netlify.toml                     # Netlify configuration
├── .nvmrc                           # Node version
├── jest.config.js                   # Jest configuration
├── eslint.config.js                 # ESLint configuration
├── .env.example                     # Environment template
├── README.md                        # This file
├── QUICKSTART.md                    # 5-minute setup guide
├── NETLIFY_DEPLOYMENT.md            # Deployment guide
├── DEPLOYMENT_FIXES.md              # Fixes summary
├── DEPLOYMENT_COMPLETE.md           # Deployment completion report
├── ENVIRONMENT.md                   # Environment configuration guide
├── SETUP.md                         # Setup guide
├── DEVELOPMENT.md                   # Development guide
├── API.md                           # API documentation
├── docs/adr/0001-atomic-merge-publication.md  # Merge architecture decision record
└── LICENSE                          # MIT License
```

---

## Development

### Available Scripts

```bash
npm start              # Start production server
npm run dev            # Start development server with auto-reload
npm test               # Run tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate coverage report
npm run lint           # Check code quality
npm run lint:fix       # Fix linting issues
npm run build          # Build for production
npm run validate       # Validate deployment configuration
npm run predeploy      # Pre-deployment checks (lint + test)
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

CAROMAR ships a comprehensive automated test suite covering server endpoints, security utilities, input validation, the atomic merge engine, the frontend/API response contract, and Authorization-header token handling — including a real-server integration suite that exercises `server.js` directly.

---

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**📖 See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines**

---

## Documentation

- **[README.md](./README.md)** - This file (Overview & Quick Start)
- **[QUICKSTART.md](./QUICKSTART.md)** - 5-minute setup guide
- **[NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md)** - Netlify deployment guide
- **[DEPLOYMENT_FIXES.md](./DEPLOYMENT_FIXES.md)** - Deployment fixes summary
- **[DEPLOYMENT_COMPLETE.md](./DEPLOYMENT_COMPLETE.md)** - Deployment completion report
- **[ENVIRONMENT.md](./ENVIRONMENT.md)** - Environment variable configuration guide
- **[SETUP.md](./SETUP.md)** - Detailed setup instructions
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Development guide
- **[API.md](./API.md)** - API documentation
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution guidelines
- **[SECURITY.md](./SECURITY.md)** - Security policy
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history

---

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## Support

### Get Help

If you encounter any issues or have questions:

1. **Check Documentation:**
   - [Setup Guide](./SETUP.md)
   - [Deployment Guide](./NETLIFY_DEPLOYMENT.md)
   - [API Documentation](./API.md)

2. **Search Issues:**
   - Check [existing issues](https://github.com/UniversalStandards/CAROMAR/issues)

3. **Create New Issue:**
   - [Report a bug](https://github.com/UniversalStandards/CAROMAR/issues/new)
   - Include error messages and steps to reproduce

### Community

- **GitHub Discussions:** Ask questions and share ideas
- **Issue Tracker:** Report bugs and request features

---

## Acknowledgments

- **GitHub API** for repository management capabilities
- **Netlify** for serverless hosting platform
- **Font Awesome** for icons
- **Express.js** for backend framework
- Modern web standards for responsive design

---

## Status

✅ **Production Ready**
✅ **Deployment Tested**
✅ **Fully Documented**
✅ **Security Hardened**

---

**Built with ❤️ by US-SPURS**

**Last Updated:** September 9, 2026
