#!/bin/bash
# Development setup script for LocusGen

echo "🚀 Setting up LocusGen development environment..."

# Start PostgreSQL
echo "📦 Starting PostgreSQL container..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Check if PostgreSQL is healthy
if docker-compose ps postgres | grep -q "healthy"; then
    echo "✅ PostgreSQL is ready!"
else
    echo "❌ PostgreSQL is not ready. Check docker-compose logs postgres"
    exit 1
fi

# Setup backend
echo "🐍 Setting up Python backend..."
cd backend

# Activate virtual environment (if it exists)
if [ -d "venv" ]; then
    echo "📦 Activating virtual environment..."
    source venv/bin/activate  # Linux/Mac
    # For Windows: venv\Scripts\activate
fi

# Install dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Run migrations
echo "🗄️ Running database migrations..."
python manage.py migrate

# Check Django setup
echo "🔍 Checking Django configuration..."
python manage.py check

echo "✅ Development environment is ready!"
echo ""
echo "🎯 Next steps:"
echo "   1. cd backend && source venv/bin/activate"
echo "   2. python manage.py runserver"
echo "   3. Visit http://localhost:8000/health/"
echo ""
echo "📊 Database GUI (optional):"
echo "   docker-compose --profile tools up -d"
echo "   Visit http://localhost:8080 (admin@locusgen.com / admin123)"