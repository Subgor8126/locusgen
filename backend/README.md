# LocusGen Backend

Django REST API backend for the LocusGen application.

## Setup

### Prerequisites
- Python 3.8+
- Docker and Docker Compose

### Development Setup

1. **Start PostgreSQL Database:**
   ```bash
   # From project root directory
   docker-compose up -d postgres
   ```

2. **Create and activate virtual environment:**
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate  # Windows
   # or
   source venv/bin/activate  # Linux/Mac
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Configuration:**
   - Copy `.env.example` to `.env`
   - Update the environment variables as needed
   - Default configuration connects to Docker PostgreSQL

5. **Database Setup:**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

6. **Run Development Server:**
   ```bash
   python manage.py runserver
   ```

### Database Management

**Start/Stop PostgreSQL:**
```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Stop PostgreSQL container
docker-compose down

# View logs
docker-compose logs postgres
```

**Optional: pgAdmin (Database GUI):**
```bash
# Start with pgAdmin
docker-compose --profile tools up -d

# Access pgAdmin at http://localhost:8080
# Email: admin@locusgen.com
# Password: admin123
```

**Database Connection Details:**
- Host: localhost
- Port: 5432
- Database: locusgen_dev
- Username: locusgen
- Password: locusgen_dev_password

## Project Structure

```
backend/
├── locusgen/           # Main Django project
│   ├── settings/       # Environment-based settings
│   ├── urls.py         # Main URL configuration
│   └── views.py        # Project-level views
├── authentication/     # User authentication app
├── projects/          # Project management app
├── chat/              # Chat functionality app
├── venv/              # Virtual environment
├── requirements.txt   # Python dependencies
├── .env               # Environment variables
└── manage.py          # Django management script
```

## API Endpoints

- `/health/` - Health check endpoint
- `/api/auth/` - Authentication endpoints
- `/api/projects/` - Project management endpoints  
- `/api/chat/` - Chat functionality endpoints

## Configuration

The project uses environment-based settings:

- **Development:** `locusgen.settings.development`
- **Production:** `locusgen.settings.production`

Key environment variables:
- `DJANGO_SETTINGS_MODULE` - Settings module to use
- `SECRET_KEY` - Django secret key
- `DEBUG` - Debug mode flag
- `USE_SQLITE` - Use SQLite instead of PostgreSQL for development
- `AWS_COGNITO_USER_POOL_ID` - AWS Cognito User Pool ID
- `AWS_COGNITO_APP_CLIENT_ID` - AWS Cognito App Client ID

## Authentication

The backend uses AWS Cognito JWT authentication. Configure the following environment variables:

- `AWS_COGNITO_USER_POOL_ID`
- `AWS_COGNITO_APP_CLIENT_ID`
- `AWS_REGION`

## CORS Configuration

CORS is configured to allow requests from the Next.js frontend running on `localhost:3000`.