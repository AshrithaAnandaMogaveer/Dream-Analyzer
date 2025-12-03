# 🌙 Dream Analyzer

An AI-powered dream analysis and journaling application built with MERN stack. Analyze your dreams, track patterns, and gain insights into your subconscious mind.

## ✨ Features

- **AI Dream Analysis**: Get detailed interpretations using OpenAI GPT
- **Dream Journal**: Save and organize your dream entries
- **Visual Generation**: Create AI-generated images from your dreams
- **Analytics Dashboard**: Track emotions, themes, and patterns over time
- **Sleep Quality Survey**: Comprehensive sleep and wellness tracking
- **Meditation Recommendations**: Personalized mindfulness suggestions
- **Community Features**: Share and discuss dreams with others
- **Responsive Design**: Works on desktop, tablet, and mobile

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)
- MongoDB (local or Atlas)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/dream-analyzer.git
   cd dream-analyzer
   ```

2. **Run the setup script**
   ```bash
   # Windows
   npm run setup
   
   # Or manually
   npm run install-all
   npm run setup-env
   ```

3. **Configure environment**
   - Update `.env` file with your API keys
   - Set your MongoDB connection string
   - Add your OpenAI API key

4. **Start the application**
   ```bash
   # Development mode (both frontend and backend)
   npm run dev
   
   # Or use the provided scripts
   # Windows
   scripts/start-dev.bat
   
   # Linux/Mac
   scripts/start-dev.sh
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
HOST=0.0.0.0

# Database
MONGODB_URI=mongodb://localhost:27017/dream-analyzer

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key

# OpenAI API Key (required for AI features)
OPENAI_API_KEY=your-openai-api-key-here

# Client URL (for CORS)
CLIENT_URL=http://localhost:3000
```

### MongoDB Setup

**Local MongoDB:**
1. Install MongoDB locally
2. Start MongoDB service
3. Use `mongodb://localhost:27017/dream-analyzer`

**MongoDB Atlas:**
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string
4. Update `MONGODB_URI` in `.env`

## 📱 Usage

### For Users

1. **Sign Up/Login**: Create an account or login
2. **Analyze Dreams**: Describe your dream in the chatbot
3. **View Insights**: Check the analytics panel for patterns
4. **Save to Diary**: Keep a record of your dreams
5. **Track Sleep**: Complete sleep quality surveys
6. **Meditate**: Follow AI-recommended meditation practices

### For Developers

1. **API Endpoints**: All endpoints are documented in the routes
2. **Database Models**: Check `server/models/` for schema definitions
3. **Frontend Components**: Modular React components in `client/src/components/`
4. **Styling**: CSS modules for component-specific styles

## 🛠️ Development

### Available Scripts

```bash
# Install all dependencies
npm run install-all

# Start development servers
npm run dev

# Start only backend
npm run server

# Start only frontend
npm run client

# Build for production
npm run build

# Run tests
npm run test

# Lint code
npm run lint

# Clean dependencies
npm run clean
```

### Project Structure

```
dream-analyzer/
├── client/                 # React frontend
│   ├── public/            # Static files
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   └── utils/         # Utility functions
│   └── package.json
├── server/                # Express backend
│   ├── config/           # Configuration files
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Custom middleware
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   └── utils/            # Utility functions
├── scripts/              # Setup and utility scripts
├── .env                  # Environment variables
└── package.json          # Root package.json
```

## 🚀 Deployment

### Heroku

1. Create a Heroku app
2. Set environment variables in Heroku dashboard
3. Deploy using Git:
   ```bash
   git push heroku main
   ```

### Vercel (Frontend)

1. Connect your GitHub repository to Vercel
2. Set build command: `cd client && npm run build`
3. Set output directory: `client/build`

### Railway/Render

1. Connect your repository
2. Set environment variables
3. Deploy automatically

## 🔒 Security

- JWT authentication
- Password hashing with bcrypt
- CORS protection
- Rate limiting
- Input validation
- Helmet.js security headers

## 📊 Performance

- Lazy loading for components
- Image optimization
- Database indexing
- Caching strategies
- Responsive design
- Error boundaries

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [Issues](https://github.com/your-username/dream-analyzer/issues) page
2. Create a new issue with detailed information
3. Check the logs in `server/logs/`

## 🙏 Acknowledgments

- OpenAI for AI capabilities
- MongoDB for database
- React community for excellent tools
- All contributors and users

---

Made with ❤️ by the Dream Analyzer Team