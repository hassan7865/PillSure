# PillSure Server

A Node.js/Express server with TypeORM for the PillSure application, featuring complete authentication and authorization.

## Features

- **Authentication**: Login and registration endpoints
- **Authorization**: Role-based access control (User, Admin, Doctor, Pharmacist)
- **Security**: JWT tokens, password hashing with bcrypt
- **Database**: PostgreSQL with TypeORM
- **Validation**: Input validation and error handling
- **Middleware**: JWT verification, role-based access control

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=your_password
DB_NAME=pillsure_db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### 3. Database Setup
- Ensure PostgreSQL is running
- Create a database named `pillsure_db`
- Update the `.env` file with your database credentials

### 4. Run the Server
```bash
npm run dev
```

## API Endpoints

### Authentication Routes (`/api/auth`)

#### POST `/api/auth/register`
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user" // optional, defaults to "user"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user"
  }
}
```

#### POST `/api/auth/login`
Login with existing credentials.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user"
  }
}
```

#### GET `/api/auth/profile`
Get user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

#### PUT `/api/auth/profile`
Update user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith"
}
```

#### GET `/api/auth/users`
Get all users (admin only).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

### Health Check

#### GET `/health`
Server health status.

## User Roles

- **USER**: Basic user access
- **ADMIN**: Full system access
- **DOCTOR**: Medical professional access
- **PHARMACIST**: Pharmacy staff access

## Security Features

- Password hashing with bcrypt (12 rounds)
- JWT tokens with 24-hour expiration
- Role-based access control
- Input validation and sanitization
- CORS enabled
- Centralized error handling

## Project Structure

```
src/
├── config/
│   └── database.ts          # Database configuration
├── core/
│   └── types.ts             # TypeScript interfaces and types
├── entities/
│   ├── User.ts              # User entity with TypeORM
│   └── Role.ts              # Role entity with TypeORM
├── middleware/
│   ├── error.handler.ts     # Error handling middleware
│   └── jwt.handler.ts       # JWT authentication middleware
├── routes/
│   └── auth.route.ts        # Authentication routes
└── services/
    └── authservice.ts       # Authentication business logic
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run typeorm` - Run TypeORM CLI
- `npm run migration:generate` - Generate database migrations
- `npm run migration:run` - Run database migrations
- `npm run migration:revert` - Revert last migration

### Database Migrations

To generate and run migrations:

```bash
# Generate migration
npm run migration:generate

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

## Error Handling

The server includes centralized error handling with:
- HTTP status codes
- Descriptive error messages
- Stack traces in development mode
- Custom error creation utilities

## Testing the API

You can test the endpoints using tools like:
- Postman
- Insomnia
- cURL
- Thunder Client (VS Code extension)

### Example cURL Commands

**Register:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Get Profile (with token):**
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```


