# Deploy Cognito infrastructure only
# This script creates AWS Cognito resources for authentication

$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying Cognito infrastructure..." -ForegroundColor Green

# Check if AWS CLI is configured
try {
    aws sts get-caller-identity | Out-Null
} catch {
    Write-Host "❌ AWS CLI not configured. Please run 'aws configure' first." -ForegroundColor Red
    exit 1
}

# Initialize Terraform
Write-Host "📦 Initializing Terraform..." -ForegroundColor Yellow
terraform init

# Plan the deployment
Write-Host "📋 Planning Cognito deployment..." -ForegroundColor Yellow
terraform plan -var-file="environments/dev.tfvars" -target="module.cognito" -out=cognito.tfplan

# Ask for confirmation
$confirmation = Read-Host "🤔 Do you want to apply this plan? (y/N)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "❌ Deployment cancelled." -ForegroundColor Red
    exit 1
}

# Apply the plan
Write-Host "🔨 Applying Cognito infrastructure..." -ForegroundColor Yellow
terraform apply cognito.tfplan

# Clean up plan file
Remove-Item -Path "cognito.tfplan" -Force -ErrorAction SilentlyContinue

Write-Host "✅ Cognito infrastructure deployed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Cognito Configuration:" -ForegroundColor Cyan

$userPoolId = terraform output -raw cognito_user_pool_id
$clientId = terraform output -raw cognito_client_id
$domain = terraform output -raw cognito_domain
$region = terraform output -raw cognito_region

Write-Host "User Pool ID: $userPoolId" -ForegroundColor White
Write-Host "Client ID: $clientId" -ForegroundColor White
Write-Host "Domain: $domain" -ForegroundColor White
Write-Host "Region: $region" -ForegroundColor White
Write-Host ""

Write-Host "🔧 Update your environment files with these values:" -ForegroundColor Cyan
Write-Host "Backend (.env):" -ForegroundColor Yellow
Write-Host "AWS_COGNITO_USER_POOL_ID=$userPoolId" -ForegroundColor White
Write-Host "AWS_COGNITO_CLIENT_ID=$clientId" -ForegroundColor White
Write-Host "AWS_COGNITO_REGION=$region" -ForegroundColor White
Write-Host ""
Write-Host "Frontend (.env.local):" -ForegroundColor Yellow
Write-Host "NEXT_PUBLIC_COGNITO_USER_POOL_ID=$userPoolId" -ForegroundColor White
Write-Host "NEXT_PUBLIC_COGNITO_CLIENT_ID=$clientId" -ForegroundColor White
Write-Host "NEXT_PUBLIC_COGNITO_DOMAIN=$domain" -ForegroundColor White
Write-Host "NEXT_PUBLIC_COGNITO_REGION=$region" -ForegroundColor White