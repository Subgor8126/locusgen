#!/bin/bash

# Terraform deployment script
set -e

# Default values
ENVIRONMENT=""
ACTION="plan"
AUTO_APPROVE=false

# Function to display usage
usage() {
    echo "Usage: $0 -e ENVIRONMENT [-a ACTION] [-y]"
    echo "  -e ENVIRONMENT  Environment to deploy (dev, staging, prod)"
    echo "  -a ACTION       Terraform action (plan, apply, destroy) [default: plan]"
    echo "  -y              Auto-approve (skip confirmation for apply/destroy)"
    echo ""
    echo "Examples:"
    echo "  $0 -e dev                    # Plan deployment for dev environment"
    echo "  $0 -e staging -a apply       # Apply deployment for staging environment"
    echo "  $0 -e prod -a apply -y       # Apply deployment for prod with auto-approve"
    exit 1
}

# Parse command line arguments
while getopts "e:a:yh" opt; do
    case $opt in
        e)
            ENVIRONMENT="$OPTARG"
            ;;
        a)
            ACTION="$OPTARG"
            ;;
        y)
            AUTO_APPROVE=true
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

# Validate action
if [[ ! "$ACTION" =~ ^(plan|apply|destroy)$ ]]; then
    echo "❌ Action must be one of: plan, apply, destroy"
    exit 1
fi

# Check if environment file exists
TFVARS_FILE="environments/${ENVIRONMENT}.tfvars"
if [ ! -f "$TFVARS_FILE" ]; then
    echo "❌ Environment file not found: $TFVARS_FILE"
    exit 1
fi

echo "🚀 Starting Terraform deployment..."
echo "   Environment: $ENVIRONMENT"
echo "   Action: $ACTION"
echo "   Variables file: $TFVARS_FILE"

# Check required environment variables
required_vars=("TF_VAR_db_password" "TF_VAR_django_secret_key" "TF_VAR_cerebras_api_key")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set"
        echo "   Please set it before running this script:"
        echo "   export $var='your-value'"
        exit 1
    fi
done

# Initialize Terraform
echo "📦 Initializing Terraform..."
terraform init

# Run validation
echo "✅ Validating configuration..."
terraform validate

# Execute the requested action
case $ACTION in
    plan)
        echo "📋 Planning deployment for $ENVIRONMENT..."
        terraform plan -var-file="$TFVARS_FILE" -out="$ENVIRONMENT.tfplan"
        echo "✅ Plan completed. Review the output above."
        echo "   To apply: $0 -e $ENVIRONMENT -a apply"
        ;;
    apply)
        if [ -f "$ENVIRONMENT.tfplan" ]; then
            echo "📦 Applying existing plan for $ENVIRONMENT..."
            if [ "$AUTO_APPROVE" = true ]; then
                terraform apply "$ENVIRONMENT.tfplan"
            else
                terraform apply "$ENVIRONMENT.tfplan"
            fi
        else
            echo "📦 Planning and applying for $ENVIRONMENT..."
            if [ "$AUTO_APPROVE" = true ]; then
                terraform apply -var-file="$TFVARS_FILE" -auto-approve
            else
                terraform apply -var-file="$TFVARS_FILE"
            fi
        fi
        echo "✅ Deployment completed successfully!"
        ;;
    destroy)
        echo "🗑️  Planning destruction for $ENVIRONMENT..."
        terraform plan -destroy -var-file="$TFVARS_FILE" -out="$ENVIRONMENT-destroy.tfplan"
        
        if [ "$AUTO_APPROVE" = true ]; then
            echo "🗑️  Destroying infrastructure for $ENVIRONMENT..."
            terraform apply "$ENVIRONMENT-destroy.tfplan"
        else
            echo "⚠️  This will destroy all infrastructure for $ENVIRONMENT!"
            read -p "Are you sure you want to continue? (yes/no): " confirm
            if [ "$confirm" = "yes" ]; then
                terraform apply "$ENVIRONMENT-destroy.tfplan"
            else
                echo "❌ Destruction cancelled"
                exit 1
            fi
        fi
        echo "✅ Infrastructure destroyed successfully!"
        ;;
esac

# Clean up plan files
if [ -f "$ENVIRONMENT.tfplan" ] && [ "$ACTION" = "apply" ]; then
    rm "$ENVIRONMENT.tfplan"
fi

if [ -f "$ENVIRONMENT-destroy.tfplan" ] && [ "$ACTION" = "destroy" ]; then
    rm "$ENVIRONMENT-destroy.tfplan"
fi

echo "🎉 Terraform $ACTION completed for $ENVIRONMENT environment!"