🌙 Dream Analyzer – AI-Powered Dream Interpretation Platform

Dream Analyzer is an AI-driven web application that interprets dreams using emotional analysis, symbolic extraction, lifestyle correlation, and optional local LLM (LM Studio) integration.
It provides a personalized dream diary, visual analysis, image generation, and intelligent suggestions based on psychology-inspired rules and AI reasoning.

🚀 Features
🔮 AI Dream Interpretation

Extracts dream symbols, themes, characters, and settings.

Provides layered interpretations (psychological, emotional, symbolic).

Supports local LLM models from LM Studio for offline analysis.

😴 Dream Diary & History

Save dreams with timestamps.

View past interpretations easily.

Automatically detects dream patterns and trends.

🧠 Emotion & Symbol Analysis

Detects emotions such as fear, joy, anxiety, peace, etc.

Highlights recurring themes and symbols.

Connects lifestyle factors to dream meaning.

🖼️ AI Dream Image Generation

Creates dream-scene images using Stable Diffusion.

Saves generated images inside dream history.

📊 Lifestyle Integration

Tracks habits, sleep, and moods.

Correlates lifestyle data with dream patterns.

Provides recommendations to improve emotional well-being.

⚙️ Backend API

Node.js + Express server.

OpenAI / local LM Studio / Stable Diffusion integrations.

Modular service structure for easy expansion.

💻 Frontend

React-based UI.

Chat-style dream interaction experience.

Animated history viewer and charts.

🏗️ Tech Stack
Frontend

React

Tailwind / CSS

Recharts for data visualizations

Socket-based communication

Backend

Node.js + Express

LM Studio (optional local analysis)

OpenAI / DeepSeek / Gemini API compatibility

Stable Diffusion API

Storage

Local file storage for dream images

JSON / future-ready for MongoDB

📦 Project Structure
DREAM ANALYZER/
│
├── client/                # React frontend
│   ├── components/
│   ├── pages/
│   ├── utils/
│   └── assets/
│
├── server/                # Node backend
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   │   ├── openaiHelper.js
│   │   ├── lmstudioHelper.js
│   │   └── imageGenerator.js
│   └── uploads/           # AI-generated images
│
└── README.md

🧩 How Dream Analyzer Works
1️⃣ User inputs dream text

Dream → cleaned → parsed → structured.

2️⃣ Symbol & Theme Extraction

Detects characters, actions, objects, settings.

3️⃣ Emotion Mapping

Maps emotional tone: anxiety, calmness, confusion, excitement, etc.

4️⃣ LLM Interpretation

Uses:

Cloud LLMs

or Local LM Studio model for offline dream interpretation

5️⃣ Optional Image Generation

Stable Diffusion produces a visual dream scene.

6️⃣ Saved to History

Dream + interpretation + generated image stored locally.

🛠️ Setup Instructions
1. Clone the Repository
git clone git@github.com:AshrithaAnandaMogaveer/Dream-Analyzer.git
cd Dream-Analyzer

2. Install Dependencies

Frontend:

cd client
npm install


Backend:

cd ../server
npm install

3. Start Backend
npm run dev

4. Start Frontend
cd ../client
npm start

🔧 LM Studio Integration (Optional)

To enable offline dream analysis:

Install LM Studio

Download a compatible model (Mistral, Llama, DeepSeek-R1, etc.)

Run LM Studio's local server

Update environment variables:

LM_STUDIO_URL=http://localhost:1234/v1
LM_STUDIO_ENABLED=true


Your Dream Analyzer now works completely offline.

🎨 Demo Screenshots (optional)

(Tell me if you'd like me to create a screenshot layout or add UI previews.)

📌 Roadmap

 Multi-dream analytics dashboard

 Personality-informed dream interpretation

 User login & cloud sync

 Mobile version

 Upload audio for dream narration

🤝 Contributing

Contributions are welcome!
Open an issue or submit a pull request for enhancements or bug fixes.

📄 License

MIT License – free to use and modify.

👤 Author
Ashritha Mogaveera

AI Developer | Dream Analysis Research | Full-Stack Engineer
