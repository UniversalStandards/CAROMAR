# CAROMAR Quick Start Guide

Get CAROMAR up and running in under 5 minutes!

## 🚀 For Users (No Installation Required)

### Option 1: Use Deployed Version
Simply visit the deployed CAROMAR instance:
- **Production:** https://caromar.netlify.app (update with your actual URL)

### How to Use:
1. Get a GitHub Personal Access Token:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scopes: `repo` and `user`
   - Copy the token

2. Use CAROMAR:
   - Enter your GitHub token
   - Search for repositories by username
   - Select operation mode (Fork or Merge)
   - Execute!

---

## 💻 For Developers (Local Setup)

### Prerequisites
- Node.js 22+ ([Download](https://nodejs.org/))
- Git ([Download](https://git-scm.com/))
- GitHub Personal Access Token

### Quick Local Setup (3 Steps)

#### Step 1: Clone & Install
```bash
git clone https://github.com/UniversalStandards/CAROMAR.git
cd CAROMAR
npm install
```

#### Step 2: Validate Configuration
```bash
npm run validate
```

#### Step 3: Start Server
```bash
npm start
```

Then open http://localhost:3000

**Done!** 🎉

---

## 🌐 For Deployers (Netlify Deployment)

### Method 1: One-Click Deploy (Easiest)
1. Click the button:  
   [![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/UniversalStandards/CAROMAR)

2. Follow Netlify's prompts

3. Your site is live!

### Method 2: GitHub Integration (Recommended)
1. Push repository to GitHub (if not already done)
2. Go to https://app.netlify.com
3. Click "Add new site" → "Import an existing project"
4. Select GitHub → Choose CAROMAR repository
5. Deploy settings are pre-configured in `netlify.toml`
6. Click "Deploy site"

**Automatic deployments:** Every push to `main` branch triggers a new deploy!

### Method 3: Netlify CLI (Advanced)
```bash
# Install CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

---

## 🔧 Common Commands

### Development
```bash
npm start              # Start production server
npm run dev            # Start with auto-reload
npm test               # Run tests
npm run validate       # Validate deployment config
```

### Deployment Verification
```bash
# After deploying, monitor health:
node scripts/monitor-deployment.js https://your-site.netlify.app
```

---

## 📚 Next Steps

### For Users:
- Read the [User Guide](./README.md#usage-guide) for detailed instructions
- Learn about [GitHub Token Setup](./README.md#github-token-setup)

### For Developers:
- Check [SETUP.md](./SETUP.md) for detailed setup
- Read [DEVELOPMENT.md](./DEVELOPMENT.md) for architecture details
- Review [API.md](./API.md) for API documentation

### For Deployers:
- Read [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md) for comprehensive guide
- Check [DEPLOYMENT_FIXES.md](./DEPLOYMENT_FIXES.md) for what was fixed
- Configure custom domain in Netlify dashboard

---

## ⚡ Features at a Glance

### 🔄 Fork Repositories
Select multiple repositories and fork them all to your account in one operation.

### 🔀 Merge Repositories  
Combine multiple repositories into a single organized repository with folder structure.

### 📊 Analytics & Comparison
Analyze repository statistics and compare multiple repositories side-by-side.

### 🔐 Secure & Private
Your GitHub token stays in your browser. No server-side storage. API-only communication.

---

## 🆘 Troubleshooting

### "Module not found" Error
```bash
rm -rf node_modules package-lock.json
npm install
```

### Port 3000 Already in Use
```bash
# Use different port
PORT=3001 npm start
```

### GitHub API Rate Limit
- Use a GitHub Personal Access Token (5,000 requests/hour)
- Without token: Only 60 requests/hour

### Netlify Build Fails
```bash
# Validate locally first
npm run validate
npm test
npm run lint
```

### Views Not Rendering
- Ensure `views/` directory exists
- Check `netlify.toml` includes `views/**` in `included_files`
- Verify `VIEWS_PATH` is set in `functions/server.js`

---

## 📞 Get Help

- **Documentation:** Check all `.md` files in repository
- **Issues:** https://github.com/UniversalStandards/CAROMAR/issues
- **Discussions:** GitHub Discussions (if enabled)

---

## 🎯 Quick Reference Card

| Task | Command |
|------|---------|
| Install | `npm install` |
| Start Server | `npm start` |
| Development Mode | `npm run dev` |
| Run Tests | `npm test` |
| Validate Config | `npm run validate` |
| Deploy to Netlify | `netlify deploy --prod` |
| Monitor Deployment | `node scripts/monitor-deployment.js <url>` |
| Check Health | `curl https://your-site.netlify.app/api/health` |

---

## 🏆 Pro Tips

1. **Use Enhanced App:** The enhanced-app.js provides more features than basic app.js
2. **Token Scopes:** Ensure your GitHub token has `repo` and `user` scopes
3. **Rate Limits:** Monitor rate limits in the application UI
4. **Batch Operations:** Use "Select All" for efficient bulk operations
5. **Export/Import:** Save your repository selections for later use
6. **Keyboard Shortcuts:** Press Help button in UI to see available shortcuts

---

## ✅ Success Checklist

### Before Using:
- [ ] Have Node.js 22+ installed (for local development)
- [ ] Have GitHub Personal Access Token ready
- [ ] Token has `repo` and `user` scopes

### After Local Setup:
- [ ] `npm install` completed without errors
- [ ] `npm run validate` passes all checks
- [ ] Server starts at http://localhost:3000
- [ ] Main page loads correctly

### After Netlify Deployment:
- [ ] Build succeeded in Netlify dashboard
- [ ] Site is accessible at your .netlify.app URL
- [ ] Health check endpoint returns 200 OK
- [ ] Can authenticate with GitHub token
- [ ] Can search for repositories
- [ ] Can fork repositories successfully

---

## 🎓 Learning Path

**Beginner:** Just want to use it?
1. Get GitHub token
2. Visit deployed site
3. Start forking/merging!

**Intermediate:** Want to run locally?
1. Clone repository
2. Install dependencies
3. Start server
4. Experiment!

**Advanced:** Want to deploy your own?
1. Fork repository
2. Deploy to Netlify
3. Configure custom domain
4. Monitor and maintain!

**Expert:** Want to contribute?
1. Read DEVELOPMENT.md
2. Set up development environment
3. Write tests
4. Submit pull requests!

---

**Ready to start?** Choose your path above and let's go! 🚀

---

**Last Updated:** February 10, 2026  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
