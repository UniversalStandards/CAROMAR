# GitHub Copilot Instructions for CAROMAR

## Project Overview

CAROMAR (Copy A Repository Or Merge All Repositories) is a web application for managing GitHub repositories. It allows users to fork individual repositories or merge multiple repositories into a single repository with organized folder structure.

## Technology Stack

- **Backend**: Node.js with Express.js
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Template Engine**: EJS
- **HTTP Client**: Axios for GitHub API integration
- **Testing**: Jest with Supertest for API testing
- **Linting**: ESLint (ECMAScript 2021 configuration)
- **Development Tools**: Nodemon for hot-reloading

## Architecture Patterns

### Backend Structure
- RESTful API design with Express.js routes
- Middleware-based architecture (rate limiting, authentication)
- Utility modules organized in `/utils` directory
- API endpoints follow `/api/*` pattern

### Frontend Structure
- Class-based architecture with `EnhancedCaromarApp` class
- Production frontend uses `enhanced-app.js`
- `app.js` is a simplified reference implementation
- No frontend build process - direct browser JavaScript

## Code Style Guidelines

### JavaScript
- Use ES6+ features: `const`/`let`, arrow functions, destructuring, template literals
- Use 4-space indentation (configured in ESLint)
- Use semicolons consistently
- Use single quotes for strings (allow escaping)
- Use camelCase for variables and functions
- Use PascalCase for classes
- Add JSDoc comments for functions with parameters and return types
- Prefer async/await over promise chains

### CSS
- Use meaningful, descriptive class names
- Follow BEM methodology where applicable
- Use CSS custom properties for theming
- Ensure responsive design with mobile-first approach

### HTML/EJS
- Use semantic HTML elements
- Include proper ARIA labels for accessibility
- Ensure proper heading hierarchy (h1, h2, h3, etc.)

## Development Workflow

### Running the Application
```bash
npm install          # Install dependencies
npm start            # Production mode
npm run dev          # Development mode with auto-reload
```

### Testing
```bash
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### Linting
```bash
npm run lint         # Check for linting errors
npm run lint:fix     # Auto-fix linting errors
```

## Testing Requirements

- Write tests for all new API endpoints
- Include both positive and negative test cases
- Mock external dependencies (GitHub API calls)
- Use Jest's built-in assertion methods
- Tests are located in `/tests` directory
- Test files should follow `*.test.js` naming convention
- Aim for good test coverage, especially for critical paths

## Security Considerations

### Token Handling
- **Never** log or store GitHub tokens server-side
- **Tokens must never be transmitted via query parameters.** Always transmit GitHub access tokens using secure request headers (e.g., the `Authorization` header) only. Query parameters can be logged by servers, proxies, and browser history, leading to credential leakage.
- Validate token permissions before operations
- All token validation happens on the backend via GitHub API

### Input Validation
- Sanitize all user inputs on both client and server
- Use the validation utilities in `utils/validation.js`
- Validate GitHub usernames, repository names, and other inputs
- Return appropriate HTTP status codes for validation errors

### API Security
- Rate limiting is configured via `express-rate-limit`
- Use Helmet.js for security headers
- Implement CORS properly for cross-origin requests
- Never expose sensitive error messages to clients

## GitHub API Integration

- Use axios for all GitHub API calls
- Always include `User-Agent` header in API requests
- Monitor and display rate limits to users
- Handle GitHub API errors gracefully
- Implement delays between batch operations to respect rate limits
- Use GitHub REST API v3 (the current stable REST API version)
- Authentication uses Personal Access Tokens with `token` prefix format

## Common Patterns

### Error Handling
```javascript
try {
  // operation
} catch (error) {
  console.error('Error description:', error.message);
  res.status(500).json({ error: 'User-friendly error message' });
}
```

### API Response Format
```javascript
res.json({
  // success data
  rate_limit: {
    remaining: response.headers['x-ratelimit-remaining'],
    reset: response.headers['x-ratelimit-reset']
  }
});
```

### GitHub API Requests
```javascript
const response = await axios.get(url, {
    headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'CAROMAR-App',
        'Accept': 'application/vnd.github.v3+json'
    }
});
```

**Note**: The codebase currently uses `token ${token}` format for authentication, which is supported by GitHub. While `Bearer ${token}` is the modern recommended format, the existing pattern works correctly with GitHub's REST API v3.

## File Organization

- `/public/css/` - Stylesheets
- `/public/js/` - Frontend JavaScript
- `/views/` - EJS templates
- `/utils/` - Utility modules (analytics, comparison, logger, validation)
- `/tests/` - Test files
- `server.js` - Main Express application

## Key Features to Understand

1. **GitHub Authentication**: Token-based authentication with permission validation
2. **Repository Search**: Advanced filtering and sorting capabilities
3. **Fork Operation**: Batch forking with progress tracking
4. **Merge Operation**: Creates new repository with instructions for manual merge
5. **Rate Limit Handling**: Real-time monitoring and user feedback

## Documentation Standards

- Update README.md for new user-facing features
- Update DEVELOPMENT.md for architecture changes
- Update API.md for new endpoints
- Include code examples in documentation
- Add screenshots for UI changes

## Assumptions for New Contributors

- Assume contributors may be new to the codebase
- Provide clear commit messages with detailed descriptions
- Reference related issues in commit messages and PRs
- Follow semantic commit message format when possible
- Always ensure tests pass before committing

## Important Notes

- This is a stateless application - no database required
- All data persistence happens client-side via localStorage
- The application proxies GitHub API requests to avoid CORS issues
- Enhanced version (`enhanced-app.js`) is the production implementation
- Basic version (`app.js`) serves as a minimal reference

## When Making Changes

1. **Before coding**: Understand the existing architecture and patterns
2. **During coding**: Follow the style guidelines and security practices
3. **Testing**: Write tests first or alongside implementation
4. **Linting**: Run `npm run lint` before committing
5. **Documentation**: Update relevant docs if behavior changes
6. **Verification**: Test the full workflow manually when possible

## Common Tasks

### Adding a New API Endpoint
1. Add route handler in `server.js`
2. Implement input validation
3. Add GitHub API integration with proper error handling
4. Include rate limit information in response
5. Write tests in `/tests/app.test.js`
6. Update API.md documentation

### Adding a Frontend Feature
1. Add methods to `EnhancedCaromarApp` class
2. Update UI elements in `/views/index.ejs`
3. Add corresponding styles in `/public/css/style.css`
4. Ensure responsive design works on mobile
5. Add accessibility features (ARIA labels, keyboard support)
6. Test across different browsers

### Fixing a Bug
1. Write a test that reproduces the bug
2. Fix the bug with minimal changes
3. Verify the test passes
4. Ensure no regression in other tests
5. Update documentation if the behavior changes

## Performance Considerations

- Minimize GitHub API calls where possible
- Use debouncing for search inputs
- Implement lazy loading for repository lists
- Cache user preferences in localStorage
- Compress responses where applicable

## Accessibility Requirements

- All interactive elements must be keyboard accessible
- Include ARIA labels for screen readers
- Maintain proper color contrast ratios
- Support keyboard shortcuts (Ctrl+A, Ctrl+D, Ctrl+F)
- Ensure focus management is logical

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ JavaScript features are used
- No Internet Explorer support required
- Responsive design for mobile and tablet devices

---

**Last Updated**: 2025-12-05
**Project Version**: 1.0.0