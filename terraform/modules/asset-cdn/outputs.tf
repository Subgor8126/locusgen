output "s3_bucket_name" {
  description = "Name of the S3 bucket for models"
  value       = aws_s3_bucket.models.bucket
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket for models"
  value       = aws_s3_bucket.models.arn
}

output "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  value       = aws_dynamodb_table.assets.name
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table"
  value       = aws_dynamodb_table.assets.arn
}