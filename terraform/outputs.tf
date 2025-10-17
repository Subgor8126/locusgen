# Cognito outputs
output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = module.cognito.user_pool_id
}

output "cognito_user_pool_client_id" {
  description = "Cognito User Pool Client ID"
  value       = module.cognito.user_pool_client_id
}

output "cognito_identity_pool_id" {
  description = "Cognito Identity Pool ID"
  value       = module.cognito.identity_pool_id
}

output "cognito_user_pool_domain" {
  description = "Cognito User Pool Domain"
  value       = module.cognito.user_pool_domain
}

# Asset CDN outputs
output "asset_cdn_s3_bucket_name" {
  description = "S3 bucket name for 3D models"
  value       = module.asset_cdn.s3_bucket_name
}

output "dynamodb_table_name" {
  description = "DynamoDB table name for assets"
  value       = module.asset_cdn.dynamodb_table_name
}

# Bedrock AgentCore outputs
output "agent_runtime_arn" {
  description = "ARN of the Bedrock AgentCore Runtime"
  value       = module.bedrock_agentcore.agent_runtime_arn
}

output "ecr_repository_url" {
  description = "URL of the ECR repository for agent containers"
  value       = module.bedrock_agentcore.ecr_repository_url
}

output "ecr_repository_name" {
  description = "Name of the ECR repository"
  value       = module.bedrock_agentcore.ecr_repository_name
}