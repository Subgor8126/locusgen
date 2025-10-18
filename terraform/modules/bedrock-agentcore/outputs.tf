output "ecr_repository_url" {
  description = "URL of the ECR repository for agent containers"
  value       = aws_ecr_repository.agents.repository_url
}

output "ecr_repository_name" {
  description = "Name of the ECR repository"
  value       = aws_ecr_repository.agents.name
}

output "agent_runtime_role_arn" {
  description = "ARN of the IAM role for AgentCore Runtime (use this when creating manually)"
  value       = aws_iam_role.agent_runtime_role.arn
}

output "manual_setup_values" {
  description = "Values needed for manual AgentCore setup"
  value = {
    iam_role_arn = aws_iam_role.agent_runtime_role.arn
    container_uri = "${aws_ecr_repository.agents.repository_url}:latest"
    s3_bucket_name = var.s3_bucket_name
    dynamodb_table_name = var.dynamodb_table_name
    sketchfab_api_key = var.sketchfab_api_key
    aws_region = var.aws_region
    environment = var.environment
    # Use these default values in AgentCore Console:
    model_id = "amazon.nova-pro-v1:0"
    max_tokens = "4000"
    temperature = "0.7"
  }
}