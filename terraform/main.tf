terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Cognito authentication
module "cognito" {
  source = "./modules/cognito"

  environment    = var.environment
  user_pool_name = "${var.project_name}-${var.environment}-users"
  domain_prefix  = "${var.project_name}-${var.environment}"
}

# Asset CDN (S3 + DynamoDB only - Lambda removed)
module "asset_cdn" {
  source = "./modules/asset-cdn"
  
  project_name = var.project_name
  environment  = var.environment
}

# Bedrock AgentCore for Agent System
module "bedrock_agentcore" {
  source = "./modules/bedrock-agentcore"
  
  project_name        = var.project_name
  environment         = var.environment
  aws_region          = var.aws_region
  sketchfab_api_key   = var.sketchfab_api_key
  s3_bucket_name      = module.asset_cdn.s3_bucket_name
  s3_bucket_arn       = module.asset_cdn.s3_bucket_arn
  dynamodb_table_name = module.asset_cdn.dynamodb_table_name
  dynamodb_table_arn  = module.asset_cdn.dynamodb_table_arn
}
