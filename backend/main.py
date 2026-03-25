"""
InterviewAI — FastAPI Backend
Handles:
  - Auth (register / login / me) — PostgreSQL via asyncpg + SQLAlchemy
  - Resume parsing (PyPDF2 + Gemini AI)
  - Profile extraction with AI-powered vibe recommendation
  - Code execution (Judge0 API)
  - Code snapshot receiver (for AI context)
"""

import os
import json
import time
import asyncio
import httpx
from typing import Optional
from urllib.parse import urlencode

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import create_tables, get_db
from models import User
from auth import hash_password, verify_password, create_access_token, decode_token, get_current_user

# ─── App init ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="InterviewAI Backend",
    description="Auth, resume parsing, code execution, and AI context bridge.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Env config ──────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
JUDGE0_API_KEY = os.getenv("JUDGE0_API_KEY", "")
JUDGE0_HOST    = os.getenv("JUDGE0_HOST", "https://judge0-ce.p.rapidapi.com")
TAVUS_API_KEY  = os.getenv("TAVUS_API_KEY", "")

# Google OAuth
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
# This must match what's set in Google Cloud Console
GOOGLE_REDIRECT_URI = f"{FRONTEND_URL}/auth/google/callback"
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

# Free tier limit: 25 minutes (1500 seconds)
FREE_LIMIT_SECONDS = 1500

# In-memory store for code snapshots (replace with Redis in production)
_code_snapshots: dict[str, list] = {}

bearer_scheme = HTTPBearer(auto_error=False)


# ─── Startup ─────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup():
    await create_tables()


# ─── Pydantic models ─────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class ExtractProfileRequest(BaseModel):
    text: str

class CandidateProfile(BaseModel):
    name: str
    email: Optional[str] = None
    topSkills: list[str]
    experience: Optional[str] = None
    education: Optional[str] = None
    suggestedVibe: Optional[str] = None       # "griller" | "mentor" | "behavioral"
    vibeReason: Optional[str] = None           # Short AI explanation

class CodeRunRequest(BaseModel):
    code: str
    language_id: int
    language: str
    stdin: Optional[str] = ""

class CodeExecutionResult(BaseModel):
    stdout: str
    stderr: str
    status: str
    time: Optional[str] = None
    memory: Optional[str] = None

class CodeSnapshotRequest(BaseModel):
    session_id: str
    snapshot: dict


# ─── Auth dependency ─────────────────────────────────────────────────────────
async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


# ─── Health ──────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "InterviewAI Backend", "version": "2.0.0"}


