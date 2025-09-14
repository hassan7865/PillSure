from sqlalchemy import create_engine, Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey, DECIMAL
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from config import settings

# Database connection
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Specialization(Base):
    __tablename__ = "specializations"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class Medicine(Base):
    __tablename__ = "medicines"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    medicine_name = Column(String(255), nullable=False)
    medicine_url = Column(String(500))
    price = Column(DECIMAL(10, 2), nullable=False)
    discount = Column(Float, default=0.0)
    stock = Column(Integer, default=0)
    images = Column(JSON)
    prescription_required = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    drug_description = Column(Text)
    drug_category = Column(String(100))
    drug_varient = Column(String(100))

class Doctor(Base):
    __tablename__ = "doctors"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    specialization_ids = Column(JSON, nullable=False)
    qualifications = Column(JSON, nullable=False)
    experience_years = Column(Integer, nullable=False)
    patient_satisfaction_rate = Column(DECIMAL(5, 2), nullable=False)
    hospital_id = Column(UUID(as_uuid=True))
    address = Column(Text, nullable=False)
    image = Column(String(500))
    fee_pkr = Column(DECIMAL(10, 2))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    Base.metadata.create_all(bind=engine)
