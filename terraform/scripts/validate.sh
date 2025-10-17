#!/bin/bash

# Terraform validation script
set -e

echo "🔍 Validating Terraform configuration..."

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform is not installed. Please install Terraform first."
    exit 1
fi

# Initialize Terraform
echo "📦 Initializing Terraform..."
terraform init

# Validate configuration
echo "✅ Validating Terraform configuration..."
terraform validate

# Format check
echo "🎨 Checking Terraform formatting..."
terraform fmt -check=true -diff=true

# Security scan (if tfsec is available)
if command -v tfsec &> /dev/null; then
    echo "🔒 Running security scan with tfsec..."
    tfsec .
else
    echo "⚠️  tfsec not found. Consider installing it for security scanning."
fi

echo "✅ Terraform validation completed successfully!"