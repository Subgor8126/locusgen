# Authentication System Documentation

## Overview

The LocusGen authentication system provides AWS Cognito JWT token validation with seamless support for both authenticated and anonymous users. The system is designed to allow anonymous users to create and access projects while providing authenticated users with proper user association and access control.

## Architecture

### Components

1. **CognitoJWTAuthentication** - Custom DRF authentication class for JWT validation
2. **Authentication Views** - API endpoints for auth status, token validation, and user profile
3. **Custom User Model** - Extended Django user model with Cognito integration
4. **Session Middleware** - Ensures proper session handling for anonymous users
5. **User Serializers** - API serialization for user data

### Authentication Flow

```
1. Frontend sends request with optional JWT token
2. CognitoJWTAuthentication validates token against Cognito
3. If valid: User is authenticated and associated with request
4. If invalid/missing: User remains anonymous with session support
5. Views handle both authenticated and anonymous users appropriately
```

## Configuration

### Environment Variables

Required environment variables in `.env`:

```bash
# AWS Cognito Configuration
AWS_COGNITO_USER_POOL_ID=us-east-1_t2gzoFufU
AWS_COGNITO_APP_CLIENT_ID=168cbinct3l6fjrvta5j5pgfe7
AWS_REGION=us-east-1
```

### Django Settings

The authentication system is configured in `locusgen/settings/base.py`:

```python
# Custom User Model
AUTH_USER_MODEL = 'authentication.User'

# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'authentication.authentication.CognitoJWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',  # Handle permissions at view level
    ],
}

# AWS Cognito Configuration
AWS_COGNITO_USER_POOL_ID = config('AWS_COGNITO_USER_POOL_ID', default='us-east-1_t2gzoFufU')
AWS_COGNITO_APP_CLIENT_ID = config('AWS_COGNITO_APP_CLIENT_ID', default='168cbinct3l6fjrvta5j5pgfe7')
AWS_REGION = config('AWS_REGION', default='us-east-1')
```

## API Endpoints

### Authentication Status
- **URL**: `/api/auth/status/`
- **Method**: `GET`
- **Auth Required**: No
- **Description**: Returns current authentication status

**Response (Anonymous)**:
```json
{
    "authenticated": false,
    "user": null
}
```

**Response (Authenticated)**:
```json
{
    "authenticated": true,
    "user": {
        "id": "uuid",
        "username": "user@example.com",
        "email": "user@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "cognito_sub": "cognito-user-id",
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-01T00:00:00Z"
    }
}
```

### Token Validation
- **URL**: `/api/auth/validate/`
- **Method**: `POST`
- **Auth Required**: JWT Token in Authorization header
- **Description**: Validates Cognito JWT token

**Request Headers**:
```
Authorization: Bearer <jwt-token>
```

**Response (Valid)**:
```json
{
    "valid": true,
    "user": {
        "id": "uuid",
        "username": "user@example.com",
        "email": "user@example.com",
        "cognito_sub": "cognito-user-id"
    }
}
```

**Response (Invalid)**:
```json
{
    "valid": false,
    "error": "Token has expired"
}
```

### User Profile
- **URL**: `/api/auth/profile/`
- **Method**: `GET`
- **Auth Required**: Yes
- **Description**: Returns current user profile

**Response**:
```json
{
    "id": "uuid",
    "username": "user@example.com",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "cognito_sub": "cognito-user-id",
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
}
```

## User Model

The custom User model extends Django's AbstractUser with Cognito integration:

```python
class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cognito_sub = models.CharField(
        max_length=255, 
        unique=True, 
        null=True, 
        blank=True,
        help_text="AWS Cognito user identifier (sub claim from JWT)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

## JWT Token Validation

The system validates JWT tokens using the following process:

1. **Extract Token**: Get JWT from Authorization header (`Bearer <token>`)
2. **Get Key ID**: Extract `kid` from JWT header
3. **Fetch Public Key**: Retrieve public key from Cognito JWKS endpoint
4. **Validate Token**: Verify signature, expiration, audience, and issuer
5. **Create/Update User**: Get or create Django user based on Cognito `sub` claim

### Token Claims Used

- `sub`: Cognito user identifier (stored in `cognito_sub` field)
- `email`: User email address
- `cognito:username`: Username (fallback to email if not present)
- `given_name`: First name
- `family_name`: Last name

## Anonymous User Support

The system provides full support for anonymous users:

1. **Session Management**: Anonymous users get proper Django sessions
2. **Project Creation**: Can create projects without authentication
3. **Project Access**: Can access projects they created
4. **No Listing**: Cannot list all projects (returns empty list)

## User Association Logic

### Project Creation
- **Authenticated Users**: Projects are associated with the user (`project.user = request.user`)
- **Anonymous Users**: Projects have no user association (`project.user = None`)

### Project Access
- **Authenticated Users**: Can only access their own projects
- **Anonymous Users**: Can access any project with `user = None`
- **Cross-Access**: Authenticated users cannot access anonymous projects and vice versa

## Error Handling

The authentication system handles various error scenarios:

### JWT Validation Errors
- **Expired Token**: Returns 401 with "Token has expired"
- **Invalid Signature**: Returns 401 with "Invalid token"
- **Missing Claims**: Returns 401 with "Token missing required claims"
- **Network Errors**: Returns 401 with "Authentication failed"

### User Creation Errors
- **Database Errors**: Handled gracefully with appropriate error messages
- **Validation Errors**: Returns detailed field-level validation errors

## Testing

The authentication system includes comprehensive tests:

### Unit Tests
- JWT token validation
- User creation and updates
- Authentication views
- Session handling

### Integration Tests
- Project creation with authentication
- Cross-user access protection
- Anonymous user workflows
- Chat functionality with auth

### Running Tests

```bash
# Run authentication tests
python manage.py test authentication

# Run integration tests
python test_auth_system.py
python test_project_auth_integration.py
```

## Security Considerations

1. **JWT Validation**: All tokens are validated against Cognito public keys
2. **HTTPS Only**: Production should use HTTPS for all authentication
3. **Token Expiration**: Respects JWT expiration times
4. **User Isolation**: Authenticated users can only access their own data
5. **Session Security**: Anonymous sessions are properly managed

## Frontend Integration

### Authentication Headers

For authenticated requests, include the JWT token:

```javascript
const headers = {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json'
};
```

### Checking Auth Status

```javascript
const response = await fetch('/api/auth/status/');
const { authenticated, user } = await response.json();

if (authenticated) {
    // User is logged in
    console.log('User:', user);
} else {
    // Anonymous user
    console.log('Anonymous user');
}
```

### Token Validation

```javascript
const response = await fetch('/api/auth/validate/', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${jwtToken}`
    }
});

const { valid, user, error } = await response.json();
```

## Troubleshooting

### Common Issues

1. **"Invalid token" errors**: Check Cognito configuration and token format
2. **"Token has expired"**: Refresh the JWT token on the frontend
3. **Database connection errors**: Ensure PostgreSQL is running
4. **CORS issues**: Check CORS configuration for frontend domain

### Debug Mode

Enable debug logging in development:

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'authentication': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}
```

## Future Enhancements

1. **Token Refresh**: Implement automatic token refresh
2. **Rate Limiting**: Add rate limiting for authentication endpoints
3. **Audit Logging**: Log authentication events for security monitoring
4. **Multi-Factor Auth**: Support for MFA through Cognito
5. **Social Login**: Integration with social identity providers