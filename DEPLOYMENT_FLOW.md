# LocusGen Deployment Flow

## How Secrets Flow Through Your System

### 1. Local Development
```bash
# You create terraform.tfvars (gitignored)
echo 'sketchfab_api_key = "real-key-here"' > terraform/terraform.tfvars

# You create .env files (gitignored) 
cp agents/.env.example agents/.env
# Edit agents/.env with real values for local testing
```

### 2. Infrastructure Deployment
```bash
cd terraform
terraform plan   # Reads terraform.tfvars
terraform apply  # Creates AWS resources with secrets
```

### 3. What Terraform Creates
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ terraform.tfvars│───▶│ Terraform        │───▶│ AWS Resources   │
│ (your secrets)  │    │ (reads & passes) │    │ (stores secrets)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │ AgentCore       │
                                               │ (injects into   │
                                               │  containers)    │
                                               └─────────────────┘
```

### 4. Runtime Access
- **Agents**: Get secrets from AgentCore environment variables
- **Backend**: Gets secrets from ECS task environment (when deployed)
- **Frontend**: Gets public config from Terraform outputs

### 5. No Access Keys Needed!
- Agents use IAM role attached to AgentCore Runtime
- Backend uses IAM role attached to ECS task
- Local development uses AWS CLI profiles

## Key Differences from GitHub Actions

| GitHub Actions | Terraform |
|----------------|-----------|
| Secrets → Workflow → Deploy | Secrets → Infrastructure → Always Available |
| Temporary (per run) | Persistent (until changed) |
| CI/CD focused | Infrastructure focused |