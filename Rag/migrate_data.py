#!/usr/bin/env python3
"""
Data migration script to set up the RAG system
This script helps migrate data from PostgreSQL to ChromaDB
"""

import os
import sys
from sqlalchemy.orm import Session
from database import get_db, create_tables
from data_ingestion import data_ingestion_service
from rag_service import rag_service
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    """Main migration function"""
    try:
        logger.info("Starting RAG system setup...")
        logger.info("Skipping table creation - using existing database tables")
        
        # Step 1: Get database session
        logger.info("Connecting to existing database...")
        db = next(get_db())
        
        try:
            # Step 2: Check if data exists
            from database import Medicine, Doctor
            
            medicine_count = db.query(Medicine).count()
            doctor_count = db.query(Doctor).count()
            
            logger.info(f"Found {medicine_count} medicines and {doctor_count} doctors in existing database")
            
            if medicine_count == 0 and doctor_count == 0:
                logger.warning("No data found in database. Please ensure data is loaded first.")
                return
            
            # Step 3: Ingest data to ChromaDB
            logger.info("Starting data ingestion from PostgreSQL to ChromaDB...")
            
            # Ingest medicines
            if medicine_count > 0:
                logger.info("Ingesting medicines...")
                medicine_success = data_ingestion_service.ingest_medicines(db)
                if medicine_success:
                    logger.info("Medicine ingestion completed successfully")
                else:
                    logger.error("Medicine ingestion failed")
                    return
            
            # Ingest doctors
            if doctor_count > 0:
                logger.info("Ingesting doctors...")
                doctor_success = data_ingestion_service.ingest_doctors(db)
                if doctor_success:
                    logger.info("Doctor ingestion completed successfully")
                else:
                    logger.error("Doctor ingestion failed")
                    return
            
            # Step 4: Verify ingestion
            logger.info("Verifying data ingestion...")
            stats = rag_service.get_system_stats()
            logger.info(f"ChromaDB stats: {stats}")
            
            # Step 5: Test the system
            logger.info("Testing RAG system...")
            test_query = "I have a headache and fever"
            result = rag_service.query_symptoms(test_query)
            
            if result and not result.get('error'):
                logger.info("RAG system test successful!")
                logger.info(f"Found {len(result.get('medicine_recommendations', {}).get('recommendations', []))} medicine recommendations")
                logger.info(f"Found {len(result.get('doctor_recommendations', {}).get('recommendations', []))} doctor recommendations")
            else:
                logger.error("RAG system test failed")
                return
            
            logger.info("RAG system setup completed successfully!")
            logger.info("You can now start the API server with: python main.py")
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        sys.exit(1)

def test_system():
    """Test the RAG system with sample queries"""
    try:
        logger.info("Testing RAG system with sample queries...")
        
        test_queries = [
            "I have a headache and fever",
            "Chest pain and shortness of breath",
            "Stomach ache and nausea",
            "Skin rash and itching",
            "Back pain and muscle stiffness"
        ]
        
        for query in test_queries:
            logger.info(f"Testing query: {query}")
            result = rag_service.query_symptoms(query)
            
            if result and not result.get('error'):
                med_count = len(result.get('medicine_recommendations', {}).get('recommendations', []))
                doc_count = len(result.get('doctor_recommendations', {}).get('recommendations', []))
                logger.info(f"  - Found {med_count} medicines, {doc_count} doctors")
            else:
                logger.error(f"  - Query failed: {result.get('error', 'Unknown error')}")
        
        logger.info("System testing completed")
        
    except Exception as e:
        logger.error(f"System testing failed: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        test_system()
    else:
        main()
