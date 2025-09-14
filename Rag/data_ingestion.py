from sqlalchemy.orm import Session
from database import get_db, Medicine, Doctor, Specialization
from chroma_service import chroma_service
from typing import List, Dict, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DataIngestionService:
    def __init__(self):
        self.chroma_service = chroma_service
    
    def ingest_medicines(self, db: Session, batch_size: int = 1000):
        """Ingest medicines from PostgreSQL to ChromaDB with PostgreSQL backend"""
        try:
            logger.info("Starting medicine ingestion...")
            
            # Get total count
            total_medicines = db.query(Medicine).count()
            logger.info(f"Total medicines to ingest: {total_medicines}")
            
            # Process in batches
            offset = 0
            processed = 0
            
            while offset < total_medicines:
                # Fetch batch
                medicines = db.query(Medicine).offset(offset).limit(batch_size).all()
                
                if not medicines:
                    break
                
                # Convert to dictionaries
                medicine_dicts = []
                for medicine in medicines:
                    medicine_dict = {
                        'id': str(medicine.id),
                        'medicine_name': medicine.medicine_name,
                        'medicine_url': medicine.medicine_url,
                        'price': float(medicine.price) if medicine.price else 0,
                        'discount': float(medicine.discount) if medicine.discount else 0,
                        'stock': medicine.stock or 0,
                        'images': medicine.images,
                        'prescription_required': medicine.prescription_required,
                        'created_at': medicine.created_at.isoformat() if medicine.created_at else None,
                        'drug_description': medicine.drug_description,
                        'drug_category': medicine.drug_category,
                        'drug_varient': medicine.drug_varient
                    }
                    medicine_dicts.append(medicine_dict)
                
                # Add to ChromaDB with PostgreSQL backend
                self.chroma_service.add_medicines(medicine_dicts)
                
                processed += len(medicines)
                offset += batch_size
                
                logger.info(f"Processed {processed}/{total_medicines} medicines")
            
            logger.info("Medicine ingestion completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error ingesting medicines: {e}")
            return False
    
    def ingest_doctors(self, db: Session, batch_size: int = 1000):
        """Ingest doctors from PostgreSQL to ChromaDB with PostgreSQL backend"""
        try:
            logger.info("Starting doctor ingestion...")
            
            # Get total count
            total_doctors = db.query(Doctor).count()
            logger.info(f"Total doctors to ingest: {total_doctors}")
            
            # Process in batches
            offset = 0
            processed = 0
            
            while offset < total_doctors:
                # Fetch batch
                doctors = db.query(Doctor).offset(offset).limit(batch_size).all()
                
                if not doctors:
                    break
                
                # Convert to dictionaries
                doctor_dicts = []
                for doctor in doctors:
                    # Get specialization names from IDs
                    specialization_names = []
                    if doctor.specialization_ids:
                        spec_ids = doctor.specialization_ids if isinstance(doctor.specialization_ids, list) else [doctor.specialization_ids]
                        specializations = db.query(Specialization).filter(Specialization.id.in_(spec_ids)).all()
                        specialization_names = [spec.name for spec in specializations]
                    
                    doctor_dict = {
                        'id': str(doctor.id),
                        'user_id': str(doctor.user_id),
                        'first_name': doctor.first_name,
                        'last_name': doctor.last_name,
                        'specialization_ids': doctor.specialization_ids,
                        'specialization_names': specialization_names,
                        'qualifications': doctor.qualifications,
                        'experience_years': doctor.experience_years,
                        'patient_satisfaction_rate': float(doctor.patient_satisfaction_rate) if doctor.patient_satisfaction_rate else 0,
                        'hospital_id': str(doctor.hospital_id) if doctor.hospital_id else None,
                        'address': doctor.address,
                        'image': doctor.image,
                        'fee_pkr': float(doctor.fee_pkr) if doctor.fee_pkr else 0,
                        'is_active': doctor.is_active,
                        'created_at': doctor.created_at.isoformat() if doctor.created_at else None,
                        'updated_at': doctor.updated_at.isoformat() if doctor.updated_at else None
                    }
                    doctor_dicts.append(doctor_dict)
                
                # Add to ChromaDB with PostgreSQL backend
                self.chroma_service.add_doctors(doctor_dicts)
                
                processed += len(doctors)
                offset += batch_size
                
                logger.info(f"Processed {processed}/{total_doctors} doctors")
            
            logger.info("Doctor ingestion completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error ingesting doctors: {e}")
            return False
    
    def ingest_all_data(self, db: Session):
        """Ingest all data from PostgreSQL to ChromaDB with PostgreSQL backend"""
        try:
            logger.info("Starting full data ingestion...")
            
            # Clear existing collections
            self.chroma_service.medicine_collection.delete(where={})
            self.chroma_service.doctor_collection.delete(where={})
            
            # Ingest medicines
            medicine_success = self.ingest_medicines(db)
            
            # Ingest doctors
            doctor_success = self.ingest_doctors(db)
            
            if medicine_success and doctor_success:
                logger.info("Full data ingestion completed successfully")
                
                # Get final stats
                stats = self.chroma_service.get_collection_stats()
                logger.info(f"Final collection stats: {stats}")
                
                return True
            else:
                logger.error("Data ingestion failed")
                return False
                
        except Exception as e:
            logger.error(f"Error in full data ingestion: {e}")
            return False
    
    def update_medicine(self, db: Session, medicine_id: str):
        """Update a specific medicine in ChromaDB"""
        try:
            # Get medicine from database
            medicine = db.query(Medicine).filter(Medicine.id == medicine_id).first()
            if not medicine:
                logger.warning(f"Medicine {medicine_id} not found in database")
                return False
            
            # Convert to dictionary
            medicine_dict = {
                'id': str(medicine.id),
                'medicine_name': medicine.medicine_name,
                'medicine_url': medicine.medicine_url,
                'price': float(medicine.price) if medicine.price else 0,
                'discount': float(medicine.discount) if medicine.discount else 0,
                'stock': medicine.stock or 0,
                'images': medicine.images,
                'prescription_required': medicine.prescription_required,
                'created_at': medicine.created_at.isoformat() if medicine.created_at else None,
                'drug_description': medicine.drug_description,
                'drug_category': medicine.drug_category,
                'drug_varient': medicine.drug_varient
            }
            
            # Update in ChromaDB with PostgreSQL backend
            self.chroma_service.add_medicines([medicine_dict])
            logger.info(f"Updated medicine {medicine_id} in ChromaDB with PostgreSQL backend")
            return True
            
        except Exception as e:
            logger.error(f"Error updating medicine {medicine_id}: {e}")
            return False
    
    def update_doctor(self, db: Session, doctor_id: str):
        """Update a specific doctor in ChromaDB"""
        try:
            # Get doctor from database
            doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
            if not doctor:
                logger.warning(f"Doctor {doctor_id} not found in database")
                return False
            
            # Convert to dictionary
            doctor_dict = {
                'id': str(doctor.id),
                'user_id': str(doctor.user_id),
                'first_name': doctor.first_name,
                'last_name': doctor.last_name,
                'specialization_ids': doctor.specialization_ids,
                'qualifications': doctor.qualifications,
                'experience_years': doctor.experience_years,
                'patient_satisfaction_rate': float(doctor.patient_satisfaction_rate) if doctor.patient_satisfaction_rate else 0,
                'hospital_id': str(doctor.hospital_id) if doctor.hospital_id else None,
                'address': doctor.address,
                'image': doctor.image,
                'fee_pkr': float(doctor.fee_pkr) if doctor.fee_pkr else 0,
                'is_active': doctor.is_active,
                'created_at': doctor.created_at.isoformat() if doctor.created_at else None,
                'updated_at': doctor.updated_at.isoformat() if doctor.updated_at else None
            }
            
            # Update in ChromaDB with PostgreSQL backend
            self.chroma_service.add_doctors([doctor_dict])
            logger.info(f"Updated doctor {doctor_id} in ChromaDB with PostgreSQL backend")
            return True
            
        except Exception as e:
            logger.error(f"Error updating doctor {doctor_id}: {e}")
            return False

# Global data ingestion service instance
data_ingestion_service = DataIngestionService()
