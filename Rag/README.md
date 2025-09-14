# Medicine & Doctor RAG System

An AI-powered Retrieval-Augmented Generation (RAG) system for medicine and doctor recommendations based on patient symptoms. This system uses Hugging Face embeddings, PostgreSQL with pgvector extension for vector storage, and Gemini 2.5 API for intelligent recommendations.

## Features

- **Symptom-based Medicine Recommendations**: Get medicine suggestions based on patient symptoms
- **Doctor Recommendations**: Find appropriate doctors based on specialization and patient satisfaction
- **Prescription Management**: Distinguish between prescription and over-the-counter medicines
- **AI-Powered Analysis**: Uses Gemini 2.5 API for intelligent reasoning and recommendations
- **Vector Search**: Fast similarity search using Hugging Face embeddings and PostgreSQL pgvector
- **RESTful API**: Easy-to-use FastAPI endpoints for integration
- **Unified Database**: All data and vectors stored in PostgreSQL (no separate vector database needed)
- **Easy Migration**: Simple migration from ChromaDB to PostgreSQL vector database

## Architecture

```
┌─────────────────────────────────────┐    ┌─────────────────┐
│         PostgreSQL                  │    │   Gemini 2.5    │
│  ┌─────────────────┐ ┌─────────────┐│    │   (AI Engine)   │
│  │   Data Store    │ │Vector Store ││───▶│                 │
│  │  (Tables)       │ │(pgvector)   ││    │                 │
│  └─────────────────┘ └─────────────┘│    └─────────────────┘
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI Application                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   RAG       │  │  Embedding  │  │   Data      │            │
│  │  Service    │  │  Service    │  │ Ingestion   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### Specializations Table
- `id` (SERIAL): Primary key
- `name` (VARCHAR): Specialization name (unique)
- `description` (TEXT): Specialization description
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

### Medicines Table
- `id` (UUID): Primary key
- `medicine_name` (VARCHAR): Name of the medicine
- `medicine_url` (VARCHAR): URL to medicine details
- `price` (DECIMAL): Price in PKR
- `discount` (FLOAT): Discount percentage
- `stock` (INTEGER): Available stock
- `images` (JSON): Medicine images
- `prescription_required` (BOOLEAN): Whether prescription is required
- `created_at` (TIMESTAMP): Creation timestamp
- `drug_description` (TEXT): Medicine description
- `drug_category` (VARCHAR): Medicine category
- `drug_varient` (VARCHAR): Medicine variant

### Doctors Table
- `id` (UUID): Primary key
- `user_id` (UUID): Reference to users table
- `first_name` (VARCHAR): Doctor's first name
- `last_name` (VARCHAR): Doctor's last name
- `specialization_ids` (JSONB): Array of specialization IDs
- `qualifications` (JSONB): Doctor's qualifications
- `experience_years` (INTEGER): Years of experience
- `patient_satisfaction_rate` (DECIMAL): Patient satisfaction percentage
- `hospital_id` (UUID): Reference to hospital
- `address` (TEXT): Doctor's address
- `image` (VARCHAR): Doctor's profile image
- `fee_pkr` (DECIMAL): Consultation fee in PKR
- `is_active` (BOOLEAN): Whether doctor is active
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

## Installation

### Prerequisites
- Python 3.8+
- PostgreSQL 12+ with pgvector extension (with existing medicine and doctor tables)
- 8GB+ RAM (for embedding model)
- Gemini API key

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd rag-system
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Configure database**
   - Create PostgreSQL database
   - Install pgvector extension: `CREATE EXTENSION IF NOT EXISTS vector;`
   - Update `DATABASE_URL` in `.env` file
   - Ensure your database has the required tables

6. **Set up Gemini API**
   - Get API key from Google AI Studio
   - Add to `GEMINI_API_KEY` in `.env` file

7. **Run data ingestion** (since tables already exist)
   ```bash
   python migrate_data.py
   ```
   
   **Or migrate from ChromaDB to PostgreSQL vector database:**
   ```bash
   python migrate_to_postgres_vector.py
   ```

8. **Start the API server**
   ```bash
   python main.py
   ```

## API Endpoints

### Main Query Endpoint
- **POST** `/query/symptoms` - Main RAG query for symptom-based recommendations

### Medicine Endpoints
- **POST** `/search/medicines` - Search medicines by name
- **GET** `/medicines/{medicine_id}` - Get medicine details

### Doctor Endpoints
- **POST** `/search/doctors` - Search doctors by specialization
- **GET** `/doctors/{doctor_id}` - Get doctor details
- **GET** `/specializations` - Get all available specializations

### Admin Endpoints
- **POST** `/admin/ingest-data` - Ingest all data from PostgreSQL to PostgreSQL vector database
- **POST** `/admin/ingest-medicines` - Ingest medicines only
- **POST** `/admin/ingest-doctors` - Ingest doctors only

### System Endpoints
- **GET** `/health` - Health check
- **GET** `/stats` - System statistics
- **GET** `/examples/queries` - Example queries for testing

## Usage Examples

### 1. Basic Symptom Query
```bash
curl -X POST "http://localhost:8000/query/symptoms" \
  -H "Content-Type: application/json" \
  -d '{
    "symptoms": "I have a headache and fever",
    "user_preferences": {
      "budget": 500.0,
      "prescription_preference": false
    },
    "user_location": "Karachi, Pakistan"
  }'
