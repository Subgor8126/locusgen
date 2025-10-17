# AWS Resources Configuration

## Created Infrastructure

This document contains the AWS resource details created by Terraform for the LocusGen project.

### Cognito Authentication

- **User Pool ID**: `us-east-1_t2gzoFufU`
- **App Client ID**: `168cbinct3l6fjrvta5j5pgfe7`
- **Identity Pool ID**: `us-east-1:61bdc588-1b97-4eba-ade0-53f826b9f8e5`
- **Domain**: `locusgen-dev`
- **Hosted UI URL**: `https://locusgen-dev.auth.us-east-1.amazoncognito.com`
- **Region**: `us-east-1`

### Asset CDN

- **S3 Bucket**: `locusgen-3d-models-dev`
- **DynamoDB Table**: `locusgen-assets-dev`
- **Region**: `us-east-1`

## Environment Configuration

### Backend (.env)
```bash
# AWS Cognito Configuration
AWS_COGNITO_USER_POOL_ID=us-east-1_t2gzoFufU
AWS_COGNITO_APP_CLIENT_ID=168cbinct3l6fjrvta5j5pgfe7
AWS_REGION=us-east-1
```

### Frontend (.env.local)
```bash
# AWS Cognito Configuration
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_t2gzoFufU
NEXT_PUBLIC_COGNITO_CLIENT_ID=168cbinct3l6fjrvta5j5pgfe7
NEXT_PUBLIC_COGNITO_DOMAIN=locusgen-dev.auth.us-east-1.amazoncognito.com
NEXT_PUBLIC_COGNITO_REGION=us-east-1
```

## Testing Authentication

### 1. Cognito Hosted UI
Visit: `https://locusgen-dev.auth.us-east-1.amazoncognito.com/login?client_id=168cbinct3l6fjrvta5j5pgfe7&response_type=code&scope=email+openid+profile&redirect_uri=http://localhost:3000/auth/callback`

### 2. Backend API Endpoints
- **Auth Status**: `GET http://localhost:8000/api/auth/status/`
- **Token Validation**: `POST http://localhost:8000/api/auth/validate/`
- **User Profile**: `GET http://localhost:8000/api/auth/profile/`

### 3. Test with cURL
```bash
# Check auth status (anonymous)
curl http://localhost:8000/api/auth/status/

# Validate JWT token (replace with real token)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -X POST http://localhost:8000/api/auth/validate/
```

## Terraform Commands

### View Current Resources
```bash
cd terraform
terraform output
```

### Update Infrastructure
```bash
cd terraform
terraform plan -var="environment=dev"
terraform apply -var="environment=dev"
```

### Destroy Resources (if needed)
```bash
cd terraform
terraform destroy -var="environment=dev"
```

## Next Steps

1. ✅ **Infrastructure Created** - Cognito and S3/DynamoDB ready
2. ✅ **Backend Configured** - Django authentication system updated
3. ✅ **Frontend Configured** - Next.js environment variables updated
4. 🔄 **Test Authentication** - Create users and test JWT validation
5. 🔄 **Integrate Frontend** - Connect React components to Cognito
6. 🔄 **Deploy Application** - Add RDS and ECS modules when ready

## Troubleshooting

### Common Issues
- **Invalid token errors**: Check User Pool ID and App Client ID match
- **CORS issues**: Verify callback URLs in Cognito match frontend URLs
- **Connection errors**: Ensure AWS credentials are configured

### Useful AWS CLI Commands
```bash
# List user pools
aws cognito-idp list-user-pools --max-results 10

# Get user pool details
aws cognito-idp describe-user-pool --user-pool-id us-east-1_t2gzoFufU

# List S3 buckets
aws s3 ls

# List DynamoDB tables
aws dynamodb list-tables
```