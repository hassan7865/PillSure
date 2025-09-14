import google.generativeai as genai
from typing import List, Dict, Any, Optional
from config import settings
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        if not self.api_key:
            raise ValueError("Gemini API key is required")
        
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        logger.info("Gemini service initialized successfully")
    
    def generate_medicine_recommendations(self, 
                                       symptoms: str, 
                                       medicine_results: List[Dict[str, Any]],
                                       user_preferences: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Generate medicine recommendations based on symptoms and search results
        
        Args:
            symptoms: User's symptoms description
            medicine_results: List of medicine search results from ChromaDB
            user_preferences: Optional user preferences (budget, prescription preference, etc.)
            
        Returns:
            Dictionary containing recommendations and reasoning
        """
        try:
            # Prepare context for the AI
            medicine_context = self._prepare_medicine_context(medicine_results)
            preferences_context = self._prepare_preferences_context(user_preferences)
            
            prompt = f"""
You are a medical AI assistant that helps patients find appropriate medicines based on their symptoms. 
You have access to a database of medicines and should provide helpful, safe recommendations.

PATIENT SYMPTOMS: {symptoms}

AVAILABLE MEDICINES:
{medicine_context}

USER PREFERENCES:
{preferences_context}

Please analyze the symptoms and provide recommendations following these guidelines:

1. SAFETY FIRST: Only recommend medicines that are appropriate for the described symptoms
2. PRESCRIPTION REQUIREMENTS: Clearly indicate if a medicine requires a prescription
3. PRIORITIZE: Rank medicines by relevance to symptoms and safety
4. EXPLAIN: Provide clear reasoning for each recommendation
5. WARNINGS: Include any important warnings or side effects
6. ALTERNATIVES: Suggest alternatives if available

Format your response as JSON with the following structure:
{{
    "recommendations": [
        {{
            "medicine_name": "Medicine Name",
            "reasoning": "Why this medicine is recommended",
            "prescription_required": true/false,
            "price": 100.0,
            "discount": 10.0,
            "safety_rating": "high/medium/low",
            "warnings": ["warning1", "warning2"],
            "alternatives": ["alt1", "alt2"]
        }}
    ],
    "general_advice": "General health advice for these symptoms",
    "when_to_see_doctor": "When the patient should consult a doctor",
    "emergency_warning": "Any emergency situations to watch for"
}}

IMPORTANT: 
- Be conservative with recommendations
- Always emphasize consulting a doctor for serious symptoms
- Don't recommend prescription medicines without proper medical consultation
- Consider the patient's budget and preferences
"""

            response = self.model.generate_content(prompt)
            
            # Parse the response
            try:
                # Extract JSON from response
                response_text = response.text
                # Find JSON in the response
                start_idx = response_text.find('{')
                end_idx = response_text.rfind('}') + 1
                
                if start_idx != -1 and end_idx != -1:
                    json_str = response_text[start_idx:end_idx]
                    recommendations = json.loads(json_str)
                else:
                    # Fallback if JSON parsing fails
                    recommendations = self._create_fallback_recommendations(medicine_results)
                
                return recommendations
                
            except json.JSONDecodeError as e:
                logger.error(f"Error parsing Gemini response: {e}")
                return self._create_fallback_recommendations(medicine_results)
                
        except Exception as e:
            logger.error(f"Error generating medicine recommendations: {e}")
            return self._create_fallback_recommendations(medicine_results)
    
    def generate_doctor_recommendations(self, 
                                      symptoms: str,
                                      doctor_results: List[Dict[str, Any]],
                                      user_location: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate doctor recommendations based on symptoms and search results
        
        Args:
            symptoms: User's symptoms description
            doctor_results: List of doctor search results from ChromaDB
            user_location: Optional user location for proximity matching
            
        Returns:
            Dictionary containing doctor recommendations
        """
        try:
            # Prepare context for the AI
            doctor_context = self._prepare_doctor_context(doctor_results)
            
            prompt = f"""
You are a medical AI assistant that helps patients find appropriate doctors based on their symptoms and needs.

PATIENT SYMPTOMS: {symptoms}
USER LOCATION: {user_location or "Not specified"}

AVAILABLE DOCTORS:
{doctor_context}

Please analyze the symptoms and provide doctor recommendations following these guidelines:

1. SPECIALIZATION MATCH: Recommend doctors whose specializations match the symptoms
2. EXPERIENCE: Consider years of experience
3. SATISFACTION: Prioritize doctors with higher patient satisfaction rates
4. LOCATION: Consider proximity if location is provided
5. AVAILABILITY: Only recommend active doctors
6. EXPLAIN: Provide clear reasoning for each recommendation

Format your response as JSON with the following structure:
{{
    "recommendations": [
        {{
            "doctor_name": "Dr. First Last",
            "specialization": "Cardiology",
            "experience_years": 10,
            "patient_satisfaction": 95.5,
            "consultation_fee": 2000.0,
            "location": "Hospital Address",
            "reasoning": "Why this doctor is recommended",
            "qualifications": ["MBBS", "MD"],
            "availability": "Available"
        }}
    ],
    "urgency_level": "low/medium/high",
    "general_advice": "General advice for these symptoms",
    "when_to_see_doctor": "When to schedule an appointment"
}}

IMPORTANT:
- Only recommend doctors whose specializations are relevant to the symptoms
- Consider the patient's location and budget
- Provide clear reasoning for each recommendation
"""

            response = self.model.generate_content(prompt)
            
            # Parse the response
            try:
                response_text = response.text
                start_idx = response_text.find('{')
                end_idx = response_text.rfind('}') + 1
                
                if start_idx != -1 and end_idx != -1:
                    json_str = response_text[start_idx:end_idx]
                    recommendations = json.loads(json_str)
                else:
                    recommendations = self._create_fallback_doctor_recommendations(doctor_results)
                
                return recommendations
                
            except json.JSONDecodeError as e:
                logger.error(f"Error parsing Gemini response: {e}")
                return self._create_fallback_doctor_recommendations(doctor_results)
                
        except Exception as e:
            logger.error(f"Error generating doctor recommendations: {e}")
            return self._create_fallback_doctor_recommendations(doctor_results)
    
    def _prepare_medicine_context(self, medicine_results: List[Dict[str, Any]]) -> str:
        """Prepare medicine context for AI prompt"""
        context_parts = []
        
        for i, medicine in enumerate(medicine_results[:10], 1):  # Limit to top 10
            context = f"""
{i}. {medicine.get('medicine_name', 'Unknown')}
   - Price: {medicine.get('price', 0)} PKR
   - Discount: {medicine.get('discount', 0)}%
   - Prescription Required: {medicine.get('prescription_required', False)}
   - Category: {medicine.get('drug_category', 'Unknown')}
   - Stock: {medicine.get('stock', 0)}
   - Description: {medicine.get('document', 'No description available')}
   - Similarity Score: {medicine.get('similarity_score', 0):.2f}
"""
            context_parts.append(context)
        
        return "\n".join(context_parts)
    
    def _prepare_doctor_context(self, doctor_results: List[Dict[str, Any]]) -> str:
        """Prepare doctor context for AI prompt"""
        context_parts = []
        
        for i, doctor in enumerate(doctor_results[:10], 1):  # Limit to top 10
            # Use specialization names if available, otherwise fall back to IDs
            specializations = doctor.get('specialization_names', [])
            if not specializations:
                specializations = doctor.get('specialization_ids', [])
            
            context = f"""
{i}. Dr. {doctor.get('first_name', '')} {doctor.get('last_name', '')}
   - Specializations: {', '.join(specializations) if specializations else 'Not specified'}
   - Experience: {doctor.get('experience_years', 0)} years
   - Patient Satisfaction: {doctor.get('patient_satisfaction_rate', 0)}%
   - Consultation Fee: {doctor.get('fee_pkr', 0)} PKR
   - Location: {doctor.get('document', 'Address not available')}
   - Similarity Score: {doctor.get('similarity_score', 0):.2f}
"""
            context_parts.append(context)
        
        return "\n".join(context_parts)
    
    def _prepare_preferences_context(self, user_preferences: Optional[Dict[str, Any]]) -> str:
        """Prepare user preferences context for AI prompt"""
        if not user_preferences:
            return "No specific preferences provided"
        
        preferences = []
        if user_preferences.get('budget'):
            preferences.append(f"Budget: {user_preferences['budget']} PKR")
        if user_preferences.get('prescription_preference'):
            preferences.append(f"Prescription Preference: {user_preferences['prescription_preference']}")
        if user_preferences.get('category_preference'):
            preferences.append(f"Category Preference: {user_preferences['category_preference']}")
        
        return "\n".join(preferences) if preferences else "No specific preferences provided"
    
    def _create_fallback_recommendations(self, medicine_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Create fallback recommendations if AI fails"""
        recommendations = []
        
        for medicine in medicine_results[:5]:  # Top 5 results
            rec = {
                "medicine_name": medicine.get('medicine_name', 'Unknown'),
                "reasoning": f"Based on similarity score: {medicine.get('similarity_score', 0):.2f}",
                "prescription_required": medicine.get('prescription_required', False),
                "price": medicine.get('price', 0),
                "discount": medicine.get('discount', 0),
                "safety_rating": "medium",
                "warnings": ["Consult a doctor before use"],
                "alternatives": []
            }
            recommendations.append(rec)
        
        return {
            "recommendations": recommendations,
            "general_advice": "Please consult a healthcare professional for proper diagnosis and treatment.",
            "when_to_see_doctor": "If symptoms persist or worsen, consult a doctor immediately.",
            "emergency_warning": "Seek immediate medical attention for severe symptoms."
        }
    
    def _create_fallback_doctor_recommendations(self, doctor_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Create fallback doctor recommendations if AI fails"""
        recommendations = []
        
        for doctor in doctor_results[:5]:  # Top 5 results
            rec = {
                "doctor_name": f"Dr. {doctor.get('first_name', '')} {doctor.get('last_name', '')}",
                "specialization": ', '.join(doctor.get('specialization_ids', [])),
                "experience_years": doctor.get('experience_years', 0),
                "patient_satisfaction": doctor.get('patient_satisfaction_rate', 0),
                "consultation_fee": doctor.get('fee_pkr', 0),
                "location": "Address not available",
                "reasoning": f"Based on similarity score: {doctor.get('similarity_score', 0):.2f}",
                "qualifications": [],
                "availability": "Contact for availability"
            }
            recommendations.append(rec)
        
        return {
            "recommendations": recommendations,
            "urgency_level": "medium",
            "general_advice": "Please consult a healthcare professional for proper diagnosis and treatment.",
            "when_to_see_doctor": "Schedule an appointment as soon as possible."
        }

# Global Gemini service instance
gemini_service = GeminiService()