```

### 2. Search Medicines
```bash
curl -X POST "http://localhost:8000/search/medicines" \
  -H "Content-Type: application/json" \
  -d '{
    "medicine_name": "paracetamol",
    "limit": 5
  }'
```

### 3. Search Doctors
```bash
curl -X POST "http://localhost:8000/search/doctors" \
  -H "Content-Type: application/json" \
  -d '{
    "specialization": "cardiology",
    "limit": 5
  }'
```

### 4. Get Specializations
```bash
curl -X GET "http://localhost:8000/specializations"
```

## Configuration

### Environment Variables
```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/medicinedb
DB_HOST=localhost
DB_PORT=5432
DB_NAME=medicinedb
DB_USER=username
DB_PASSWORD=password

# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# PostgreSQL Vector Configuration (pgvector extension required)
# No additional configuration needed - uses same DATABASE_URL

# Application Configuration
DEBUG=True
HOST=0.0.0.0
PORT=8000
```

### Model Configuration
- **Embedding Model**: `sentence-transformers/all-MiniLM-L6-v2`
- **AI Model**: `gemini-2.0-flash-exp`
- **Vector Space**: Cosine similarity
- **Top K Results**: 10 (configurable)

## Response Format

### Symptom Query Response
```json
{
  "query": "I have a headache and fever",
  "medicine_recommendations": {
    "recommendations": [
      {
        "medicine_name": "Paracetamol 500mg",
        "reasoning": "Effective for headache and fever relief",
        "prescription_required": false,
        "price": 25.0,
        "discount": 10.0,
        "safety_rating": "high",
        "warnings": ["Do not exceed recommended dosage"],
        "alternatives": ["Ibuprofen", "Aspirin"]
      }
    ],
    "general_advice": "Rest and stay hydrated",
    "when_to_see_doctor": "If symptoms persist for more than 3 days",
    "emergency_warning": "Seek immediate medical attention for severe symptoms"
  },
  "doctor_recommendations": {
    "recommendations": [
      {
        "doctor_name": "Dr. Ahmed Khan",
        "specialization": "General Medicine",
        "experience_years": 15,
        "patient_satisfaction": 95.5,
        "consultation_fee": 2000.0,
        "location": "Aga Khan Hospital, Karachi",
        "reasoning": "Experienced general physician for common symptoms",
        "qualifications": ["MBBS", "MD"],
        "availability": "Available"
      }
    ],
    "urgency_level": "low",
    "general_advice": "Monitor symptoms and rest",
    "when_to_see_doctor": "If symptoms worsen"
  },
  "categorized_recommendations": {
    "over_the_counter": [...],
    "prescription_required": [...],
    "doctors_by_specialization": {...},
    "emergency_recommendations": [...],
    "general_advice": [...]
  },
  "search_metadata": {
    "medicines_found": 5,
    "doctors_found": 3,
    "search_timestamp": "2024-01-01T12:00:00Z"
  }
}
```

## Migration from ChromaDB

If you're migrating from the previous ChromaDB-based version, follow these steps:

### 1. Install pgvector Extension
```sql
-- Connect to your PostgreSQL database and run:
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Update Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run Migration Script
```bash
python migrate_to_postgres_vector.py
```

This script will:
- Create the necessary vector tables in PostgreSQL
- Migrate all existing data from PostgreSQL to the vector tables
- Verify the migration was successful
- Optionally clean up old ChromaDB data

### 4. Test the Migration
```bash
python test_postgres_vector.py
```

## Development

### Running Tests
```bash
python test_postgres_vector.py
```

### Adding New Features
1. Update the appropriate service class
2. Add new API endpoints in `main.py`
3. Update the database models if needed
4. Test with sample data

### Monitoring
- Check `/health` endpoint for system status
- Monitor `/stats` for collection statistics
- Review logs for error tracking

## Troubleshooting

### Common Issues

1. **PostgreSQL Vector Error**
   - Ensure pgvector extension is installed: `CREATE EXTENSION IF NOT EXISTS vector;`
   - Check PostgreSQL connection and permissions

2. **Gemini API Error**
   - Verify API key is correct
   - Check API quota and limits

3. **Database Connection Error**
   - Verify PostgreSQL is running
   - Check connection string in `.env`

4. **Embedding Model Error**
   - Ensure sufficient RAM (8GB+)
   - Check internet connection for model download

### Performance Optimization

1. **Batch Processing**: Use batch processing for large data ingestion
2. **Caching**: Implement Redis caching for frequent queries
3. **Indexing**: Optimize database indexes for better performance
4. **Model Optimization**: Use quantized models for faster inference

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## Roadmap

- [ ] Add user authentication
- [ ] Implement caching layer
- [ ] Add more embedding models
- [ ] Support for multiple languages
- [ ] Mobile app integration
- [ ] Advanced analytics dashboard
