import chromadb
from chromadb.config import Settings
from typing import List, Dict, Any, Optional
import uuid
from config import settings
from embedding_service import embedding_service


class ChromaService:
    def __init__(self):
        self.client = None
        self.medicine_collection = None
        self.doctor_collection = None
        self._initialize_client()

    def _initialize_client(self):
        """Initialize ChromaDB client and collections with PostgreSQL backend"""
        try:
            # Connect to ChromaDB server with PostgreSQL backend
            self.client = chromadb.HttpClient(
                host=getattr(settings, 'CHROMA_HOST', 'localhost'),
                port=getattr(settings, 'CHROMA_PORT', 8000),
                settings=Settings(
                    anonymized_telemetry=False
                )
            )

            # Create or get collections
            self.medicine_collection = self.client.get_or_create_collection(
                name="medicines",
                metadata={"hnsw:space": "cosine"}
            )

            self.doctor_collection = self.client.get_or_create_collection(
                name="doctors",
                metadata={"hnsw:space": "cosine"}
            )

            print("ChromaDB client initialized successfully with PostgreSQL backend")

        except Exception as e:
            print(f"Error initializing ChromaDB: {e}")
            print("Please ensure ChromaDB server is running with PostgreSQL backend")
            raise

    def add_medicines(self, medicines: List[Dict[str, Any]]):
        """Add medicines to ChromaDB collection"""
        try:
            ids, documents, embeddings, metadatas = [], [], [], []

            for medicine in medicines:
                # Generate unique ID
                medicine_id = str(medicine.get('id', uuid.uuid4()))
                ids.append(medicine_id)

                # Create searchable text
                document = embedding_service.encode_medicine(medicine)
                documents.append(document)

                # Generate embedding
                embedding = embedding_service.encode_text(document)[0].tolist()
                embeddings.append(embedding)

                # Prepare metadata
                metadata = {
                    'medicine_name': medicine.get('medicine_name', ''),
                    'price': float(medicine.get('price', 0)),
                    'discount': float(medicine.get('discount', 0)),
                    'prescription_required': medicine.get('prescription_required', False),
                    'drug_category': medicine.get('drug_category', ''),
                    'stock': medicine.get('stock', 0)
                }
                metadatas.append(metadata)

            # Add to collection
            self.medicine_collection.add(
                ids=ids,
                documents=documents,
                embeddings=embeddings,
                metadatas=metadatas
            )

            print(f"Added {len(medicines)} medicines to ChromaDB")

        except Exception as e:
            print(f"Error adding medicines to ChromaDB: {e}")
            raise

    def add_doctors(self, doctors: List[Dict[str, Any]]):
        """Add doctors to ChromaDB collection"""
        try:
            ids, documents, embeddings, metadatas = [], [], [], []

            for doctor in doctors:
                doctor_id = str(doctor.get('id', uuid.uuid4()))
                ids.append(doctor_id)

                document = embedding_service.encode_doctor(doctor)
                documents.append(document)

                embedding = embedding_service.encode_text(document)[0].tolist()
                embeddings.append(embedding)

                # Convert lists to strings for ChromaDB metadata compatibility
                specialization_ids = doctor.get('specialization_ids', [])
                specialization_names = doctor.get('specialization_names', [])
                
                metadata = {
                    'first_name': doctor.get('first_name', ''),
                    'last_name': doctor.get('last_name', ''),
                    'specialization_ids': ','.join(map(str, specialization_ids)) if specialization_ids else '',
                    'specialization_names': ','.join(specialization_names) if specialization_names else '',
                    'experience_years': doctor.get('experience_years', 0),
                    'patient_satisfaction_rate': float(doctor.get('patient_satisfaction_rate', 0)),
                    'fee_pkr': float(doctor.get('fee_pkr', 0)) if doctor.get('fee_pkr') else 0,
                    'is_active': doctor.get('is_active', True)
                }
                metadatas.append(metadata)

            self.doctor_collection.add(
                ids=ids,
                documents=documents,
                embeddings=embeddings,
                metadatas=metadatas
            )

            print(f"Added {len(doctors)} doctors to ChromaDB")

        except Exception as e:
            print(f"Error adding doctors to ChromaDB: {e}")
            raise

    def search_medicines(self, query: str, n_results: int = 10,
                         prescription_filter: Optional[bool] = None,
                         category_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """Search for medicines based on query"""
        try:
            query_embedding = embedding_service.encode_text(query)[0].tolist()

            where_clause = {}
            if prescription_filter is not None:
                where_clause['prescription_required'] = prescription_filter
            if category_filter:
                where_clause['drug_category'] = category_filter

            results = self.medicine_collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where=where_clause if where_clause else None
            )

            medicines = []
            if results['ids'] and results['ids'][0]:
                for i in range(len(results['ids'][0])):
                    medicine = {
                        'id': results['ids'][0][i],
                        'medicine_name': results['metadatas'][0][i].get('medicine_name', ''),
                        'price': results['metadatas'][0][i].get('price', 0),
                        'discount': results['metadatas'][0][i].get('discount', 0),
                        'prescription_required': results['metadatas'][0][i].get('prescription_required', False),
                        'drug_category': results['metadatas'][0][i].get('drug_category', ''),
                        'stock': results['metadatas'][0][i].get('stock', 0),
                        'similarity_score': 1 - results['distances'][0][i] if results['distances'] else 0,
                        'document': results['documents'][0][i] if results['documents'] else ''
                    }
                    medicines.append(medicine)

            return medicines

        except Exception as e:
            print(f"Error searching medicines: {e}")
            return []

    def search_doctors(self, query: str, n_results: int = 10,
                       specialization_filter: Optional[str] = None,
                       min_satisfaction: Optional[float] = None) -> List[Dict[str, Any]]:
        """Search for doctors based on query"""
        try:
            query_embedding = embedding_service.encode_text(query)[0].tolist()

            where_clause = {'is_active': True}
            if specialization_filter:
                where_clause['specialization_names'] = {"$contains": specialization_filter}
            if min_satisfaction is not None:
                where_clause['patient_satisfaction_rate'] = {"$gte": min_satisfaction}

            results = self.doctor_collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where=where_clause
            )

            doctors = []
            if results['ids'] and results['ids'][0]:
                for i in range(len(results['ids'][0])):
                    # Convert string back to lists for API compatibility
                    specialization_ids_str = results['metadatas'][0][i].get('specialization_ids', '')
                    specialization_names_str = results['metadatas'][0][i].get('specialization_names', '')
                    
                    doctor = {
                        'id': results['ids'][0][i],
                        'first_name': results['metadatas'][0][i].get('first_name', ''),
                        'last_name': results['metadatas'][0][i].get('last_name', ''),
                        'specialization_ids': specialization_ids_str.split(',') if specialization_ids_str else [],
                        'specialization_names': specialization_names_str.split(',') if specialization_names_str else [],
                        'experience_years': results['metadatas'][0][i].get('experience_years', 0),
                        'patient_satisfaction_rate': results['metadatas'][0][i].get('patient_satisfaction_rate', 0),
                        'fee_pkr': results['metadatas'][0][i].get('fee_pkr', 0),
                        'similarity_score': 1 - results['distances'][0][i] if results['distances'] else 0,
                        'document': results['documents'][0][i] if results['documents'] else ''
                    }
                    doctors.append(doctor)

            return doctors

        except Exception as e:
            print(f"Error searching doctors: {e}")
            return []

    def get_collection_stats(self) -> Dict[str, int]:
        """Get statistics about the collections"""
        try:
            return {
                'medicines': self.medicine_collection.count(),
                'doctors': self.doctor_collection.count()
            }
        except Exception as e:
            print(f"Error getting collection stats: {e}")
            return {'medicines': 0, 'doctors': 0}


# Global ChromaDB service instance
chroma_service = ChromaService()