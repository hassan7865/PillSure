#!/usr/bin/env python3
"""
Setup script for the RAG system
This script helps set up the environment and run initial data ingestion
"""

import os
import sys
import subprocess
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        logger.error("Python 3.8 or higher is required")
        return False
    logger.info(f"✅ Python version: {sys.version}")
    return True

def check_environment_file():
    """Check if .env file exists"""
    env_file = Path(".env")
    if not env_file.exists():
        logger.error("❌ .env file not found. Please create it from .env.example")
        logger.info("Required environment variables:")
        logger.info("  - DATABASE_URL: PostgreSQL connection string")
        logger.info("  - GEMINI_API_KEY: Your Gemini API key")
        logger.info("  - CHROMA_PERSIST_DIRECTORY: ChromaDB storage directory")
        return False
    logger.info("✅ .env file found")
    return True

def install_dependencies():
    """Install required dependencies"""
    try:
        logger.info("Installing dependencies...")
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], check=True)
        logger.info("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Failed to install dependencies: {e}")
        return False

def test_database_connection():
    """Test database connection"""
    try:
        from database import get_db
        from sqlalchemy import text
        
        logger.info("Testing database connection...")
        db = next(get_db())
        
        # Test connection with a simple query
        result = db.execute(text("SELECT 1")).fetchone()
        if result:
            logger.info("✅ Database connection successful")
            return True
        else:
            logger.error("❌ Database connection failed")
            return False
            
    except Exception as e:
        logger.error(f"❌ Database connection error: {e}")
        return False

def test_gemini_api():
    """Test Gemini API connection"""
    try:
        from config import settings
        
        if not settings.GEMINI_API_KEY:
            logger.error("❌ GEMINI_API_KEY not set in .env file")
            return False
        
        logger.info("Testing Gemini API connection...")
        from gemini_service import gemini_service
        
        # Test with a simple query
        test_text = "Hello, this is a test"
        embedding = gemini_service.encode_text(test_text)
        
        if embedding is not None and len(embedding) > 0:
            logger.info("✅ Gemini API connection successful")
            return True
        else:
            logger.error("❌ Gemini API connection failed")
            return False
            
    except Exception as e:
        logger.error(f"❌ Gemini API connection error: {e}")
        return False

def run_data_ingestion():
    """Run data ingestion from PostgreSQL to ChromaDB"""
    try:
        logger.info("Running data ingestion...")
        subprocess.run([sys.executable, "migrate_data.py"], check=True)
        logger.info("✅ Data ingestion completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Data ingestion failed: {e}")
        return False

def run_tests():
    """Run system tests"""
    try:
        logger.info("Running system tests...")
        subprocess.run([sys.executable, "test_rag.py"], check=True)
        logger.info("✅ All tests passed")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Tests failed: {e}")
        return False

def main():
    """Main setup function"""
    logger.info("Setting up RAG system...")
    
    # Step 1: Check Python version
    if not check_python_version():
        return False
    
    # Step 2: Check environment file
    if not check_environment_file():
        return False
    
    # Step 3: Install dependencies
    if not install_dependencies():
        return False
    
    # Step 4: Test database connection
    if not test_database_connection():
        return False
    
    # Step 5: Test Gemini API
    if not test_gemini_api():
        return False
    
    # Step 6: Run data ingestion
    if not run_data_ingestion():
        return False
    
    # Step 7: Run tests
    if not run_tests():
        return False
    
    logger.info("🎉 RAG system setup completed successfully!")
    logger.info("You can now start the API server with: python main.py")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
