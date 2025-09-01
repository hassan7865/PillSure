# PillSure 🏥💊

> **Transforming Healthcare Through Secure Digital Medicine Management**

PillSure is a comprehensive digital healthcare platform that revolutionizes the way patients, doctors, pharmacists, and administrators interact in the medical ecosystem. Our platform addresses critical challenges in healthcare including prescription fraud, self-medication risks, and inefficient communication between healthcare providers.

## 🌟 Key Features

### 🔐 **Security First**
- **End-to-end encryption** for all sensitive data
- **Role-based access control** with JWT authentication
- **Audit logs** for complete transaction tracking
- **Prescription verification** by certified doctors
- **Pharmacist validation** before dispensing

### 👥 **Four Core User Roles**
- **👨‍⚕️ Doctor**: Prescribe medications and verify prescriptions
- **💊 Pharmacist**: Review and validate prescriptions before dispensing
- **👤 Patient**: Browse medicines, consult doctors, and place orders
- **⚙️ Admin**: System management and oversight

### 🛒 **Patient Experience**
- **User-friendly e-store** for browsing medications
- **Doctor consultation** for prescription-based drugs
- **Automated order forwarding** to pharmacists
- **Real-time order tracking** and status updates

## 🏗️ Architecture

### Frontend (Client)
- **Framework**: Next.js 15 with React 19
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS
- **TypeScript**: Full type safety

### Backend (Server)
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT with bcrypt password hashing
- **Architecture**: Clean architecture with services, entities, and middleware

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/PillSure.git
cd PillSure
```

### 2. Backend Setup
```bash
cd server
npm install

# Create .env file
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
npm run migration:run

# Initialize roles
npm run init:roles

# Start development server
npm run dev
```

### 3. Frontend Setup
```bash
cd client/pillsure-client
npm install

# Start development server
npm run dev
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

## 📁 Project Structure

```
PillSure/
├── client/
│   └── pillsure-client/          # Next.js frontend application
│       ├── src/
│       │   ├── app/              # App router pages
│       │   ├── components/       # Reusable UI components
│       │   ├── hooks/            # Custom React hooks
│       │   ├── layout/           # Layout components
│       │   └── lib/              # Utilities and configurations
│       └── package.json
├── server/                       # Node.js backend application
│   ├── src/
│   │   ├── config/              # Database and app configuration
│   │   ├── core/                # Core types and interfaces
│   │   ├── entities/            # TypeORM database entities
│   │   ├── middleware/          # Express middleware
│   │   ├── routes/              # API route handlers
│   │   ├── services/            # Business logic services
│   │   └── migrations/          # Database migrations
│   └── package.json
└── README.md
```

## 🔧 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer <jwt_token>
```

### User Roles
- **USER**: Basic patient access
- **ADMIN**: Full system administration
- **DOCTOR**: Medical professional access
- **PHARMACIST**: Pharmacy staff access

## 🛡️ Security Features

- **Password Security**: bcrypt hashing with 12 rounds
- **JWT Tokens**: 24-hour expiration with secure signing
- **Role-Based Access**: Granular permissions per user type
- **Input Validation**: Comprehensive request validation
- **CORS Protection**: Configurable cross-origin policies
- **Error Handling**: Secure error responses without data leakage

## 🔮 Future Roadmap

### Phase 1: Core Platform ✅
- [x] User authentication and authorization
- [x] Role-based access control
- [x] Basic UI framework setup

### Phase 2: Medicine Management 🚧
- [ ] Medicine catalog and inventory
- [ ] Prescription management system
- [ ] Order processing workflow
- [ ] Payment integration

### Phase 3: Advanced Features 📋
- [ ] Insurance provider integration
- [ ] AI-powered prescription recommendations
- [ ] Home delivery service
- [ ] Mobile application (React Native)

### Phase 4: Analytics & Optimization 📊
- [ ] Advanced analytics dashboard
- [ ] Machine learning for fraud detection
- [ ] Performance optimization
- [ ] Multi-language support

## 🤝 Contributing

We welcome contributions to PillSure! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation for new features
- Follow the existing code style and structure

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏥 Healthcare Compliance

PillSure is designed with healthcare compliance in mind:
- **HIPAA-ready architecture** for patient data protection
- **Audit trails** for all medical transactions
- **Prescription verification** workflows
- **Secure communication** between healthcare providers

## 📞 Support

For support, email support@pillsure.com or join our community discussions.

## 🙏 Acknowledgments

- Healthcare professionals who provided domain expertise
- Open source community for the amazing tools and libraries
- Beta testers and early adopters

---

**PillSure** - *Making Healthcare Accessible, Secure, and Efficient* 🏥✨

> **Note**: This is a development version. For production deployment, additional security measures and compliance certifications may be required.
