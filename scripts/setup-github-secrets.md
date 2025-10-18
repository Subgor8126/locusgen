# GitHub Secrets Setup for LocusGen

To enable the GitHub Actions workflow, you need to add these secrets to your repository.

## Required Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

### 1. AWS_ACCESS_KEY_ID
- **Name**: `AWS_ACCESS_KEY_ID`
- **Value**: Your AWS access key ID
- **How to get**: 
  ```bash
  aws configure get aws_access_key_id
  ```

### 2. AWS_SECRET_ACCESS_KEY
- **Name**: `AWS_SECRET_ACCESS_KEY`  
- **Value**: Your AWS secret access key
- **How to get**:
  ```bash
  aws configure get aws_secret_access_key
  ```

## Security Best Practices

### Option 1: Use Existing Credentials (Quick)
Use your current AWS CLI credentials (what you used for Terraform).

### Option 2: Create GitHub-Specific IAM User (Recommended)
1. Create a new IAM user: `github-actions-locusgen`
2. Attach policy with minimal permissions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "ecr:GetAuthorizationToken",
           "ecr:BatchCheckLayerAvailability",
           "ecr:GetDownloadUrlForLayer",
           "ecr:BatchGetImage",
           "ecr:BatchImportLayerPart",
           "ecr:CompleteLayerUpload",
           "ecr:InitiateLayerUpload",
           "ecr:PutImage",
           "ecr:UploadLayerPart"
         ],
         "Resource": "*"
       }
     ]
   }
   ```

## Testing the Workflow

After adding secrets:

1. **Push to main branch** with changes to `agents/` folder
2. **Or trigger manually** via GitHub Actions tab → "Deploy Agents to ECR" → "Run workflow"
3. **Check the run** for build logs and image URIs

## Expected Output

The workflow will:
- ✅ Build ARM64 image on GitHub's runners (much faster!)
- ✅ Push to your ECR repository with two tags:
  - `975050380826.dkr.ecr.us-east-1.amazonaws.com/locusgen-dev-agents:latest`
  - `975050380826.dkr.ecr.us-east-1.amazonaws.com/locusgen-dev-agents:<commit-sha>`
- ✅ Show deployment summary with image URIs