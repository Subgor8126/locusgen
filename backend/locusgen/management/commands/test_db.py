"""
Management command to test database connection
"""

from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Test database connection and display PostgreSQL version'

    def handle(self, *args, **options):
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT version()")
                version = cursor.fetchone()[0]
                
                cursor.execute("SELECT current_database()")
                database = cursor.fetchone()[0]
                
                cursor.execute("SELECT current_user")
                user = cursor.fetchone()[0]
                
                self.stdout.write(
                    self.style.SUCCESS('✅ Database connection successful!')
                )
                self.stdout.write(f"📊 Database: {database}")
                self.stdout.write(f"👤 User: {user}")
                self.stdout.write(f"🐘 PostgreSQL Version: {version}")
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Database connection failed: {e}')
            )