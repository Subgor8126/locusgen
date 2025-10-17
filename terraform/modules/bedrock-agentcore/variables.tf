variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment (development, staging, production)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "model_id" {
  description = "Bedrock model ID for the agent"
  type        = string
  default     = "amazon.nova-pro-v1:0"
}

variable "max_tokens" {
  description = "Maximum tokens for model responses"
  type        = string
  default     = "4000"
}

variable "temperature" {
  description = "Model temperature for response generation"
  type        = string
  default     = "0.7"
}

variable "sketchfab_api_key" {
  description = "Sketchfab API key for MCP server"
  type        = string
  sensitive   = true
}

variable "s3_bucket_name" {
  description = "S3 bucket name for asset storage"
  type        = string
}

variable "s3_bucket_arn" {
  description = "S3 bucket ARN for asset storage"
  type        = string
}

variable "dynamodb_table_name" {
  description = "DynamoDB table name for asset metadata"
  type        = string
}

variable "dynamodb_table_arn" {
  description = "DynamoDB table ARN for asset metadata"
  type        = string
}