#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🌙 Dream Analyzer Setup Script');
console.log('================================\n');

// Check if Node.js is installed
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  console.log(`✅ Node.js version: ${nodeVersion}`);
} catch (error) {
  console.error('❌ Node.js is not installed. Please install Node.js first.');
  process.exit(1);
}

// Check if npm is installed
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`✅ npm version: ${npmVersion}\n`);
} catch (error) {
  console.error('❌ npm is not installed. Please install npm first.');
  process.exit(1);
}

// Create .env file if it doesn't exist
const envPath = path.join(__dirname, 'server', '.env');
if (!fs.existsSync(envPath)) {
const envContent = `NODE_ENV=development
PORT=5000
JWT_SECRET=dream_analyzer_secret_key
CLIENT_URL=http://localhost:3000
MONGO_URI_LOCAL=mongodb://127.0.0.1:27017/dream_analyzer
MONGO_URI_ATLAS=
OPENAI_API_KEY=
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=
`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created server/.env file with default values');
  console.log('⚠️  Please update the environment variables in server/.env\n');
} else {
  console.log('✅ server/.env file already exists\n');
}

// Install dependencies
console.log('📦 Installing dependencies...\n');

try {
  console.log('Installing root dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('\nInstalling server dependencies...');
  execSync('cd server && npm install', { stdio: 'inherit' });
  
  console.log('\nInstalling client dependencies...');
  execSync('cd client && npm install', { stdio: 'inherit' });
  
  console.log('\n✅ All dependencies installed successfully!\n');
} catch (error) {
  console.error('❌ Error installing dependencies:', error.message);
  process.exit(1);
}

// Create necessary directories
const dirs = [
  'server/uploads',
  'client/public/images',
  'logs'
];

dirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

console.log('\n🎉 Setup completed successfully!\n');

console.log('📋 Next Steps:');
console.log('1. Update environment variables in server/.env');
console.log('2. Make sure MongoDB is running on your system');
console.log('3. Get an OpenAI API key and add it to server/.env');
console.log('4. Run the application with: npm run dev');
console.log('5. Open http://localhost:3000 in your browser\n');

console.log('🚀 Available Commands:');
console.log('  npm run dev        - Start both frontend and backend');
console.log('  npm run server     - Start backend only');
console.log('  npm run client     - Start frontend only');
console.log('  npm run build      - Build for production\n');

console.log('📚 Documentation:');
console.log('  - README.md contains detailed setup instructions');
console.log('  - API documentation is available in server/routes/');
console.log('  - Frontend components are in client/src/\n');

console.log('🌟 Features Included:');
console.log('  ✅ AI-powered dream analysis');
console.log('  ✅ User authentication system');
console.log('  ✅ Community features');
console.log('  ✅ Feedback system');
console.log('  ✅ Dream diary');
console.log('  ✅ Voice input support');
console.log('  ✅ Real-time features');
console.log('  ✅ Responsive design');
console.log('  ✅ Dark/light theme');
console.log('  ✅ Modern animations\n');

console.log('Happy coding! 🌙✨');

