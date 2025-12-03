#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up Dream Analyzer environment...\n');

// Check if .env already exists
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', 'env.example');

if (fs.existsSync(envPath)) {
  console.log('✅ .env file already exists');
} else if (fs.existsSync(envExamplePath)) {
  // Copy env.example to .env
  fs.copyFileSync(envExamplePath, envPath);
  console.log('✅ Created .env file from env.example');
  console.log('⚠️  Please update the .env file with your actual API keys');
} else {
  // Create basic .env file
  const envContent = `# Dream Analyzer Environment Configuration
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/dream-analyzer
JWT_SECRET=dream_analyzer_secret_key_2024
OPENAI_API_KEY=your-openai-api-key-here
CLIENT_URL=http://localhost:3000
`;
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created basic .env file');
  console.log('⚠️  Please update the .env file with your actual API keys');
}

// Check for required dependencies
console.log('\n📦 Checking dependencies...');

const serverPackageJson = path.join(__dirname, '..', 'package.json');
const clientPackageJson = path.join(__dirname, '..', 'client', 'package.json');

if (!fs.existsSync(serverPackageJson)) {
  console.error('❌ Server package.json not found');
  process.exit(1);
}

if (!fs.existsSync(clientPackageJson)) {
  console.error('❌ Client package.json not found');
  process.exit(1);
}

console.log('✅ Package files found');

// Create necessary directories
const uploadsDir = path.join(__dirname, '..', 'server', 'uploads');
const logsDir = path.join(__dirname, '..', 'server', 'logs');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory');
}

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('✅ Created logs directory');
}

console.log('\n🎉 Setup complete!');
console.log('\n📋 Next steps:');
console.log('1. Update .env file with your OpenAI API key');
console.log('2. Install dependencies: npm run install-all');
console.log('3. Start the application: npm run dev');
console.log('\n💡 For production deployment, update NODE_ENV=production in .env');
