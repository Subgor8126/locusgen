#!/bin/bash

# Script to help set up required environment variables for Terraform deployment
set -e

ENVIRONMENT=""

# Function to display usage
usage() {
    echo "Usage: $0 -e ENVIRONMENT"
    echo "  -e ENVIRONMENT  Environment to set up secrets for (dev, staging, prod)"
    echo ""
    echo "This script will guide you through setting up the required environment variables."
    exit 1
}

# Parse command line arguments
while getopts "e:h" opt; do
    case $opt in
        e)
            ENVIRONMENT="$OPTARG"
            ;;
        h)
            usage
            ;;
        \?)
            echo "Invalid option: -$OPTARG" >&2
            usage
            ;;
    esac
done

# Validate required parameters
if [ -z "$ENVIRONMENT" ]; then
    echo "❌ Environment is required"
    usage
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo "❌ Environment must be one of: dev, staging, prod"
    exit 1
fi

echo "🔐 Setting up secrets for $ENVIRONMENT environment"
echo ""

# Generate random passwords/keys if not provided
generate_random() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

echo "📝 Please provide the following values (press Enter to generate random values where applicable):"
echo ""

# Database password
read -s -p "Database password (leave empty to generate): " db_password
echo ""
if [ -z "$db_password" ]; then
    db_password=$(generate_random)
    echo "✅ Generated random database password"
fi

# Django secret key
read -s -p "Django secret key (leave empty to generate): " django_secret
echo ""
if [ -z "$django_secret" ]; then
    django_secret=$(generate_random)
    echo "✅ Generated random Django secret key"
fi

# Cerebras API key
read -s -p "Cerebras API key (required): " cerebras_key
echo ""
if [ -z "$cerebras_key" ]; then
    echo "❌ Cerebras API key is required"
    exit 1
fi

# Create environment file
ENV_FILE=".env.$ENVIRONMENT"
cat > "$ENV_FILE" << EOF
# Terraform environment variables for $ENVIRONMENT
export TF_VAR_db_password="$db_password"
export TF_VAR_django_secret_key="$django_secret"
export TF_VAR_cerebras_api_key="$cerebras_key"
EOF

echo ""
echo "✅ Environment variables saved to $ENV_FILE"
echo ""
echo "To use these variables, run:"
echo "   source $ENV_FILE"
echo ""
echo "Then you can deploy with:"
echo "   ./scripts/deploy.sh -e $ENVIRONMENT -a plan"
echo ""
echo "⚠️  Keep this file secure and do not commit it to version control!"

# Add to .gitignore if it exists
if [ -f ".gitignore" ]; then
    if ! grep -q "\.env\." .gitignore; then
        echo ".env.*" >> .gitignore
        echo "✅ Added .env.* to .gitignore"
    fi
fi