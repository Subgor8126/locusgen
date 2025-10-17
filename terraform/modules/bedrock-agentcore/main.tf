# ECR Repository for Agent Container Images
resource "aws_ecr_repository" "agents" {
  name                 = "${var.project_name}-${var.environment}-agents"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  lifecycle_policy {
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

  tags = {
    Name        = "${var.project_name}-${var.environment}-agents"
    Environment = var.environment
    Project     = var.project_name
  }
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

# Bedrock AgentCore Runtime
resource "aws_bedrockagentcore_agent_runtime" "locusgen_agent" {
  agent_runtime_name = "${var.project_name}-${var.environment}-agent"
  description        = "LocusGen 3D Scene Generation Agent System with Strands Agents, Sketchfab MCP integration, and CDN processing"
  role_arn          = aws_iam_role.agent_runtime_role.arn

  agent_runtime_artifact {
    container_configuration {
      container_uri = "${aws_ecr_repository.agents.repository_url}:latest"
    }
  }

  environment_variables = {
    LOCUSGEN_MODEL_ID       = var.model_id
    LOCUSGEN_MAX_TOKENS     = var.max_tokens
    LOCUSGEN_TEMPERATURE    = var.temperature
    MCP_SKETCHFAB_API_KEY  = var.sketchfab_api_key
    AWS_REGION             = var.aws_region
    S3_BUCKET_NAME         = var.s3_bucket_name
    DYNAMODB_TABLE_NAME    = var.dynamodb_table_name
    LOCUSGEN_ENVIRONMENT   = var.environment
    LOCUSGEN_DEBUG_MODE    = var.environment == "development" ? "true" : "false"
  }

  network_configuration {
    network_mode = "PUBLIC"
  }

  protocol_configuration {
    server_protocol = "HTTP"
  }

  lifecycle_configuration {
    idle_runtime_session_timeout = 300  # 5 minutes
    max_lifetime                 = 3600 # 1 hour
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-agent"
    Environment = var.environment
    Project     = var.project_name
  }

  depends_on = [
    aws_iam_role_policy_attachment.agent_runtime_ecr,
    aws_iam_role_policy_attachment.agent_runtime_bedrock,
    aws_iam_role_policy_attachment.agent_runtime_s3_dynamodb
  ]
}