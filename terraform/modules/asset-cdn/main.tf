# S3 + DynamoDB for asset CDN

# S3 bucket for storing 3D models
resource "aws_s3_bucket" "models" {
  bucket = "${var.project_name}-3d-models-${var.environment}"
}

resource "aws_s3_bucket_public_access_block" "models" {
  bucket = aws_s3_bucket.models.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "models_public" {
  bucket = aws_s3_bucket.models.id
  depends_on = [aws_s3_bucket_public_access_block.models]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.models.arn}/*"
      }
    ]
  })
}

# CORS configuration for S3 bucket
resource "aws_s3_bucket_cors_configuration" "models_cors" {
  bucket = aws_s3_bucket.models.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# DynamoDB table for asset metadata
resource "aws_dynamodb_table" "assets" {
  name         = "${var.project_name}-assets-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "model_id"

  attribute {
    name = "model_id"
    type = "S"
  }
}
