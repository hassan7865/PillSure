from typing import List, Dict, Any, Optional, Tuple
from chroma_service import chroma_service
from gemini_service import gemini_service
from config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RAGService:
    def __init__(self):
        self.chroma_service = chroma_service
        self.gemini_service = gemini_service
    
    def query_symptoms(self, 
                      symptoms: str,
                      user_preferences: Optional[Dict[str, Any]] = None,
                      user_location: Optional[str] = None,
                      max_medicines: int = 10,
                      max_doctors: int = 5) -> Dict[str, Any]:
        """
        Main RAG query function that processes symptoms and returns recommendations
        
        Args:
            symptoms: User's symptom description
            user_preferences: Optional user preferences (budget, prescription preference, etc.)
            user_location: Optional user location for doctor recommendations
            max_medicines: Maximum number of medicines to return
            max_doctors: Maximum number of doctors to return
            
        Returns:
            Dictionary containing medicine and doctor recommendations
        """
        try:
            logger.info(f"Processing symptoms query: {symptoms}")
            
            # Step 1: Search for relevant medicines
            medicine_results = self._search_medicines(symptoms, user_preferences, max_medicines)
            
            # Step 2: Search for relevant doctors
            doctor_results = self._search_doctors(symptoms, user_location, max_doctors)
            
            # Step 3: Generate AI-powered recommendations
            medicine_recommendations = self.gemini_service.generate_medicine_recommendations(
                symptoms, medicine_results, user_preferences
            )
            
            doctor_recommendations = self.gemini_service.generate_doctor_recommendations(
                symptoms, doctor_results, user_location
            )
            
            # Step 4: Categorize recommendations
            categorized_recommendations = self._categorize_recommendations(
                medicine_recommendations, doctor_recommendations
            )
            
            # Step 5: Prepare final response
            response = {
                "query": symptoms,
                "medicine_recommendations": medicine_recommendations,
                "doctor_recommendations": doctor_recommendations,
                "categorized_recommendations": categorized_recommendations,
                "search_metadata": {
                    "medicines_found": len(medicine_results),
                    "doctors_found": len(doctor_results),
                    "search_timestamp": self._get_timestamp()
                }
            }
            
            logger.info("Successfully processed symptoms query")
            return response
            
        except Exception as e:
            logger.error(f"Error processing symptoms query: {e}")
            return self._create_error_response(symptoms, str(e))
    
    def _search_medicines(self, 
                         symptoms: str, 
                         user_preferences: Optional[Dict[str, Any]] = None,
                         max_results: int = 10) -> List[Dict[str, Any]]:
        """Search for medicines based on symptoms"""
        try:
            # Extract filters from user preferences
            prescription_filter = None
            category_filter = None
            
            if user_preferences:
                prescription_filter = user_preferences.get('prescription_preference')
                category_filter = user_preferences.get('category_preference')
            
            # Search in ChromaDB with PostgreSQL backend
            medicine_results = self.chroma_service.search_medicines(
                query=symptoms,
                n_results=max_results,
                prescription_filter=prescription_filter,
                category_filter=category_filter
            )
            
            # Filter by budget if specified
            if user_preferences and user_preferences.get('budget'):
                budget = user_preferences['budget']
                medicine_results = [
                    med for med in medicine_results 
                    if med.get('price', 0) <= budget
                ]
            
            # Sort by similarity score
            medicine_results.sort(key=lambda x: x.get('similarity_score', 0), reverse=True)
            
            return medicine_results
            
        except Exception as e:
            logger.error(f"Error searching medicines: {e}")
            return []
    
    def _search_doctors(self, 
                       symptoms: str, 
                       user_location: Optional[str] = None,
                       max_results: int = 5) -> List[Dict[str, Any]]:
        """Search for doctors based on symptoms"""
        try:
            # Create search query that includes symptoms and location
            search_query = symptoms
            if user_location:
                search_query += f" {user_location}"
            
            # Search in ChromaDB with PostgreSQL backend
            doctor_results = self.chroma_service.search_doctors(
                query=search_query,
                n_results=max_results,
                min_satisfaction=70.0  # Only recommend doctors with 70%+ satisfaction
            )
            
            # Sort by satisfaction rate and similarity score
            doctor_results.sort(
                key=lambda x: (x.get('patient_satisfaction_rate', 0), x.get('similarity_score', 0)), 
                reverse=True
            )
            
            return doctor_results
            
        except Exception as e:
            logger.error(f"Error searching doctors: {e}")
            return []
    
    def _categorize_recommendations(self, 
                                  medicine_recs: Dict[str, Any], 
                                  doctor_recs: Dict[str, Any]) -> Dict[str, Any]:
        """Categorize recommendations into different types"""
        try:
            categorized = {
                "over_the_counter": [],
                "prescription_required": [],
                "doctors_by_specialization": {},
                "emergency_recommendations": [],
                "general_advice": []
            }
            
            # Categorize medicines
            if medicine_recs.get('recommendations'):
                for med in medicine_recs['recommendations']:
                    if med.get('prescription_required', False):
                        categorized['prescription_required'].append(med)
                    else:
                        categorized['over_the_counter'].append(med)
            
            # Categorize doctors by specialization
            if doctor_recs.get('recommendations'):
                for doctor in doctor_recs['recommendations']:
                    specialization = doctor.get('specialization', 'General')
                    if specialization not in categorized['doctors_by_specialization']:
                        categorized['doctors_by_specialization'][specialization] = []
                    categorized['doctors_by_specialization'][specialization].append(doctor)
            
            # Add general advice
            if medicine_recs.get('general_advice'):
                categorized['general_advice'].append(medicine_recs['general_advice'])
            if doctor_recs.get('general_advice'):
                categorized['general_advice'].append(doctor_recs['general_advice'])
            
            # Add emergency warnings
            if medicine_recs.get('emergency_warning'):
                categorized['emergency_recommendations'].append(medicine_recs['emergency_warning'])
            
            return categorized
            
        except Exception as e:
            logger.error(f"Error categorizing recommendations: {e}")
            return {}
    
    def get_medicine_details(self, medicine_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific medicine"""
        try:
            # This would typically query the database for full details
            # For now, return a placeholder
            return {
                "id": medicine_id,
                "message": "Detailed medicine information would be retrieved from database"
            }
        except Exception as e:
            logger.error(f"Error getting medicine details: {e}")
            return None
    
    def get_doctor_details(self, doctor_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific doctor"""
        try:
            # This would typically query the database for full details
            # For now, return a placeholder
            return {
                "id": doctor_id,
                "message": "Detailed doctor information would be retrieved from database"
            }
        except Exception as e:
            logger.error(f"Error getting doctor details: {e}")
            return None
    
    def search_medicines_by_name(self, medicine_name: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search medicines by name"""
        try:
            results = self.chroma_service.search_medicines(
                query=medicine_name,
                n_results=limit
            )
            return results
        except Exception as e:
            logger.error(f"Error searching medicines by name: {e}")
            return []
    
    def search_doctors_by_specialization(self, specialization: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search doctors by specialization"""
        try:
            results = self.chroma_service.search_doctors(
                query=specialization,
                n_results=limit,
                specialization_filter=specialization
            )
            return results
        except Exception as e:
            logger.error(f"Error searching doctors by specialization: {e}")
            return []
    
    def get_system_stats(self) -> Dict[str, Any]:
        """Get system statistics"""
        try:
            chroma_stats = self.chroma_service.get_collection_stats()
            return {
                "chromadb_stats": chroma_stats,
                "status": "operational",
                "timestamp": self._get_timestamp()
            }
        except Exception as e:
            logger.error(f"Error getting system stats: {e}")
            return {"status": "error", "error": str(e)}
    
    def _get_timestamp(self) -> str:
        """Get current timestamp"""
        from datetime import datetime
        return datetime.utcnow().isoformat()
    
    def _create_error_response(self, query: str, error: str) -> Dict[str, Any]:
        """Create error response"""
        return {
            "query": query,
            "error": error,
            "medicine_recommendations": {"recommendations": []},
            "doctor_recommendations": {"recommendations": []},
            "categorized_recommendations": {},
            "search_metadata": {
                "medicines_found": 0,
                "doctors_found": 0,
                "search_timestamp": self._get_timestamp()
            }
        }

# Global RAG service instance
rag_service = RAGService()
