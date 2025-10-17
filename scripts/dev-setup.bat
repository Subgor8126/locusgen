@echo off
REM Development setup script for LocusGen (Windows)

echo 🚀 Setting up LocusGen development environment...

REM Start PostgreSQL
echo 📦 Starting PostgreSQL container...
docker-compose up -d postgres

REM Wait for PostgreSQL to be ready
echo ⏳ Waiting for PostgreSQL to be ready...
timeout /t 10 /nobreak > nul

REM Setup backend
echo 🐍 Setting up Python backend...
cd backend

REM Activate virtual environment (if it exists)
if exist "venv" (
    echo 📦 Activating virtual environment...
    call venv\Scripts\activate
)

REM Install dependencies
echo 📦 Installing Python dependencies...
pip install -r requirements.txt

REM Run migrations
echo 🗄️ Running database migrations...
python manage.py migrate

REM Check Django setup
echo 🔍 Checking Django configuration...
python manage.py check

echo ✅ Development environment is ready!
echo.
echo 🎯 Next steps:
echo    1. cd backend ^&^& venv\Scripts\activate
echo    2. python manage.py runserver
echo    3. Visit http://localhost:8000/health/
echo.
echo 📊 Database GUI (optional):
echo    docker-compose --profile tools up -d
echo    Visit http://localhost:8080 (admin@locusgen.com / admin123)

pause