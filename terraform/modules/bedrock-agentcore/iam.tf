# IAM Role for AgentCore Runtime
resource "aws_iam_role" "agent_runtime_role" {
  name = "${var.project_name}-${var.environment}-agent-runtime-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "bedrock-agentcore.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-${var.environment}-agent-runtime-role"
    Environment = var.environment
    Project     = var.project_name
  }
}

# ECR Access Policy
resource "aws_iam_policy" "agent_runtime_ecr" {
  name        = "${var.project_name}-${var.environment}-agent-ecr-policy"
  description = "ECR access policy for AgentCore Runtime"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchCheckLayerAvailability"
        ]
        Resource = aws_ecr_repository.agents.arn
      }
    ]
  })
}

# Bedrock Access Policy
resource "aws_iam_policy" "agent_runtime_bedrock" {
  name        = "${var.project_name}-${var.environment}-agent-bedrock-policy"
  description = "Bedrock access policy for AgentCore Runtime"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = [
          "arn:aws:bedrock:${var.aws_region}::foundation-model/amazon.nova-pro-v1:0",
          "arn:aws:bedrock:${var.aws_region}::foundation-model/amazon.nova-lite-v1:0"
        ]
      }
    ]
  })
}

# S3 and DynamoDB Access Policy for CDN Processing
resource "aws_iam_policy" "agent_runtime_s3_dynamodb" {
  name        = "${var.project_name}-${var.environment}-agent-s3-dynamodb-policy"
  description = "S3 and DynamoDB access policy for CDN processing"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${var.s3_bucket_arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = var.s3_bucket_arn
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = var.dynamodb_table_arn
      }
    ]
  })
}

# CloudWatch Logs Policy for AgentCore Runtime
resource "aws_iam_policy" "agent_runtime_cloudwatch" {
  name        = "${var.project_name}-${var.environment}-agent-cloudwatch-policy"
  description = "CloudWatch logs policy for AgentCore Runtime"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Resource = [
          "arn:aws:logs:${var.aws_region}:*:log-group:/aws/bedrock-agentcore/runtimes/*",
          "arn:aws:logs:${var.aws_region}:*:log-group:/aws/bedrock-agentcore/runtimes/*:*"
        ]
      }
    ]
  })
}

# Attach Policies to Role
resource "aws_iam_role_policy_attachment" "agent_runtime_ecr" {
  role       = aws_iam_role.agent_runtime_role.name
  policy_arn = aws_iam_policy.agent_runtime_ecr.arn
}

resource "aws_iam_role_policy_attachment" "agent_runtime_bedrock" {
  role       = aws_iam_role.agent_runtime_role.name
  policy_arn = aws_iam_policy.agent_runtime_bedrock.arn
}

resource "aws_iam_role_policy_attachment" "agent_runtime_s3_dynamodb" {
  role       = aws_iam_role.agent_runtime_role.name
  policy_arn = aws_iam_policy.agent_runtime_s3_dynamodb.arn
}

resource "aws_iam_role_policy_attachment" "agent_runtime_cloudwatch" {
  role       = aws_iam_role.agent_runtime_role.name
  policy_arn = aws_iam_policy.agent_runtime_cloudwatch.arn
}