# ═══════════════════════════════════════════════════════════════════════════════
# AUTH ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/auth/register", response_model=TokenResponse, status_code=201)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user. Returns a JWT on success.
    Automatically creates a Tavus AI user reference and sets up free tier."""
    # Check duplicate email
    result = await db.execute(select(User).where(User.email == req.email.lower()))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    if len(req.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")

    # Create Tavus user reference (using email as unique identifier)
    tavus_user_id = f"interviewai_{req.email.lower().replace('@', '_').replace('.', '_')}"
    
    user = User(
        name          = req.name.strip(),
        email         = req.email.lower(),
        password_hash = hash_password(req.password),
        tavus_user_id = tavus_user_id,
        subscription_status = "free",
        usage_time_seconds = 0,
        free_limit_seconds = FREE_LIMIT_SECONDS,  # 25 minutes
    )
    db.add(user)
    await db.flush()   # get user.id before commit
    await db.commit()

    token = create_access_token({"sub": user.id, "email": user.email})
    return TokenResponse(
        access_token=token,
        user={
            "id": user.id, 
            "name": user.name, 
            "email": user.email,
            "subscription_status": user.subscription_status,
            "usage_time_seconds": user.usage_time_seconds,
            "free_limit_seconds": user.free_limit_seconds,
            "remaining_time_seconds": user.remaining_time_seconds,
        },
    )


@app.post("/auth/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login with email + password. Returns a JWT."""
    result = await db.execute(select(User).where(User.email == req.email.lower()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    token = create_access_token({"sub": user.id, "email": user.email})
    return TokenResponse(
        access_token=token,
        user={
            "id": user.id, 
            "name": user.name, 
            "email": user.email,
            "subscription_status": user.subscription_status,
            "usage_time_seconds": user.usage_time_seconds,
            "free_limit_seconds": user.free_limit_seconds,
            "remaining_time_seconds": user.remaining_time_seconds,
        },
    )


@app.get("/auth/google")
async def google_login():
    """Redirect to Google OAuth login page."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    return RedirectResponse(url=auth_url)


@app.get("/auth/google/callback")
async def google_callback(code: str, db: AsyncSession = Depends(get_db)):
    """Handle Google OAuth callback - exchange code for tokens and create/login user."""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    
    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": GOOGLE_REDIRECT_URI,
            },
        )
        
        if token_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange code for tokens")
        
        tokens = token_response.json()
        access_token = tokens["access_token"]
        
        # Get user info
        userinfo_response = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if userinfo_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get user info")
        
        userinfo = userinfo_response.json()
        
        google_id = userinfo["id"]
        email = userinfo["email"].lower()
        name = userinfo.get("name", email.split("@")[0])
        
        # Check if user exists by Google ID or email
        result = await db.execute(
            select(User).where((User.google_id == google_id) | (User.email == email))
        )
        user = result.scalar_one_or_none()
        
        if user:
            # Update Google ID if not set
            if not user.google_id:
                user.google_id = google_id
                await db.commit()
        else:
            # Create new user with Google
            tavus_user_id = f"interviewai_{email.replace('@', '_').replace('.', '_')}"
            
            user = User(
                name=name,
                email=email,
                password_hash=hash_password(os.urandom(32).hex()),  # Random password for Google users
                google_id=google_id,
                tavus_user_id=tavus_user_id,
                subscription_status="free",
                usage_time_seconds=0,
                free_limit_seconds=FREE_LIMIT_SECONDS,
            )
            db.add(user)
            await db.flush()
            await db.commit()
        
        # Generate JWT
        jwt_token = create_access_token({"sub": user.id, "email": user.email})
        
        # Return JSON response (for frontend callback handler)
        return {
            "access_token": jwt_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "subscription_status": user.subscription_status,
                "usage_time_seconds": user.usage_time_seconds,
                "free_limit_seconds": user.free_limit_seconds,
                "remaining_time_seconds": user.remaining_time_seconds,
            }
        }


@app.get("/auth/me")
async def me(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's profile with subscription info."""
    return {
        "id":                   current_user.id,
        "name":                 current_user.name,
        "email":                current_user.email,
        "created_at":            current_user.created_at.isoformat(),
        "subscription_status":  current_user.subscription_status,
        "usage_time_seconds":   current_user.usage_time_seconds,
        "free_limit_seconds":   current_user.free_limit_seconds,
        "remaining_time_seconds": current_user.remaining_time_seconds,
        "is_time_exhausted":    current_user.is_time_exhausted,
        "tavus_user_id":        current_user.tavus_user_id,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# SUBSCRIPTION MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

class TrackUsageRequest(BaseModel):
    duration_seconds: int  # Duration to add in seconds
    is_video: bool = False  # Track if this is video usage


class SubscriptionStatusResponse(BaseModel):
    subscription_status: str
    usage_time_seconds: int
    video_time_seconds: int
    free_limit_seconds: int
    free_video_limit_seconds: int
    remaining_time_seconds: int
    remaining_video_seconds: int
    is_time_exhausted: bool
    is_video_exhausted: bool
    can_start_interview: bool


@app.get("/subscription/status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(current_user: User = Depends(get_current_user)):
    """Get current subscription status and usage."""
    return SubscriptionStatusResponse(
        subscription_status=current_user.subscription_status,
        usage_time_seconds=current_user.usage_time_seconds,
        video_time_seconds=current_user.video_time_seconds,
        free_limit_seconds=current_user.free_limit_seconds,
        free_video_limit_seconds=current_user.free_video_limit_seconds,
        remaining_time_seconds=current_user.remaining_time_seconds,
        remaining_video_seconds=current_user.remaining_video_seconds,
        is_time_exhausted=current_user.is_time_exhausted,
        is_video_exhausted=current_user.is_video_exhausted,
        can_start_interview=not current_user.is_time_exhausted,
    )


@app.post("/subscription/track-usage")
async def track_usage(
    req: TrackUsageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Track usage time for the current user."""
    if req.duration_seconds > 0:
        current_user.usage_time_seconds += req.duration_seconds
        # Track video time separately
        if req.is_video:
            current_user.video_time_seconds += req.duration_seconds
        await db.commit()
    
    return {
        "subscription_status": current_user.subscription_status,
        "usage_time_seconds": current_user.usage_time_seconds,
        "video_time_seconds": current_user.video_time_seconds,
        "remaining_time_seconds": current_user.remaining_time_seconds,
        "remaining_video_seconds": current_user.remaining_video_seconds,
        "is_time_exhausted": current_user.is_time_exhausted,
        "is_video_exhausted": current_user.is_video_exhausted,
    }


@app.post("/subscription/upgrade")
async def upgrade_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upgrade user to premium subscription (mock implementation)."""
    # In production, this would integrate with a payment provider like Stripe
    current_user.subscription_status = "premium"
    await db.commit()
    
    return {
        "success": True,
        "subscription_status": current_user.subscription_status,
        "message": "Successfully upgraded to premium!"
    }


@app.get("/subscription/check-interview")
async def check_interview_eligibility(current_user: User = Depends(get_current_user)):
    """Check if user can start a new interview based on their subscription."""
    can_start = not current_user.is_time_exhausted
    
    return {
        "can_start_interview": can_start,
        "subscription_status": current_user.subscription_status,
        "remaining_time_seconds": current_user.remaining_time_seconds if not can_start else None,
        "message": "OK" if can_start else "Free time exhausted. Please upgrade to continue."
    }


# ═══════════════════════════════════════════════════════════════════════════════
# RESUME PARSING
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    """Extract raw text from a PDF resume."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    content = await file.read()
    text = _extract_pdf_text(content)
    return {"text": text, "filename": file.filename, "chars": len(text)}


def _extract_pdf_text(content: bytes) -> str:
    try:
        import io, PyPDF2
        reader = PyPDF2.PdfReader(io.BytesIO(content))
        return "\n".join(page.extract_text() or "" for page in reader.pages).strip()
    except ImportError:
        return "Resume parsing failed. Install PyPDF2: pip install PyPDF2"
    except Exception as e:
        return f"PDF parsing error: {str(e)}"


# ═══════════════════════════════════════════════════════════════════════════════
# PROFILE EXTRACTION + VIBE RECOMMENDATION
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/extract-profile", response_model=CandidateProfile)
async def extract_profile(req: ExtractProfileRequest):
    """
    Use Gemini to extract a structured candidate profile AND recommend the best
    interviewer vibe (griller / mentor / behavioral) based on experience & role.
    """
    if GEMINI_API_KEY:
        try:
            return await _gemini_extract_profile(req.text)
        except Exception as e:
            print(f"[Gemini] Error: {e} — falling back to heuristics")

    return _heuristic_extract_profile(req.text)


async def _gemini_extract_profile(text: str) -> CandidateProfile:
    """
    Comprehensive Gemini prompt that extracts profile fields AND recommends
    the best interviewer vibe with a short reason.
    """
    prompt = f"""You are an expert technical recruiter and resume analyser.

Analyse this resume and return ONLY a single valid JSON object.

Fields to extract:
- name: Full candidate name (string)
- email: Email address if present (string or null)
- topSkills: Top 3-5 most prominent technical / professional skills (array of strings, max 5)
- experience: Total years of experience or a short description (string or null)
- education: Highest degree or institution (string or null)

Vibe recommendation — choose ONE of: "griller", "mentor", "behavioral"
Criteria:
  "griller"   → Senior engineers (5+ yrs), FAANG/top-tier targeting, strong DSA/System Design background
  "mentor"    → Juniors or career-changers (0-3 yrs), learners, bootcamp/self-taught backgrounds
  "behavioral"→ Managers, tech leads, PMs, MBA holders, or roles emphasising leadership & culture

- suggestedVibe: one of "griller" | "mentor" | "behavioral"  (string)
- vibeReason: one concise sentence explaining why (string, max 20 words)

Resume text:
---
{text[:5000]}
---

Return ONLY this exact JSON — no markdown, no explanation, no extra keys:
{{
  "name": "...",
  "email": "...",
  "topSkills": ["...", "..."],
  "experience": "...",
  "education": "...",
  "suggestedVibe": "...",
  "vibeReason": "..."
}}"""

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/"
        f"models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    )

    async with httpx.AsyncClient(timeout=25) as client:
        res = await client.post(
            url,
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.1, "maxOutputTokens": 1024},
            },
        )
        res.raise_for_status()
        data = res.json()

    raw = data["candidates"][0]["content"]["parts"][0]["text"].strip()

    # Strip markdown fences if Gemini wraps with ```json ... ```
    if raw.startswith("```"):
        lines = raw.splitlines()
        raw = "\n".join(
            line for line in lines
            if not line.strip().startswith("```")
        ).strip()

    parsed = json.loads(raw)

    # Validate suggestedVibe
    valid_vibes = {"griller", "mentor", "behavioral"}
    if parsed.get("suggestedVibe") not in valid_vibes:
        parsed["suggestedVibe"] = None

    return CandidateProfile(**parsed)


def _heuristic_extract_profile(text: str) -> CandidateProfile:
    """Fallback: keyword-based extraction when Gemini is unavailable."""
    import re

    lines = [l.strip() for l in text.splitlines() if l.strip()]
    name  = lines[0] if lines else "Candidate"

    email_match = re.search(r"[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}", text)
    email = email_match.group() if email_match else None

    SKILL_KEYWORDS = [
        "Python","JavaScript","TypeScript","React","Node.js","Java","C++","Go","Rust",
        "SQL","PostgreSQL","MongoDB","Docker","Kubernetes","AWS","GCP","Azure",
        "FastAPI","Django","Flask","Next.js","Redux","GraphQL","Redis","Kafka",
        "Machine Learning","Deep Learning","TensorFlow","PyTorch","Data Science",
        "System Design","Algorithms","Data Structures","REST API","Microservices",
    ]
    found_skills = [kw for kw in SKILL_KEYWORDS if kw.lower() in text.lower()][:5]
    if not found_skills:
        found_skills = ["Programming", "Problem Solving"]

    exp_match  = re.search(r"(\d+)\+?\s*years?", text, re.I)
    years      = int(exp_match.group(1)) if exp_match else 0
    experience = f"{years} years" if years else None

    edu_match = re.search(
        r"(B\.?S\.?c?|B\.?E\.?|M\.?S\.?c?|M\.?E\.?|Ph\.?D|Bachelor|Master|Doctor)",
        text, re.I,
    )
    education = edu_match.group() if edu_match else None

    # Simple vibe heuristic
    if years >= 5:
        vibe, reason = "griller", "Senior-level experience suggests a challenging technical interview."
    elif years <= 2:
        vibe, reason = "mentor", "Early-career candidate benefits from a supportive Mentor."
    else:
        vibe, reason = "behavioral", "Mid-level candidate; assessing communication & soft skills."

    return CandidateProfile(
        name=name, email=email, topSkills=found_skills,
        experience=experience, education=education,
        suggestedVibe=vibe, vibeReason=reason,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# CODE EXECUTION (Judge0)
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/run-code", response_model=CodeExecutionResult)
async def run_code(req: CodeRunRequest):
    # Use local code execution (no external API needed)
    try:
        return await _execute_judge0(req)
    except Exception as e:
        return CodeExecutionResult(stdout="", stderr=str(e), status="error")


def _execute_local(req: CodeRunRequest) -> CodeExecutionResult:
    """
    Execute code locally using subprocess.
    This is a simple code executor that doesn't require external services.
    """
    import subprocess
    import tempfile
    import os
    import shutil
    
    # Map language to file extension and command
    LANGUAGE_CONFIG = {
        "python": {"ext": ".py", "cmd": ["python", "-c"]},
        "javascript": {"ext": ".js", "cmd": ["node", "-e"]},
    }
    
    config = LANGUAGE_CONFIG.get(req.language, {"ext": ".py", "cmd": ["python", "-c"]})
    
    # Create a temporary file for the code
    with tempfile.TemporaryDirectory() as tmpdir:
        code_file = os.path.join(tmpdir, f"code{config['ext']}")
        
        # Write code to file
        with open(code_file, "w") as f:
            f.write(req.code)
        
        # Also create an input file if stdin is provided
        input_file = None
        if req.stdin:
            input_file = os.path.join(tmpdir, "input.txt")
            with open(input_file, "w") as f:
                f.write(req.stdin)
        
        try:
            # Run the code
            cmd = config["cmd"][:]  # Copy the command list
            if req.language == "python":
                # For Python, read file content and execute
                with open(code_file, "r") as f:
                    code_content = f.read()
                cmd = ["python", "-c", code_content]
            else:
                cmd.append(code_file)
            
            # Set up the process
            stdin_redirect = open(input_file, "r") if input_file else subprocess.PIPE
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=10,  # 10 second timeout
                stdin=stdin_redirect,
            )
            
            if input_file:
                stdin_redirect.close()
            
            return CodeExecutionResult(
                stdout=result.stdout,
                stderr=result.stderr if result.stderr else "",
                status="Success" if result.returncode == 0 else "Runtime Error",
                time=None,
                memory=None,
            )
            
        except subprocess.TimeoutExpired:
            return CodeExecutionResult(
                stdout="",
                stderr="Execution timed out (10 second limit)",
                status="timeout",
                time=None,
                memory=None,
            )
        except Exception as e:
            return CodeExecutionResult(
                stdout="",
                stderr=str(e),
                status="error",
                time=None,
                memory=None,
            )


async def _execute_judge0(req: CodeRunRequest) -> CodeExecutionResult:
    """
    Execute code using local subprocess executor.
    """
    loop = asyncio.get_event_loop()
    try:
        return await loop.run_in_executor(None, lambda: _execute_local(req))
    except Exception as e:
        return CodeExecutionResult(stdout="", stderr=str(e), status="error")


# ═══════════════════════════════════════════════════════════════════════════════
# INTERVIEW QUESTIONS API
# ═══════════════════════════════════════════════════════════════════════════════

class GetQuestionRequest(BaseModel):
    difficulty: Optional[str] = None  # "easy", "medium", "hard"
    category: Optional[str] = None   # "arrays", "strings", "linked_lists", "trees", "dp", "sorting"

class RunTestsRequest(BaseModel):
    question_id: str
    code: str
    language: str  # "python" or "javascript"

@app.get("/api/questions")
async def get_all_questions():
    """Get list of all available interview questions."""
    from questions import get_all_questions as _get_all
    return _get_all()

@app.get("/api/questions/random")
async def get_random_question(difficulty: str = None, category: str = None):
    """Get a random interview question, optionally filtered."""
    from questions import get_random_question as _get_random
    return _get_random(difficulty=difficulty, category=category)

@app.get("/api/questions/{question_id}")
async def get_question(question_id: str):
    """Get a specific question by ID."""
    from questions import get_question_by_id as _get_by_id
    result = _get_by_id(question_id)
    if not result:
        raise HTTPException(status_code=404, detail="Question not found")
    return result

@app.post("/api/questions/run-tests")
async def run_tests(req: RunTestsRequest):
    """
    Run code against test cases for a given question.
    Returns results for each test case.
    """
    from questions import get_question_by_id as _get_by_id
    
    question = _get_by_id(req.question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Get the test cases for this question
    test_cases = question["test_cases"]
    results = []
    
    for i, test in enumerate(test_cases):
        test_input = test["input"]
        expected = test["expected"]
        
        # Prepare stdin for the code
        # For Python, we'll create a simple test harness
        if req.language == "python":
            # Create test input as string
            stdin_data = str(test_input)
            
            # Wrap user code with test
            user_code = req.code
            
            # Try to extract function name from question
            func_name = req.code.split("def ")[1].split("(")[0] if "def " in req.code else "solution"
            
            # Create test harness
            test_code = f"""
{user_code}

import json
input_data = {stdin_data}
result = {func_name}(**input_data)
print(json.dumps(result) if result is not None else 'None')
"""
        else:
            # JavaScript
            func_name = req.code.split("function ")[1].split("(")[0] if "function " in req.code else "solution"
            stdin_data = json.dumps(test_input)
            test_code = f"""
{req.code}

const inputData = JSON.parse('{stdin_data}');
const result = {func_name}(...Object.values(inputData));
console.log(JSON.stringify(result));
"""
        
        # Execute the code
        language_id = 71 if req.language == "python" else 63  # Python 3, Node.js
        
        try:
            code_req = CodeRunRequest(
                code=test_code,
                language_id=language_id,
                language=req.language,
                stdin=stdin_data
            )
            execution_result = await _execute_judge0(code_req)
            
            # Parse the output
            actual_output = execution_result.stdout.strip()
            if actual_output and actual_output != "None":
                try:
                    actual = json.loads(actual_output)
                except:
                    actual = actual_output
            else:
                actual = None
            
            # Compare with expected
            passed = (actual == expected or str(actual) == str(expected))
            
            results.append({
                "test_case": i + 1,
                "description": test["description"],
                "input": test_input,
                "expected": expected,
                "actual": actual,
                "passed": passed,
                "status": execution_result.status,
                "stderr": execution_result.stderr if execution_result.stderr else None
            })
            
        except Exception as e:
            results.append({
                "test_case": i + 1,
                "description": test["description"],
                "input": test_input,
                "expected": expected,
                "actual": None,
                "passed": False,
                "status": "error",
                "stderr": str(e)
            })
    
    passed_count = sum(1 for r in results if r["passed"])
    total_count = len(results)
    
    return {
        "question_id": req.question_id,
        "question_title": question["title"],
        "results": results,
        "summary": {
            "passed": passed_count,
            "total": total_count,
            "all_passed": passed_count == total_count
        }
    }


# ═══════════════════════════════════════════════════════════════════════════════
# CODE CONTEXT — push live code into Tavus conversation
# ═══════════════════════════════════════════════════════════════════════════════

class PushCodeContextRequest(BaseModel):
    conversation_id: str      # Tavus conversation ID
    session_id: str
    code: str
    language: str
    phase: str
    tavus_api_key: str


@app.post("/api/push-code-context")
async def push_code_context(req: PushCodeContextRequest):
    """
    1. Stores the code snapshot locally.
    2. PATCHes the live Tavus conversation so the AI can read the candidate's code
       and naturally discuss it during the interview.
    """
    # ── Store locally ────────────────────────────────────────────────────
    if req.session_id not in _code_snapshots:
        _code_snapshots[req.session_id] = []
    _code_snapshots[req.session_id].append({
        "timestamp": time.time(),
        "code": req.code,
        "language": req.language,
        "phase": req.phase,
        "received_at": time.time(),
    })
    _code_snapshots[req.session_id] = _code_snapshots[req.session_id][-20:]

    # ── Build context string for Tavus ───────────────────────────────────
    code_lines = req.code.strip().splitlines()
    
    # Extract problem description from code comments (usually at top)
    problem_info = ""
    for line in code_lines[:30]:
        if line.startswith("// PROBLEM DESCRIPTION:") or line.startswith("// "):
            # Extract the problem title and description
            if "PROBLEM DESCRIPTION" in line or "════" not in line:
                problem_info += line.replace("//", "").strip() + "\n"
        if line.strip() == "// Write your solution below:":
            break
    
    # Get code preview (first 30 lines to leave room for problem info)
    preview = "\n".join(code_lines[:30])
    if len(code_lines) > 30:
        preview += f"\n... ({len(code_lines) - 30} more lines)"

    context_update = (
        f"[CODING PHASE - INTERVIEW]\n\n"
    )
    
    # Add problem info if found
    if problem_info:
        context_update += (
            f"CURRENT PROBLEM BEING SOLVED:\n{problem_info}\n"
        )
    
    context_update += (
        f"CANDIDATE'S CODE:\n"
        f"```{req.language}\n{preview}\n```\n\n"
        f"IMPORTANT: You are conducting a technical interview. The candidate is solving a coding problem. "
        f"You can see their code above - it includes the problem description in comments at the top. "
        f"Reference their code naturally in your next response. Ask about their approach, "
        f"time/space complexity, potential edge cases, or suggest improvements. "
        f"If they haven't started coding, encourage them to begin. "
        f"Do NOT read the code verbatim — discuss it conversationally like a real interviewer."
    )

    # ── PATCH Tavus conversation context ─────────────────────────────────
    tavus_ok = False
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.patch(
                f"https://tavusapi.com/v2/conversations/{req.conversation_id}",
                headers={
                    "x-api-key": req.tavus_api_key,
                    "Content-Type": "application/json",
                },
                json={"conversational_context": context_update},
            )
            tavus_ok = r.status_code in (200, 204)
            if not tavus_ok:
                print(f"[Tavus PATCH] {r.status_code}: {r.text[:200]}")
    except Exception as e:
        print(f"[Tavus PATCH] Exception: {e}")

    return {
        "status": "ok",
        "snapshot_count": len(_code_snapshots[req.session_id]),
        "tavus_context_updated": tavus_ok,
    }


@app.post("/api/code-snapshot")
async def receive_code_snapshot(req: CodeSnapshotRequest):
    """Store code snapshot locally only (no Tavus push)."""
    if req.session_id not in _code_snapshots:
        _code_snapshots[req.session_id] = []
    _code_snapshots[req.session_id].append({**req.snapshot, "received_at": time.time()})
    _code_snapshots[req.session_id] = _code_snapshots[req.session_id][-20:]
    return {"status": "received", "snapshot_count": len(_code_snapshots[req.session_id])}


@app.get("/api/code-snapshots/{session_id}")
async def get_code_snapshots(session_id: str):
    return {"session_id": session_id, "snapshots": _code_snapshots.get(session_id, [])}


# ─── Run ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
