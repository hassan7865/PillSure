import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Database Configuration
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://pillsure:pillsure123@localhost:5432/pillsure")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "pillsure")
    DB_USER = os.getenv("DB_USER", "pillsure")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "pillsure123")
    
    # Gemini API
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY","")
    
    # ChromaDB Configuration
    CHROMA_PERSIST_DIRECTORY = os.getenv("CHROMA_PERSIST_DIRECTORY", "./chroma_db")
    
    # ChromaDB PostgreSQL Configuration
    CHROMA_DB_IMPL = "chromadb.db.postgres.PostgresDB"
    CHROMA_POSTGRES_HOST = os.getenv("CHROMA_POSTGRES_HOST", DB_HOST)
    CHROMA_POSTGRES_PORT = os.getenv("CHROMA_POSTGRES_PORT", DB_PORT)
    CHROMA_POSTGRES_DATABASE = os.getenv("CHROMA_POSTGRES_DATABASE", f"{DB_NAME}_chroma")
    CHROMA_POSTGRES_USER = os.getenv("CHROMA_POSTGRES_USER", DB_USER)
    CHROMA_POSTGRES_PASSWORD = os.getenv("CHROMA_POSTGRES_PASSWORD", DB_PASSWORD)
    CHROMA_POSTGRES_URL = f"postgresql://{CHROMA_POSTGRES_USER}:{CHROMA_POSTGRES_PASSWORD}@{CHROMA_POSTGRES_HOST}:{CHROMA_POSTGRES_PORT}/{CHROMA_POSTGRES_DATABASE}"
    
    # Application Configuration
    DEBUG = os.getenv("DEBUG", "True").lower() == "true"
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "8000"))
    
    # Embedding Model
    EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
    
    # RAG Configuration
    TOP_K_RESULTS = 10
    SIMILARITY_THRESHOLD = 0.7

settings = Settings()
