output "agent_runtime_arn" {
  description = "ARN of the Bedrock AgentCore Runtime"
  value       = aws_bedrockagentcore_agent_runtime.locusgen_agent.agent_runtime_arn
}

output "agent_runtime_id" {
  description = "ID of the Bedrock AgentCore Runtime"
  value       = aws_bedrockagentcore_agent_runtime.locusgen_agent.agent_runtime_id
}

output "ecr_repository_url" {
  description = "URL of the ECR repository for agent containers"
  value       = aws_ecr_repository.agents.repository_url
}

output "ecr_repository_name" {
  description = "Name of the ECR repository"
  value       = aws_ecr_repository.agents.name
}

output "agent_runtime_role_arn" {
  description = "ARN of the IAM role used by AgentCore Runtime"
  value       = aws_iam_role.agent_runtime_role.arn
}

output "workload_identity_arn" {
  description = "ARN of the workload identity for the agent runtime"
  value       = aws_bedrockagentcore_agent_runtime.locusgen_agent.workload_identity_details[0].workload_identity_arn
}