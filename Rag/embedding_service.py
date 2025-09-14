import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List, Union
import torch
from config import settings

class EmbeddingService:
    def __init__(self, model_name: str = None):
        self.model_name = model_name or settings.EMBEDDING_MODEL
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Load the sentence transformer model"""
        try:
            self.model = SentenceTransformer(self.model_name)
            print(f"Loaded embedding model: {self.model_name}")
        except Exception as e:
            print(f"Error loading model {self.model_name}: {e}")
            # Fallback to a more basic model
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
    
    def encode_text(self, text: Union[str, List[str]]) -> np.ndarray:
        """
        Encode text(s) into embeddings
        
        Args:
            text: Single text string or list of text strings
            
        Returns:
            numpy array of embeddings
        """
        if isinstance(text, str):
            text = [text]
        
        try:
            embeddings = self.model.encode(text, convert_to_numpy=True)
            return embeddings
        except Exception as e:
            print(f"Error encoding text: {e}")
            # Return zero embeddings as fallback
            embedding_dim = 384  # Default dimension for all-MiniLM-L6-v2
            if isinstance(text, list):
                return np.zeros((len(text), embedding_dim))
            else:
                return np.zeros((1, embedding_dim))
    
    def encode_medicine(self, medicine_data: dict) -> str:
        """
        Create a searchable text representation of medicine data
        
        Args:
            medicine_data: Dictionary containing medicine information
            
        Returns:
            Formatted text string for embedding
        """
        text_parts = []
        
        # Add medicine name
        if medicine_data.get('medicine_name'):
            text_parts.append(f"Medicine: {medicine_data['medicine_name']}")
        
        # Add description
        if medicine_data.get('drug_description'):
            text_parts.append(f"Description: {medicine_data['drug_description']}")
        
        # Add category
        if medicine_data.get('drug_category'):
            text_parts.append(f"Category: {medicine_data['drug_category']}")
        
        # Add variant
        if medicine_data.get('drug_varient'):
            text_parts.append(f"Variant: {medicine_data['drug_varient']}")
        
        # Add prescription requirement
        prescription_text = "Prescription required" if medicine_data.get('prescription_required') else "No prescription required"
        text_parts.append(f"Prescription: {prescription_text}")
        
        # Add price and discount info
        if medicine_data.get('price'):
            price_text = f"Price: {medicine_data['price']}"
            if medicine_data.get('discount', 0) > 0:
                price_text += f" (Discount: {medicine_data['discount']}%)"
            text_parts.append(price_text)
        
        return " | ".join(text_parts)
    
    def encode_doctor(self, doctor_data: dict) -> str:
        """
        Create a searchable text representation of doctor data
        
        Args:
            doctor_data: Dictionary containing doctor information
            
        Returns:
            Formatted text string for embedding
        """
        text_parts = []
        
        # Add doctor name
        if doctor_data.get('first_name') and doctor_data.get('last_name'):
            text_parts.append(f"Doctor: {doctor_data['first_name']} {doctor_data['last_name']}")
        
        # Add specializations (prefer names over IDs)
        if doctor_data.get('specialization_names'):
            specializations = doctor_data['specialization_names']
            if isinstance(specializations, list):
                text_parts.append(f"Specializations: {', '.join(specializations)}")
            else:
                text_parts.append(f"Specializations: {specializations}")
        elif doctor_data.get('specialization_ids'):
            specializations = doctor_data['specialization_ids']
            if isinstance(specializations, list):
                text_parts.append(f"Specializations: {', '.join(specializations)}")
            else:
                text_parts.append(f"Specializations: {specializations}")
        
        # Add qualifications
        if doctor_data.get('qualifications'):
            qualifications = doctor_data['qualifications']
            if isinstance(qualifications, list):
                text_parts.append(f"Qualifications: {', '.join(qualifications)}")
            else:
                text_parts.append(f"Qualifications: {qualifications}")
        
        # Add experience
        if doctor_data.get('experience_years'):
            text_parts.append(f"Experience: {doctor_data['experience_years']} years")
        
        # Add satisfaction rate
        if doctor_data.get('patient_satisfaction_rate'):
            text_parts.append(f"Patient Satisfaction: {doctor_data['patient_satisfaction_rate']}%")
        
        # Add address
        if doctor_data.get('address'):
            text_parts.append(f"Location: {doctor_data['address']}")
        
        # Add fee
        if doctor_data.get('fee_pkr'):
            text_parts.append(f"Consultation Fee: {doctor_data['fee_pkr']} PKR")
        
        return " | ".join(text_parts)

# Global embedding service instance
embedding_service = EmbeddingService()
