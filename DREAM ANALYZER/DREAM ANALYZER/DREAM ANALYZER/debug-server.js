// Enable debug logging for all modules
process.env.DEBUG = '*'

// Load environment variables first
require('dotenv').config({ path: './server/.env' })

// Set up basic logging
console.log('🔍 Starting server in debug mode...')
console.log('Environment:', process.env.NODE_ENV || 'development')
console.log('MongoDB URI:', process.env.MONGO_URI_LOCAL ? 'Set' : 'Not set')

// Start the main server
const server = require('./server/index.js')

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  process.exit(1)
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

console.log('✅ Debug server script loaded. Check logs above for any issues.')
