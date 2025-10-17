#!/bin/bash

# Deploy Cognito infrastructure only
# This script creates AWS Cognito resources for authentication

set -e

echo "🚀 Deploying Cognito infrastructure..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Initialize Terraform
echo "📦 Initializing Terraform..."
terraform init

# Plan the deployment
echo "📋 Planning Cognito deployment..."
terraform plan -var-file="environments/dev.tfvars" -target="module.cognito" -out=cognito.tfplan

# Ask for confirmation
read -p "🤔 Do you want to apply this plan? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled."
    exit 1
fi

# Apply the plan
echo "🔨 Applying Cognito infrastructure..."
terraform apply cognito.tfplan

# Clean up plan file
rm -f cognito.tfplan

echo "✅ Cognito infrastructure deployed successfully!"
echo ""
echo "📋 Cognito Configuration:"
echo "User Pool ID: $(terraform output -raw cognito_user_pool_id)"
echo "Client ID: $(terraform output -raw cognito_client_id)"
echo "Domain: $(terraform output -raw cognito_domain)"
echo "Region: $(terraform output -raw cognito_region)"
echo ""
echo "🔧 Update your environment files with these values:"
echo "Backend (.env):"
echo "AWS_COGNITO_USER_POOL_ID=$(terraform output -raw cognito_user_pool_id)"
echo "AWS_COGNITO_CLIENT_ID=$(terraform output -raw cognito_client_id)"
echo "AWS_COGNITO_REGION=$(terraform output -raw cognito_region)"
echo ""
echo "Frontend (.env.local):"
echo "NEXT_PUBLIC_COGNITO_USER_POOL_ID=$(terraform output -raw cognito_user_pool_id)"
echo "NEXT_PUBLIC_COGNITO_CLIENT_ID=$(terraform output -raw cognito_client_id)"
echo "NEXT_PUBLIC_COGNITO_DOMAIN=$(terraform output -raw cognito_domain)"
echo "NEXT_PUBLIC_COGNITO_REGION=$(terraform output -raw cognito_region)"