#!/bin/bash

# Deploy Asset CDN infrastructure

set -e

echo "🚀 Deploying Asset CDN infrastructure..."

# Check if required variables are set
if [ -z "$SKETCHFAB_API_KEY" ]; then
    echo "❌ Error: SKETCHFAB_API_KEY environment variable is required"
    exit 1
fi

# Package Lambda function
echo "📦 Packaging Lambda function..."
cd lambda/asset_processor
zip -r ../../modules/asset-cdn/asset_processor.zip .
cd ../..

# Initialize Terraform
echo "🔧 Initializing Terraform..."
terraform init

# Plan deployment
echo "📋 Planning deployment..."
terraform plan \
    -var="sketchfab_api_key=$SKETCHFAB_API_KEY" \
    -var="environment=dev" \
    -var="project_name=locusgen"

# Apply deployment
echo "🚀 Deploying infrastructure..."
terraform apply \
    -var="sketchfab_api_key=$SKETCHFAB_API_KEY" \
    -var="environment=dev" \
    -var="project_name=locusgen" \
    -auto-approve

# Get outputs
echo "📄 Getting deployment outputs..."
LAMBDA_FUNCTION_NAME=$(terraform output -raw asset_cdn_lambda_function_name)
S3_BUCKET_NAME=$(terraform output -raw asset_cdn_s3_bucket_name)

echo "✅ Deployment complete!"
echo "Lambda Function: $LAMBDA_FUNCTION_NAME"
echo "S3 Bucket: $S3_BUCKET_NAME"
echo ""
echo "Add these to your Django .env file:"
echo "ASSET_LAMBDA_FUNCTION=$LAMBDA_FUNCTION_NAME"
echo "AWS_STORAGE_BUCKET_NAME=$S3_BUCKET_NAME"