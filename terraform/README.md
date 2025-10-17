# 3D Scene Generator - Terraform Infrastructure

This directory contains the Terraform configuration for deploying the 3D Scene Generator infrastructure on AWS.

## Architecture Overview

The infrastructure includes:
- **AWS RDS PostgreSQL** - Database for storing projects, chat messages, and scene data
- **AWS Cognito** - User authentication and identity management
- **AWS ECS Fargate** - Container orchestration for the Django backend
- **Application Load Balancer** - Load balancing and SSL termination
- **Security Groups** - Network security configuration

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Terraform** >= 1.0 installed
3. **Docker** for building container images
4. **Cerebras API Key** for LLM integration

## Directory Structure

```
terraform/
├── main.tf                 # Main Terraform configuration
├── variables.tf            # Input variables
├── outputs.tf              # Output values
├── environments/           # Environment-specific configurations
│   ├── dev.tfvars
│   ├── staging.tfvars
│   └── prod.tfvars
├── modules/                # Terraform modules
│   ├── rds/               # PostgreSQL database module
│   ├── cognito/           # Authentication module
│   └── ecs/               # Container orchestration module
└── scripts/               # Deployment scripts
    ├── validate.sh        # Validation script
    ├── deploy.sh          # Deployment script
    └── setup-secrets.sh   # Secret management script
```

## Quick Start

### 1. Set up secrets

First, set up the required environment variables:

**On Linux/macOS:**
```bash
cd terraform
./scripts/setup-secrets.sh -e dev
source .env.dev
```

**On Windows:**
```powershell
cd terraform
# Manually create environment variables:
$env:TF_VAR_db_password = "your-secure-password"
$env:TF_VAR_django_secret_key = "your-django-secret-key"
$env:TF_VAR_cerebras_api_key = "your-cerebras-api-key"
```

### 2. Validate configuration

**On Linux/macOS:**
```bash
./scripts/validate.sh
```

**On Windows:**
```powershell
terraform init
terraform validate
terraform fmt -check=true
```

### 3. Deploy infrastructure

**On Linux/macOS:**
```bash
# Plan deployment
./scripts/deploy.sh -e dev -a plan

# Apply deployment
./scripts/deploy.sh -e dev -a apply
```

**On Windows:**
```powershell
# Plan deployment
terraform plan -var-file="environments/dev.tfvars" -out="dev.tfplan"

# Apply deployment
terraform apply "dev.tfplan"
```

## Environment Configuration

### Development (dev)
- **Database**: db.t3.micro with 20GB storage
- **ECS**: 1 task with minimal resources
- **Features**: Basic monitoring, 1-day backup retention

### Staging (staging)
- **Database**: db.t3.small with 50GB storage
- **ECS**: 2 tasks for load testing
- **Features**: Enhanced monitoring, 3-day backup retention

### Production (prod)
- **Database**: db.t3.medium with 100GB storage
- **ECS**: 3 tasks with high availability
- **Features**: Full monitoring, 7-day backup retention, deletion protection

## Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TF_VAR_db_password` | PostgreSQL database password | `SecurePassword123!` |
| `TF_VAR_django_secret_key` | Django application secret key | `django-insecure-xyz...` |
| `TF_VAR_cerebras_api_key` | Cerebras Cloud API key | `cb-xxx...` |

## Outputs

After deployment, Terraform will output important values:

- **Database endpoint** - For Django configuration
- **Cognito User Pool ID** - For frontend authentication
- **Load Balancer DNS** - For API access
- **Security Group IDs** - For additional configuration

## Security Considerations

1. **Database Security**
   - Database is only accessible from ECS tasks
   - Encryption at rest enabled
   - Automated backups configured

2. **Network Security**
   - Security groups restrict access to necessary ports only
   - ECS tasks run in private subnets with NAT gateway access

3. **Authentication**
   - Cognito provides secure user authentication
   - JWT tokens for API access
   - Advanced security features enabled

## Monitoring and Logging

- **CloudWatch Logs** - Application and container logs
- **Container Insights** - ECS cluster monitoring
- **Performance Insights** - Database performance monitoring (prod only)

## Disaster Recovery

- **Automated Backups** - Daily database backups
- **Point-in-time Recovery** - Available for production
- **Multi-AZ Deployment** - Automatic failover for production database

## Cost Optimization

- **Development**: ~$30-50/month
- **Staging**: ~$80-120/month  
- **Production**: ~$200-300/month

Costs include:
- RDS instance and storage
- ECS Fargate compute time
- Load Balancer hours
- Data transfer
- CloudWatch logs storage

## Troubleshooting

### Common Issues

1. **Terraform Init Fails**
   - Ensure AWS credentials are configured
   - Check internet connectivity for provider downloads

2. **Database Connection Issues**
   - Verify security group rules
   - Check database endpoint in ECS environment variables

3. **ECS Tasks Failing**
   - Check CloudWatch logs for application errors
   - Verify environment variables are set correctly

4. **Load Balancer Health Checks Failing**
   - Ensure Django health endpoint is implemented
   - Check security group allows ALB to reach ECS tasks

### Useful Commands

```bash
# View current state
terraform show

# List all resources
terraform state list

# Get specific output
terraform output load_balancer_dns_name

# Import existing resource
terraform import aws_instance.example i-1234567890abcdef0

# Refresh state
terraform refresh -var-file="environments/dev.tfvars"
```

## Cleanup

To destroy the infrastructure:

**On Linux/macOS:**
```bash
./scripts/deploy.sh -e dev -a destroy
```

**On Windows:**
```powershell
terraform plan -destroy -var-file="environments/dev.tfvars" -out="dev-destroy.tfplan"
terraform apply "dev-destroy.tfplan"
```

⚠️ **Warning**: This will permanently delete all resources and data!

## Support

For issues with this Terraform configuration:
1. Check the troubleshooting section above
2. Review AWS CloudWatch logs
3. Validate your AWS permissions
4. Ensure all required environment variables are set