# PowerShell script to deploy Asset CDN infrastructure

Write-Host "🚀 Deploying Asset CDN infrastructure..." -ForegroundColor Green

# Check if required variables are set
if (-not $env:SKETCHFAB_API_KEY) {
    Write-Host "❌ Error: SKETCHFAB_API_KEY environment variable is required" -ForegroundColor Red
    Write-Host "Set it with: `$env:SKETCHFAB_API_KEY = 'your-api-key'" -ForegroundColor Yellow
    exit 1
}

# Package Lambda function
Write-Host "📦 Packaging Lambda function..." -ForegroundColor Blue
Set-Location lambda/asset_processor
Compress-Archive -Path * -DestinationPath "../../modules/asset-cdn/asset_processor.zip" -Force
Set-Location ../..

# Check if Terraform is initialized
if (-not (Test-Path ".terraform")) {
    Write-Host "🔧 Initializing Terraform..." -ForegroundColor Blue
    terraform init
} else {
    Write-Host "✅ Terraform already initialized" -ForegroundColor Green
}

# Plan deployment (Asset CDN only)
Write-Host "📋 Planning Asset CDN deployment..." -ForegroundColor Blue
terraform plan `
    -target="module.asset_cdn" `
    -var-file="asset-cdn.tfvars"

# Ask for confirmation
$confirmation = Read-Host "Do you want to proceed with deployment? (y/N)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
    exit 0
}

# Apply deployment (Asset CDN only)
Write-Host "🚀 Deploying Asset CDN infrastructure..." -ForegroundColor Green
terraform apply `
    -target="module.asset_cdn" `
    -var-file="asset-cdn.tfvars" `
    -auto-approve

# Get outputs
Write-Host "📄 Getting deployment outputs..." -ForegroundColor Blue
$lambdaFunction = terraform output -raw asset_cdn_lambda_function_name
$s3Bucket = terraform output -raw asset_cdn_s3_bucket_name

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "Lambda Function: $lambdaFunction" -ForegroundColor Cyan
Write-Host "S3 Bucket: $s3Bucket" -ForegroundColor Cyan

# Update backend .env file automatically
$envFile = "../backend/.env"
if (Test-Path $envFile) {
    Write-Host "📝 Updating backend/.env file..." -ForegroundColor Blue
    
    # Read current .env content
    $envContent = Get-Content $envFile
    
    # Update or add the Lambda function name
    $envContent = $envContent | Where-Object { $_ -notmatch "^ASSET_LAMBDA_FUNCTION=" }
    $envContent += "ASSET_LAMBDA_FUNCTION=$lambdaFunction"
    
    # Write back to file
    $envContent | Set-Content $envFile
    
    Write-Host "✅ Updated backend/.env with new values" -ForegroundColor Green
    Write-Host "🔄 Restart your Django server to pick up the changes" -ForegroundColor Yellow
} else {
    Write-Host "⚠️  backend/.env file not found" -ForegroundColor Yellow
    Write-Host "Add this to your Django .env file:" -ForegroundColor Yellow
    Write-Host "ASSET_LAMBDA_FUNCTION=$lambdaFunction" -ForegroundColor White
}