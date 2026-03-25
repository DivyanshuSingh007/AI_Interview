# AI Interview Platform

An AI-powered interview platform featuring real-time video interviews with AI interviewers, code execution for technical assessments, and intelligent question generation.

## 🚀 Features

- **AI-Powered Video Interviews** - Conduct mock interviews with AI interviewers using Tavus video synthesis
- **Real-time Code Execution** - Technical assessments with Judge0 code execution engine
- **Smart Question Generation** - AI-generated interview questions using Gemini
- **Resume Analysis** - Upload and analyze candidate resumes
- **Multiple Interview Vibes** - Choose from different interview styles (Casual, Professional, Strict)
- **Google OAuth** - Secure authentication with Google
- **PostgreSQL Database** - Persistent storage for interviews and results

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python
- **Database**: PostgreSQL
- **AI Services**: Tavus (video), Gemini (text generation)
- **Code Execution**: Judge0

## 📋 Prerequisites

- Node.js 18+
- Python 3.9+
- PostgreSQL
- Judge0 server (optional, for code execution)

## ⚙️ Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-interview.git
cd ai-interview

# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && pip install -r requirements.txt
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example backend/.env
```

Required variables:
- `GEMINI_API_KEY` - For AI question generation
- `TAVUS_API_KEY` - For AI video interviews
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET_KEY` - Secret for JWT tokens
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` - For OAuth

### 3. Database Setup

```bash
cd backend
python update_db.py
```

### 4. Run the Application

**Backend:**
```bash
cd backend
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm run dev
```

The app will be available at `http://localhost:3000`

## 📁 Project Structure

```
├── backend/           # FastAPI backend
│   ├── main.py       # API routes
│   ├── models.py     # Database models
│   ├── auth.py       # Authentication
│   └── questions.py  # Question generation
├── frontend/         # Next.js frontend
│   └── src/
│       ├── app/     # Next.js pages
│       ├── components/  # UI components
│       └── context/ # React context
└── .env.example     # Environment template
```

## 📝 License

MIT