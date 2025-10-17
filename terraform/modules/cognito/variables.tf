variable "environment" {
  description = "Environment name"
  type        = string
}

variable "user_pool_name" {
  description = "Name of the Cognito User Pool"
  type        = string
}

variable "domain_prefix" {
  description = "Domain prefix for Cognito hosted UI"
  type        = string
}