# GitHub Setup Guide

This document explains how to configure GitHub Actions secrets and settings for the IFC-OpenWorld CI/CD pipeline.

## Required GitHub Secrets

Navigate to your repository → Settings → Secrets and variables → Actions → New repository secret

### 1. Cesium Ion Token
**Name**: `VITE_CESIUM_ION_TOKEN`
**Description**: Your Cesium Ion access token for 3D globe imagery
**How to get**:
1. Go to https://ion.cesium.com/
2. Sign up for a free account
3. Navigate to Access Tokens
4. Copy your default token or create a new one
**Required for**: Frontend build, Lighthouse CI

---

### 2. Codecov Token (Optional but Recommended)
**Name**: `CODECOV_TOKEN`
**Description**: Token for uploading test coverage reports
**How to get**:
1. Go to https://codecov.io/
2. Sign up with your GitHub account
3. Add your repository
4. Copy the upload token
**Required for**: Coverage reporting (optional, works without it)

---

### 3. Docker Hub Credentials (For Deployment)
**Name**: `DOCKER_USERNAME`
**Value**: Your Docker Hub username

**Name**: `DOCKER_PASSWORD`
**Value**: Your Docker Hub password or access token
**How to get**:
1. Go to https://hub.docker.com/
2. Sign up for a free account
3. Go to Account Settings → Security → New Access Token
4. Create token with Read & Write permissions
**Required for**: Production deployment (deploy.yml workflow)

---

### 4. Production API URL (For Deployment)
**Name**: `VITE_API_URL`
**Value**: Your production API URL (e.g., `https://api.ifc-openworld.com`)
**Required for**: Frontend production build

---

### 5. Lighthouse CI Token (Optional)
**Name**: `LHCI_GITHUB_APP_TOKEN`
**Description**: Token for Lighthouse CI GitHub App integration
**How to get**:
1. Install Lighthouse CI GitHub App: https://github.com/apps/lighthouse-ci
2. Configure it for your repository
3. Token is generated automatically by the app
**Required for**: Enhanced Lighthouse reporting (optional)

---

## GitHub Actions Configuration

### Enable Actions
1. Go to repository Settings → Actions → General
2. Enable "Allow all actions and reusable workflows"
3. Enable "Read and write permissions" for GITHUB_TOKEN

### Branch Protection Rules (Recommended)
1. Go to Settings → Branches → Add rule
2. Branch name pattern: `main`
3. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - Select status checks:
     - Backend Tests
     - Frontend Tests
     - IFC Processor Tests
     - Lighthouse Performance
     - Security Audit
     - Docker Build Test

---

## Dependabot Configuration

Dependabot is already configured in `.github/dependabot.yml`. It will automatically:
- Check for dependency updates weekly (every Monday)
- Create PRs for security updates
- Group production and development dependencies
- Update Docker base images
- Update GitHub Actions versions

### Configure Dependabot Alerts
1. Go to Settings → Security & analysis
2. Enable:
   - ✅ Dependency graph
   - ✅ Dependabot alerts
   - ✅ Dependabot security updates

---

## Workflow Overview

### CI Workflow (`.github/workflows/ci.yml`)
Runs on every push and pull request to `main` and `develop` branches.

**Jobs**:
1. **backend-test**: Runs Jest tests with PostgreSQL + Redis
2. **frontend-test**: TypeScript check, ESLint, build validation
3. **ifc-processor-test**: Python pytest with coverage
4. **lighthouse**: Performance audit (FCP <1.5s target)
5. **security-audit**: npm/yarn audit for vulnerabilities
6. **docker-build**: Validates Docker images build successfully

**Duration**: ~10-15 minutes

### Deploy Workflow (`.github/workflows/deploy.yml`)
Runs on push to `main` branch or manual trigger.

**Jobs**:
1. **build-and-push**: Builds and pushes Docker images to Docker Hub
2. **notify**: Sends deployment status notification

**Duration**: ~15-20 minutes

---

## Testing the CI Pipeline

### 1. Initial Setup
```bash
# 1. Create a new branch
git checkout -b test/ci-setup

# 2. Make a small change (e.g., update README)
echo "\n## CI/CD Pipeline Configured" >> README.md

# 3. Commit and push
git add README.md
git commit -m "test: Verify CI pipeline"
git push origin test/ci-setup

# 4. Create a Pull Request on GitHub
# 5. Watch the CI checks run automatically
```

### 2. Expected Results
- ✅ All 6 CI jobs should pass (if secrets are configured)
- ⚠️ Lighthouse may fail if performance targets aren't met (expected on first run)
- ⚠️ Security audit may show warnings (can be ignored for known safe dependencies)

### 3. Troubleshooting

**Backend tests fail with "Connection refused"**
- Services (PostgreSQL, Redis) may not be ready yet
- CI automatically retries with health checks

**Frontend build fails with "VITE_CESIUM_ION_TOKEN is not defined"**
- Add the secret in GitHub repository settings
- Re-run the workflow

**Docker build fails with "Authentication required"**
- Only needed for deployment workflow
- CI workflow builds locally without pushing

**Codecov upload fails**
- This is optional, workflow will continue
- Add `CODECOV_TOKEN` secret to enable

---

## Cost Estimate

### GitHub Actions Minutes
- **Public repositories**: ∞ unlimited minutes (FREE)
- **Private repositories**: 2,000 minutes/month free
- Estimated usage: ~150 minutes/week (well within free tier)

### External Services
- **Cesium Ion**: FREE tier (1 million tiles/month)
- **Codecov**: FREE for open source
- **Docker Hub**: FREE tier (unlimited public images)
- **Lighthouse CI**: FREE (uses temporary public storage)

**Total monthly cost**: $0 for public open-source projects

---

## Continuous Monitoring

### View CI Status
- Repository homepage shows badge: ![CI](https://github.com/USERNAME/REPO/workflows/CI%20Pipeline/badge.svg)
- Actions tab shows all workflow runs
- PR checks show inline in pull requests

### View Coverage Reports
- Codecov dashboard: https://codecov.io/gh/USERNAME/REPO
- Coverage badge: ![Coverage](https://codecov.io/gh/USERNAME/REPO/branch/main/graph/badge.svg)

### View Lighthouse Reports
- Temporary public storage link in workflow logs
- Can upgrade to permanent storage with Lighthouse CI server

---

## Next Steps

After setting up CI/CD:
1. ✅ Configure all required secrets
2. ✅ Enable Dependabot alerts
3. ✅ Set up branch protection rules
4. ✅ Run first CI pipeline test
5. ⏳ Proceed with Task 4.3: Nginx reverse proxy
6. ⏳ Set up monitoring (Task 4.4: Prometheus + Grafana)

---

## Support

If you encounter issues:
1. Check workflow logs in GitHub Actions tab
2. Review [GitHub Actions documentation](https://docs.github.com/en/actions)
3. Check [Lighthouse CI docs](https://github.com/GoogleChrome/lighthouse-ci)
4. Open an issue in the repository

---

**Last Updated**: 2025-10-31
**Related Files**:
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `.github/dependabot.yml`
- `lighthouserc.json`
