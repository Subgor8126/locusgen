# Docker PostgreSQL Setup for LocusGen

## ✅ What We've Accomplished

### 1. **Docker Compose Configuration**
- Created `docker-compose.yml` with PostgreSQL 15
- Configured persistent data volumes
- Added health checks for reliability
- Optional pgAdmin for database management

### 2. **Database Migration from SQLite to PostgreSQL**
- ✅ Removed SQLite database (`db.sqlite3`)
- ✅ Updated environment configuration
- ✅ Successfully migrated Django to PostgreSQL
- ✅ All Django migrations applied to PostgreSQL

### 3. **Development Workflow**
- Created setup scripts for both Windows and Linux/Mac
- Updated documentation with Docker instructions
- Configured proper .gitignore files

## 🚀 Quick Start

### Start Development Environment
```bash
# Start PostgreSQL
docker-compose up -d postgres

# Setup backend (first time)
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python manage.py migrate

# Run development server
python manage.py runserver
```

### Database Access
- **Django Admin**: http://localhost:8000/admin/
- **API Health Check**: http://localhost:8000/health/
- **pgAdmin** (optional): http://localhost:8080
  - Email: admin@locusgen.com
  - Password: admin123

## 🔧 Database Configuration

### Connection Details
```
Host: localhost
Port: 5432
Database: locusgen_dev
Username: locusgen
Password: locusgen_dev_password
```

### Environment Variables (.env)
```bash
USE_SQLITE=False
DB_NAME=locusgen_dev
DB_USER=locusgen
DB_PASSWORD=locusgen_dev_password
DB_HOST=localhost
DB_PORT=5432
```

## 🎯 Benefits Achieved

### 1. **Production Parity**
- Same PostgreSQL engine in development and production
- Identical SQL behavior and data types
- No surprises when deploying to RDS

### 2. **Smooth RDS Migration Path**
- Only connection details need to change for RDS
- Database schema and queries remain identical
- Can use `pg_dump` for data migration if needed

### 3. **Developer Experience**
- Isolated database environment
- Easy to reset/recreate database
- Consistent setup across team members
- Database GUI available with pgAdmin

## 🔄 Common Commands

```bash
# Database Management
docker-compose up -d postgres          # Start PostgreSQL
docker-compose down                     # Stop all services
docker-compose logs postgres            # View PostgreSQL logs
docker-compose restart postgres         # Restart PostgreSQL

# Django Database Operations
python manage.py makemigrations         # Create new migrations
python manage.py migrate                # Apply migrations
python manage.py dbshell                # Access PostgreSQL shell
python manage.py createsuperuser        # Create admin user

# Development
python manage.py runserver              # Start Django server
python manage.py check                  # Check Django configuration
```

## 🚨 Troubleshooting

### PostgreSQL Connection Issues
1. Check if container is running: `docker ps`
2. Check container health: `docker-compose ps`
3. View logs: `docker-compose logs postgres`
4. Restart container: `docker-compose restart postgres`

### Django Database Issues
1. Check Django configuration: `python manage.py check`
2. Test database connection: `python manage.py dbshell`
3. Reset migrations if needed: Delete migration files and re-run `makemigrations`

## 🎉 Next Steps

The PostgreSQL setup is complete! You can now:

1. **Continue with Task 2**: Implement data models
2. **Add sample data**: Create fixtures or use Django admin
3. **Configure AWS RDS**: When ready for production deployment

The transition from this local PostgreSQL to AWS RDS will be seamless - just update the connection environment variables!