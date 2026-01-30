# Development Environment Configuration

## Required Tools and Setup

### Core Development Tools

#### 1. Visual Studio Code Setup
**Extensions to Install:**
- **Essential Extensions**:
  - ES7+ React/Redux/React-Native snippets
  - Auto Rename Tag
  - Bracket Pair Colorizer
  - indent-rainbow
  - Path Intellisense
  - Prettier - Code formatter
  - TypeScript Importer
  - GitLens — Git supercharged
  - Thunder Client (API testing)

- **Project-Specific Extensions**:
  - Tailwind CSS IntelliSense
  - SQLite Viewer
  - Next.js snippets
  - Prisma (for future database migrations)

**VS Code Settings Configuration:**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative",
  "emmet.includeLanguages": {
    "typescriptreact": "html"
  },
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  },
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

#### 2. Git Configuration
**Global Git Setup:**
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@company.com"
git config --global core.editor "code --wait"
git config --global init.defaultBranch main
```

**Repository Setup:**
```bash
git init
git remote add origin [repository-url]
git branch -M main
```

**Branch Strategy:**
- `main` - Production ready code
- `develop` - Development branch
- `feature/*` - Feature branches
- `hotfix/*` - Emergency fixes
- `release/*` - Release preparation

#### 3. Node.js Environment
**Version Requirements:**
- Node.js 18+ or 20+ (LTS recommended)
- npm 9+ or yarn 1.22+

**Installation Verification:**
```bash
node --version
npm --version
```

#### 4. Database Tools
**SQLite Browser Options:**
- DB Browser for SQLite (https://sqlitebrowser.org/)
- SQLiteStudio (https://sqlitestudio.pl/)
- VS Code SQLite extension

**Database Connection String:**
```
sqlite://./db/carement.db
```

### Development Workflow Setup

#### 1. Project Initialization
```bash
# Clone repository
git clone [repository-url]
cd Factory-Shop-ERP

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm run dev
```

#### 2. Development Scripts
```json
{
  "dev": "next dev -p 3000",
  "dev:network": "next dev -p 3000 -H 0.0.0.0",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "deploy": "npm run build && node src/scripts/backup-database.js",
  "test": "jest",
  "test:watch": "jest --watch"
}
```

#### 3. Code Quality Standards
**ESLint Configuration:**
```json
{
  "extends": [
    "next/core-web-vitals",
    "eslint:recommended",
    "@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "no-console": "warn",
    "prefer-const": "error"
  }
}
```

**Prettier Configuration:**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

### Testing Environment

#### 1. Unit Testing Setup
**Jest Configuration:**
```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  transformIgnorePatterns: [
    '/node_modules/',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
};
```

#### 2. E2E Testing Setup
**Cypress Configuration:**
```json
{
  "baseUrl": "http://localhost:3000",
  "viewportWidth": 1280,
  "viewportHeight": 720,
  "defaultCommandTimeout": 10000,
  "projectId": "factory-shop-erp"
}
```

### Development Best Practices

#### 1. Git Workflow
```bash
# Create feature branch
git checkout -b feature/user-authentication

# Make changes and commit
git add .
git commit -m "feat: implement user authentication system"

# Push to remote
git push origin feature/user-authentication

# Create pull request
# Code review and merge to develop
```

#### 2. Branch Naming Convention
- `feature/authentication-system`
- `bugfix/login-error-handling`
- `hotfix/critical-security-patch`
- `release/v1.2.0`

#### 3. Commit Message Format
```
type(scope): description

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Code formatting
- refactor: Code refactoring
- test: Tests
- chore: Maintenance tasks
```

### Local Development URLs
- **Development Server**: http://localhost:3000
- **API Endpoints**: http://localhost:3000/api/
- **Database File**: ./db/carement.db
- **Uploads Directory**: ./public/uploads/
- **Logs Directory**: ./logs/

### Environment Variables (.env)
```env
# Application
NODE_ENV=development
NEXT_PUBLIC_BASE_URL=http://localhost:3000
PORT=3000

# Database
DATABASE_URL=sqlite://./db/carement.db

# Telegram
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Security
JWT_SECRET=your_jwt_secret_here
BCRYPT_SALT_ROUNDS=12

# Optional AI Integration
GOOGLE_GEMINI_API_KEY=your_api_key_here
```

### Debugging Setup

#### 1. VS Code Debug Configuration
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev",
      "serverReadyAction": {
        "pattern": "started server on .+:(\\d+)",
        "uriFormat": "http://localhost:%s",
        "action": "debugWithChrome"
      }
    }
  ]
}
```

#### 2. Browser Debugging
- React DevTools extension
- Redux DevTools (if needed)
- Chrome Developer Tools
- Network tab monitoring

### Performance Monitoring (Development)
- Next.js Bundle Analyzer
- React Profiler
- Lighthouse audits
- Database query optimization

## Setup Verification Checklist

- [ ] VS Code installed with required extensions
- [ ] Node.js 18+/npm installed
- [ ] Git configured with user details
- [ ] Repository cloned and dependencies installed
- [ ] Environment variables configured
- [ ] Development server starts successfully
- [ ] Database file created and accessible
- [ ] Testing framework configured
- [ ] Debug configuration set up
- [ ] Code quality tools (ESLint/Prettier) working

## Troubleshooting Common Issues

### 1. Dependency Installation Issues
```bash
# Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 2. Port Already in Use
```bash
# Kill process using port 3000
netstat -ano | findstr :3000
taskkill /PID [process-id] /F
```

### 3. Database Connection Issues
```bash
# Check database file permissions
# Ensure db directory exists
mkdir -p db
```

### 4. Environment Variables Not Loading
```bash
# Verify .env file exists
# Check for proper syntax
# Restart development server
```

## Next Steps

1. Complete environment setup verification
2. Run initial development server test
3. Configure team development standards
4. Set up continuous integration
5. Begin Phase 1 implementation

**Status**: Development environment configuration ready
**Last Updated**: January 30, 2026