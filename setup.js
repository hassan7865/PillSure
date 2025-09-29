#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up PillSure Monorepo with Docker...\n');

// Create client .env.local
const clientEnvPath = path.join(__dirname, 'client', '.env.local');
const clientEnvContent = `NEXT_PUBLIC_API_URL=http://localhost:3001
`;

if (!fs.existsSync(clientEnvPath)) {
  fs.writeFileSync(clientEnvPath, clientEnvContent);
  console.log('✅ Created client/.env.local');
} else {
  console.log('⚠️  client/.env.local already exists');
}

// Create server .env
const serverEnvPath = path.join(__dirname, 'server', '.env');
const serverEnvContent = `PORT=3001
DATABASE_URL=postgresql://pillsure:pillsure123@localhost:5432/pillsure
JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production
NODE_ENV=development
`;

if (!fs.existsSync(serverEnvPath)) {
  fs.writeFileSync(serverEnvPath, serverEnvContent);
  console.log('✅ Created server/.env');
} else {
  console.log('⚠️  server/.env already exists');
}

console.log('\n📋 Next steps:');
console.log('1. Make sure Docker Desktop is running');
console.log('2. Run: npm run install:all');
console.log('3. Run: npm run dev');
console.log('   This will start:');
console.log('   - Docker PostgreSQL container (port 5432)');
console.log('   - Backend server (port 3001)');
console.log('   - Frontend client (port 3000)');
console.log('4. Run: npm run db:migrate (in a separate terminal)');
console.log('5. Run: npm run init:roles (in a separate terminal)');
console.log('\n🎉 Setup complete!');
