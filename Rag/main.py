from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import logging
from pydantic import BaseModel

# Import our services
from database import get_db, create_tables, Specialization
from rag_service import rag_service
from data_ingestion import data_ingestion_service
from config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Medicine & Doctor RAG API",
    description="AI-powered RAG system for medicine and doctor recommendations",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class SymptomQuery(BaseModel):
    symptoms: str
    user_preferences: Optional[Dict[str, Any]] = None
    user_location: Optional[str] = None
    max_medicines: Optional[int] = 10
    max_doctors: Optional[int] = 5

class MedicineSearch(BaseModel):
    medicine_name: str
    limit: Optional[int] = 10

class DoctorSearch(BaseModel):
    specialization: str
    limit: Optional[int] = 10

class UserPreferences(BaseModel):
    budget: Optional[float] = None
    prescription_preference: Optional[bool] = None
    category_preference: Optional[str] = None

# Health check endpoint
@app.get("/")
async def root():
    return {"message": "Medicine & Doctor RAG API is running"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        stats = rag_service.get_system_stats()
        return {
            "status": "healthy",
            "timestamp": stats.get("timestamp"),
            "chromadb_stats": stats.get("chromadb_stats", {}),
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail="Service unhealthy")

# Main RAG query endpoint
@app.post("/query/symptoms")
async def query_symptoms(query: SymptomQuery):
    """
    Main endpoint for symptom-based recommendations
    
    This endpoint processes user symptoms and returns:
    - Medicine recommendations (OTC and prescription)
    - Doctor recommendations based on specialization
    - Categorized results for easy consumption
    """
    try:
        logger.info(f"Received symptoms query: {query.symptoms}")
        
        result = rag_service.query_symptoms(
            symptoms=query.symptoms,
            user_preferences=query.user_preferences,
            user_location=query.user_location,
            max_medicines=query.max_medicines,
            max_doctors=query.max_doctors
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error processing symptoms query: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")

# Medicine search endpoints
@app.post("/search/medicines")
async def search_medicines(search: MedicineSearch):
    """Search medicines by name"""
    try:
        results = rag_service.search_medicines_by_name(
            medicine_name=search.medicine_name,
            limit=search.limit
        )
        return {"medicines": results, "count": len(results)}
        
    except Exception as e:
        logger.error(f"Error searching medicines: {e}")
        raise HTTPException(status_code=500, detail=f"Error searching medicines: {str(e)}")

@app.get("/medicines/{medicine_id}")
async def get_medicine_details(medicine_id: str):
    """Get detailed information about a specific medicine"""
    try:
        details = rag_service.get_medicine_details(medicine_id)
        if not details:
            raise HTTPException(status_code=404, detail="Medicine not found")
        return details
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting medicine details: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting medicine details: {str(e)}")

# Doctor search endpoints
@app.post("/search/doctors")
async def search_doctors(search: DoctorSearch):
    """Search doctors by specialization"""
    try:
        results = rag_service.search_doctors_by_specialization(
            specialization=search.specialization,
            limit=search.limit
        )
        return {"doctors": results, "count": len(results)}
        
    except Exception as e:
        logger.error(f"Error searching doctors: {e}")
        raise HTTPException(status_code=500, detail=f"Error searching doctors: {str(e)}")

@app.get("/doctors/{doctor_id}")
async def get_doctor_details(doctor_id: str):
    """Get detailed information about a specific doctor"""
    try:
        details = rag_service.get_doctor_details(doctor_id)
        if not details:
            raise HTTPException(status_code=404, detail="Doctor not found")
        return details
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting doctor details: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting doctor details: {str(e)}")

@app.get("/specializations")
async def get_specializations(db: Session = Depends(get_db)):
    """Get all available specializations"""
    try:
        specializations = db.query(Specialization).all()
        result = []
        for spec in specializations:
            result.append({
                "id": spec.id,
                "name": spec.name,
                "description": spec.description,
                "created_at": spec.created_at.isoformat() if spec.created_at else None
            })
        return {"specializations": result, "count": len(result)}
        
    except Exception as e:
        logger.error(f"Error getting specializations: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting specializations: {str(e)}")

# Data management endpoints
@app.post("/admin/ingest-data")
async def ingest_all_data(db: Session = Depends(get_db)):
    """Ingest all data from PostgreSQL to ChromaDB with PostgreSQL backend (Admin only)"""
    try:
        logger.info("Starting full data ingestion...")
        
        success = data_ingestion_service.ingest_all_data(db)
        
        if success:
            stats = rag_service.get_system_stats()
            return {
                "message": "Data ingestion completed successfully",
                "stats": stats
            }
        else:
            raise HTTPException(status_code=500, detail="Data ingestion failed")
            
    except Exception as e:
        logger.error(f"Error in data ingestion: {e}")
        raise HTTPException(status_code=500, detail=f"Data ingestion failed: {str(e)}")

@app.post("/admin/ingest-medicines")
async def ingest_medicines(db: Session = Depends(get_db)):
    """Ingest medicines from PostgreSQL to ChromaDB with PostgreSQL backend (Admin only)"""
    try:
        success = data_ingestion_service.ingest_medicines(db)
        
        if success:
            return {"message": "Medicine ingestion completed successfully"}
        else:
            raise HTTPException(status_code=500, detail="Medicine ingestion failed")
            
    except Exception as e:
        logger.error(f"Error in medicine ingestion: {e}")
        raise HTTPException(status_code=500, detail=f"Medicine ingestion failed: {str(e)}")

@app.post("/admin/ingest-doctors")
async def ingest_doctors(db: Session = Depends(get_db)):
    """Ingest doctors from PostgreSQL to ChromaDB with PostgreSQL backend (Admin only)"""
    try:
        success = data_ingestion_service.ingest_doctors(db)
        
        if success:
            return {"message": "Doctor ingestion completed successfully"}
        else:
            raise HTTPException(status_code=500, detail="Doctor ingestion failed")
            
    except Exception as e:
        logger.error(f"Error in doctor ingestion: {e}")
        raise HTTPException(status_code=500, detail=f"Doctor ingestion failed: {str(e)}")

# System information endpoints
@app.get("/stats")
async def get_system_stats():
    """Get system statistics"""
    try:
        stats = rag_service.get_system_stats()
        return stats
        
    except Exception as e:
        logger.error(f"Error getting system stats: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting stats: {str(e)}")

# Example usage endpoints
@app.get("/examples/queries")
async def get_example_queries():
    """Get example queries for testing"""
    return {
        "example_queries": [
            {
                "symptoms": "I have a headache and fever",
                "description": "Common cold symptoms"
            },
            {
                "symptoms": "Chest pain and shortness of breath",
                "description": "Cardiac symptoms - should recommend cardiologist"
            },
            {
                "symptoms": "Stomach ache and nausea",
                "description": "Digestive issues"
            },
            {
                "symptoms": "Skin rash and itching",
                "description": "Dermatological symptoms"
            },
            {
                "symptoms": "Back pain and muscle stiffness",
                "description": "Orthopedic symptoms"
            }
        ],
        "user_preferences_examples": [
            {
                "budget": 500.0,
                "prescription_preference": False,
                "category_preference": "Pain Relief"
            },
            {
                "budget": 1000.0,
                "prescription_preference": True,
                "category_preference": "Antibiotics"
            }
        ]
    }

# Initialize system on startup
@app.on_event("startup")
async def startup_event():
    """Initialize system on startup"""
    try:
        logger.info("RAG system starting up...")
        # Check if ChromaDB with PostgreSQL backend has data
        stats = rag_service.get_system_stats()
        logger.info(f"System stats: {stats}")
        logger.info("RAG system startup completed")
    except Exception as e:
        logger.error(f"Error during startup: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
