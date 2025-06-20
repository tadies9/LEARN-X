#!/bin/bash

# LEARN-X Sentry Setup Script
# This script helps configure Sentry across all services

set -e

echo "🚀 LEARN-X Sentry Setup"
echo "======================"
echo ""

# Check if we're in the project root
if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "frontend" ] || [ ! -d "python-ai-service" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Function to update or add environment variable
update_env_var() {
    local file=$1
    local key=$2
    local value=$3
    
    if [ -f "$file" ]; then
        if grep -q "^$key=" "$file"; then
            # Update existing value
            sed -i.bak "s|^$key=.*|$key=$value|" "$file"
            rm "${file}.bak"
        else
            # Add new value
            echo "$key=$value" >> "$file"
        fi
    else
        echo "$key=$value" > "$file"
    fi
}

# Get Sentry DSN from user
echo "To set up Sentry, you need to:"
echo "1. Go to https://sentry.io/ and sign in (or create an account)"
echo "2. Create a new project or select an existing one"
echo "3. Go to Settings > Projects > [Your Project] > Client Keys (DSN)"
echo "4. Copy your DSN"
echo ""
read -p "Enter your Sentry DSN: " SENTRY_DSN

if [ -z "$SENTRY_DSN" ]; then
    echo "❌ Error: Sentry DSN is required"
    exit 1
fi

# Get project slug for frontend
echo ""
echo "For the frontend, you'll also need:"
echo "1. Your Sentry organization slug (from your Sentry URL: https://[org-slug].sentry.io)"
echo "2. Your project slug (from Settings > Projects > [Your Project])"
echo ""
read -p "Enter your Sentry organization slug: " SENTRY_ORG
read -p "Enter your Sentry project slug: " SENTRY_PROJECT

# Optional: Get auth token for source maps
echo ""
echo "Optional: For source map uploads (better error tracking in production):"
echo "1. Go to Settings > Auth Tokens"
echo "2. Create a new auth token with 'project:releases' scope"
echo ""
read -p "Enter your Sentry auth token (press Enter to skip): " SENTRY_AUTH_TOKEN

echo ""
echo "📝 Updating environment files..."

# Update Backend .env
if [ ! -f "backend/.env" ] && [ -f "backend/.env.example" ]; then
    cp backend/.env.example backend/.env
fi
update_env_var "backend/.env" "SENTRY_DSN" "$SENTRY_DSN"
update_env_var "backend/.env" "SENTRY_ENABLED" "true"
echo "✅ Updated backend/.env"

# Update Python AI Service .env
update_env_var "python-ai-service/.env" "SENTRY_DSN" "$SENTRY_DSN"
echo "✅ Updated python-ai-service/.env"

# Update Frontend .env.local
if [ ! -f "frontend/.env.local" ]; then
    touch frontend/.env.local
fi
update_env_var "frontend/.env.local" "NEXT_PUBLIC_SENTRY_DSN" "$SENTRY_DSN"
update_env_var "frontend/.env.local" "SENTRY_ORG" "$SENTRY_ORG"
update_env_var "frontend/.env.local" "SENTRY_PROJECT" "$SENTRY_PROJECT"
if [ ! -z "$SENTRY_AUTH_TOKEN" ]; then
    update_env_var "frontend/.env.local" "SENTRY_AUTH_TOKEN" "$SENTRY_AUTH_TOKEN"
fi
echo "✅ Updated frontend/.env.local"

echo ""
echo "🎯 Sentry Configuration Summary:"
echo "================================"
echo "DSN: $SENTRY_DSN"
echo "Organization: $SENTRY_ORG"
echo "Project: $SENTRY_PROJECT"
echo ""
echo "✅ Environment files updated successfully!"
echo ""
echo "Next steps:"
echo "1. Restart all services to apply the new configuration"
echo "2. Test error reporting with the test commands below"
echo ""
echo "📧 Test Commands:"
echo ""
echo "Backend (Node.js):"
echo "  curl http://localhost:3001/api/v1/test/sentry-error"
echo ""
echo "Frontend (Next.js):"
echo "  Visit http://localhost:3000 and check console for Sentry initialization"
echo ""
echo "Python AI Service:"
echo "  curl http://localhost:8001/api/v1/test/sentry-error"
echo ""
echo "💡 Tip: Check your Sentry dashboard to see if test errors appear!"