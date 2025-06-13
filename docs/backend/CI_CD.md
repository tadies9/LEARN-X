# CI/CD Setup for LEARN-X

## Overview

This document describes the CI/CD pipeline configuration for the LEARN-X platform.

## Local Development Setup

### Pre-commit Hooks

We use Husky to run checks before commits. The following checks are performed:

1. **Linting**: ESLint for code quality
2. **Type Checking**: TypeScript compilation checks
3. **Tests**: Unit and integration tests

To skip hooks temporarily (not recommended):

```bash
git commit --no-verify -m "your message"
```

### Running Checks Manually

```bash
# Run all pre-commit checks
npm run pre-commit

# Run individual checks
npm run lint:all
npm run type-check:all
npm run test:ci
```

## GitHub Actions Workflow

The CI/CD pipeline runs on:

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

### Pipeline Steps

1. **Code Quality Checks**

   - ESLint
   - TypeScript type checking

2. **Backend Tests**

   - Unit tests
   - Build verification

3. **Frontend Tests**

   - Unit tests
   - Build verification

4. **Docker Build Test**
   - Validates Docker images build successfully

## Test Scripts

### API Integration Tests

```bash
./API_INTEGRATION_TESTS.sh
```

Tests API endpoints for proper responses and error handling.

### Edge Case Tests

```bash
./EDGE_CASE_TESTS.sh
```

Tests handling of edge cases like large files, special characters, etc.

### Security Tests

```bash
./SECURITY_TESTS.sh
```

Tests for common security vulnerabilities:

- SQL injection
- XSS
- CORS configuration
- JWT validation

### Performance Tests

```bash
./PERFORMANCE_TEST.sh
```

Tests API performance:

- Response times
- Concurrent request handling
- Load testing

## Environment Setup

### Backend (.env)

Copy `backend/.env.example` to `backend/.env` and fill in values:

```bash
cp backend/.env.example backend/.env
```

### Frontend (.env.local)

Copy `frontend/.env.example` to `frontend/.env.local`:

```bash
cp frontend/.env.example frontend/.env.local
```

## Docker Testing

### Run tests in Docker

```bash
npm run docker:test
```

This uses `docker-compose.test.yml` to run tests in containers.

## Deployment

### Production Build

```bash
npm run build
npm run docker:prod:build
```

### Deploy Commands

```bash
# Deploy to production
npm run deploy:prod

# Deploy to staging
npm run deploy:staging
```

## Troubleshooting

### TypeScript Errors in Tests

- Backend tests use `tsconfig.build.json` which excludes test files
- Frontend tests include `@testing-library/jest-dom` types

### Linting Issues

- Run `npm run lint:fix` to auto-fix issues
- Check `.eslintrc.json` for rule configuration

### Test Failures

- Check test logs for specific errors
- Ensure environment variables are set correctly
- Verify database connections

## Best Practices

1. **Always run pre-commit checks** before pushing
2. **Write tests** for new features
3. **Keep dependencies updated** with security patches
4. **Document environment variables** in .env.example files
5. **Use meaningful commit messages** following conventional commits

## Monitoring

- GitHub Actions dashboard for CI/CD status
- Docker logs for container health
- Application logs in `backend/logs/`# Testing CI/CD pipeline
