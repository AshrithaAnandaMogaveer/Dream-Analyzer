# 🚀 Dream Analyzer - Quick Start Guide

## ⚡ One-Click Setup

### Windows Users
```bash
# Double-click this file or run in Command Prompt
scripts\start-dev.bat
```

### Linux/Mac Users
```bash
# Make executable and run
chmod +x scripts/start-dev.sh
./scripts/start-dev.sh
```

## 🔧 Manual Setup

### 1. Install Dependencies
```bash
npm run install-all
```

### 2. Configure Environment
```bash
# Copy environment template
cp env.example .env

# Edit .env file with your API keys
# Required: OPENAI_API_KEY
# Optional: MONGODB_URI (defaults to local MongoDB)
```

### 3. Start Development
```bash
# Start both frontend and backend
npm run dev

# Or start individually
npm run server  # Backend only
npm run client  # Frontend only
```

## 🌐 Access the App

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## 📋 Prerequisites

- **Node.js**: v16+ (Download from [nodejs.org](https://nodejs.org/))
- **npm**: v8+ (Comes with Node.js)
- **MongoDB**: Local or Atlas (Free tier available)

## 🔑 Required API Keys

### OpenAI API Key (Required for AI features)
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create account and get API key
3. Add to `.env` file: `OPENAI_API_KEY=your-key-here`

### MongoDB (Optional - defaults to local)
1. **Local**: Install MongoDB locally
2. **Atlas**: Create free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
3. Add to `.env`: `MONGODB_URI=mongodb+srv://...`

## 🛠️ Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5000
npx kill-port 5000

# Or change port in .env
PORT=5001
```

### Dependencies Issues
```bash
# Clean install
npm run clean
npm run install-all
```

### MongoDB Connection Issues
- Check if MongoDB is running locally
- Verify connection string in `.env`
- Check firewall settings

## 📱 Mobile Testing

1. Find your computer's IP address
2. Update `CLIENT_URL` in `.env` to your IP
3. Access from mobile: `http://YOUR_IP:3000`

## 🚀 Production Deployment

### Heroku
```bash
# Install Heroku CLI
# Login and create app
heroku create your-dream-analyzer

# Set environment variables
heroku config:set OPENAI_API_KEY=your-key
heroku config:set MONGODB_URI=your-mongodb-uri

# Deploy
git push heroku main
```

### Vercel (Frontend)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## 📊 Performance Tips

- Use Chrome DevTools to monitor performance
- Enable service worker for caching
- Optimize images before upload
- Use lazy loading for heavy components

## 🆘 Need Help?

1. Check the [Issues](https://github.com/your-username/dream-analyzer/issues) page
2. Read the full [README.md](README.md)
3. Check server logs in `server/logs/`

---

**Happy Dreaming! 🌙✨**