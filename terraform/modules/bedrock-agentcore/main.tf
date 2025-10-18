# ECR Repository for Agent Container Images
resource "aws_ecr_repository" "agents" {
  name                 = "${var.project_name}-${var.environment}-agents"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-agents"
    Environment = var.environment
    Project     = var.project_name
  }
}

# ECR Lifecycle Policy (separate resource)
resource "aws_ecr_lifecycle_policy" "agents" {
  repository = aws_ecr_repository.agents.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# ECR Repository Policy for Cross-Account Access (if needed)
resource "aws_ecr_repository_policy" "agents" {
  repository = aws_ecr_repository.agents.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowPull"
        Effect = "Allow"
        Principal = {
          Service = "bedrock-agentcore.amazonaws.com"
        }
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability"
        ]
      }
    ]
  })
}

# AgentCore Runtime - Create manually in AWS Console
# Use the following values when creating:
# 
# IAM Role ARN: ${aws_iam_role.agent_runtime_role.arn}
# Container URI: ${aws_ecr_repository.agents.repository_url}:latest
# 
# Environment Variables to configure manually:
# - LOCUSGEN_MODEL_ID: amazon.nova-pro-v1:0
# - LOCUSGEN_MAX_TOKENS: 4000
# - LOCUSGEN_TEMPERATURE: 0.7
# - MCP_SKETCHFAB_API_KEY: ${var.sketchfab_api_key}
# - AWS_REGION: ${var.aws_region}
# - S3_BUCKET_NAME: ${var.s3_bucket_name}
# - DYNAMODB_TABLE_NAME: ${var.dynamodb_table_name}
# - LOCUSGEN_ENVIRONMENT: ${var.environment}
# - LOCUSGEN_DEBUG_MODE: ${var.environment == "development" ? "true" : "false"}
