"""
InterviewAI - Resume Extraction Quality Test
Tests Gemini AI profile extraction with 4 realistic resume samples
and scores the quality of each extraction.
"""
from dotenv import load_dotenv
load_dotenv()

import os, json, httpx, time

GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
BACKEND    = "http://localhost:8000"

RESUMES = [
    {
        "label": "Senior Backend Engineer (Expected vibe: griller)",
        "expected_vibe": "griller",
        "expected_skills": ["Python", "Go", "Kubernetes", "PostgreSQL"],
        "text": (
            "Rahul Sharma\n"
            "rahul.sharma@gmail.com | github.com/rahulsharma\n\n"
            "SUMMARY\n"
            "Senior Software Engineer with 7+ years building scalable distributed systems.\n\n"
            "EXPERIENCE\n"
            "Senior Software Engineer - Flipkart (2020-Present)\n"
            "- Designed cart checkout microservice handling 2M+ daily transactions\n"
            "- Reduced p99 latency 800ms -> 120ms via Redis caching\n"
            "- Mentored 5 junior engineers; led weekly system design discussions\n\n"
            "Software Engineer - Zomato (2017-2020)\n"
            "- Built real-time order tracking via Kafka + WebSockets\n"
            "- Migrated monolith to 12 microservices using Docker + Kubernetes on GCP\n\n"
            "SKILLS\n"
            "Python, Go, FastAPI, PostgreSQL, Redis, Kafka, Kubernetes, Docker, AWS, "
            "System Design, Distributed Systems, gRPC, Leetcode top 1%\n\n"
            "EDUCATION\n"
            "B.Tech Computer Science - IIT Bombay (2013-2017), CGPA 8.9/10"
        ),
    },
    {
        "label": "Junior Frontend Dev, Bootcamp Grad (Expected vibe: mentor)",
        "expected_vibe": "mentor",
        "expected_skills": ["React", "JavaScript", "HTML", "CSS"],
        "text": (
            "Priya Nair\n"
            "priya.nair@outlook.com | Bangalore, India\n\n"
            "ABOUT ME\n"
            "Aspiring frontend developer. Recently completed 6-month Full Stack Bootcamp "
            "at Masai School (2023). Looking for my first full-time opportunity.\n\n"
            "PROJECTS\n"
            "1. Task Manager App (React + Node.js + MongoDB) - deployed on Vercel, 50+ users\n"
            "2. Portfolio Website (HTML, CSS, JavaScript) - 200+ visits first week\n\n"
            "SKILLS\n"
            "HTML, CSS, JavaScript, React, Node.js, Express, MongoDB, Git, Figma (basic)\n\n"
            "EDUCATION\n"
            "Masai School - Full Stack Web Development (2023)\n"
            "B.Com - Bangalore University (2018-2021)\n\n"
            "CERTIFICATES\n"
            "The Odin Project, Coursera HTML/CSS/JS"
        ),
    },
    {
        "label": "Engineering Manager / MBA (Expected vibe: behavioral)",
        "expected_vibe": "behavioral",
        "expected_skills": ["Python", "Java"],
        "text": (
            "Aisha Khan\n"
            "aisha.khan@company.com | LinkedIn: linkedin.com/in/aishakhan-em\n\n"
            "PROFESSIONAL SUMMARY\n"
            "Engineering Manager with 10+ years leading cross-functional teams of 15-30 engineers. "
            "MBA from ISB Hyderabad.\n\n"
            "EXPERIENCE\n"
            "Engineering Manager - Microsoft India (2019-Present)\n"
            "- Manage 3 agile teams (28 engineers) building Azure DevOps features for 6M+ customers\n"
            "- Defined OKRs resulting in 40% improvement in sprint velocity\n"
            "- Own hiring pipeline; closed 14 senior hires in 2023, 90% retention\n\n"
            "Senior Engineer -> Tech Lead - Wipro Digital (2014-2019)\n"
            "- Led architecture for banking microservices (Java + Spring Boot)\n"
            "- Reduced deployment time 3 days -> 4 hours via CI/CD (Jenkins + Docker)\n\n"
            "EDUCATION\n"
            "MBA - ISB Hyderabad (2012-2014)\n"
            "B.E. Computer Science - BITS Pilani (2009-2013)\n\n"
            "SKILLS\n"
            "People Management, OKRs, Agile/Scrum, Java, Python, CI/CD, Jenkins, Docker, "
            "Azure, Stakeholder Communication, Hiring & Talent Development"
        ),
    },
    {
        "label": "Data Scientist, 3 yrs (Ambiguous level)",
        "expected_vibe": None,  # not penalised; just observe
        "expected_skills": ["Python", "Machine Learning", "TensorFlow"],
        "text": (
            "Dev Mehta | dev.mehta@ds.io | Mumbai\n\n"
            "Data Scientist at WNS Analytics | 3 years experience\n"
            "Skills: Python, R, Machine Learning, TensorFlow, scikit-learn, Pandas, NumPy, SQL, Tableau\n"
            "M.Sc. Data Science - IIIT Hyderabad\n"
            "B.Sc. Statistics - Mumbai University\n\n"
            "Projects:\n"
            "- Customer churn model (XGBoost) - reduced churn 18%\n"
            "- NLP sentiment pipeline for 500K reviews/day (BERT fine-tuning)\n"
            "- Time-series forecasting for FMCG inventory (ARIMA + LSTM)"
        ),
    },
]

PROMPT_TEMPLATE = """\
You are an expert technical recruiter and resume analyser.

Analyse this resume and return ONLY a single valid JSON object.

Fields to extract:
- name: Full candidate name (string)
- email: Email address if present (string or null)
- topSkills: Top 3-5 most prominent technical / professional skills (array of strings, max 5)
- experience: Total years of experience or a short description (string or null)
- education: Highest degree or institution (string or null)

Vibe recommendation - choose ONE of: "griller", "mentor", "behavioral"
  "griller"    -> Senior engineers (5+ yrs), FAANG/top-tier targeting, strong DSA/System Design
  "mentor"     -> Juniors or career-changers (0-3 yrs), learners, bootcamp/self-taught
  "behavioral" -> Managers, tech leads, PMs, MBA holders, or leadership-focused roles

- suggestedVibe: one of "griller" | "mentor" | "behavioral" (string)
- vibeReason: one concise sentence explaining why (string, max 20 words)

Resume text:
---
{text}
---

Return ONLY this exact JSON (no markdown, no extra keys):
{{"name": "...", "email": "...", "topSkills": ["..."], "experience": "...", "education": "...", "suggestedVibe": "...", "vibeReason": "..."}}"""


def call_gemini(text: str) -> dict:
    url = (
        "https://generativelanguage.googleapis.com/v1beta/"
        f"models/gemini-2.5-flash:generateContent?key={GEMINI_KEY}"
    )
    res = httpx.post(
        url,
        json={
            "contents": [{"parts": [{"text": PROMPT_TEMPLATE.format(text=text[:5000])}]}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 1024},
        },
        timeout=30,
    )
    res.raise_for_status()
    raw = res.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    if raw.startswith("```"):
        lines = raw.splitlines()
        raw = "\n".join(ln for ln in lines if not ln.strip().startswith("```")).strip()
    return json.loads(raw)


def score_profile(profile: dict, resume: dict) -> tuple:
    """Returns (score:int, notes:list[str])"""
    score = 100
    notes = []

    # 1. Name
    name = profile.get("name") or ""
    if not name or name in ("Candidate", "null"):
        score -= 20
        notes.append("FAIL  name: missing or generic")
    else:
        notes.append(f"PASS  name          = {name}")

    # 2. Email
    email = profile.get("email") or ""
    if not email or email == "null":
        score -= 5
        notes.append("WARN  email: not extracted")
    else:
        notes.append(f"PASS  email         = {email}")

    # 3. Skills
    extracted = [s.lower() for s in (profile.get("topSkills") or [])]
    expected  = [s.lower() for s in resume["expected_skills"]]
    hits = sum(1 for s in expected if any(s in e or e in s for e in extracted))
    pct  = hits / len(expected) if expected else 1.0
    if pct < 0.5:
        score -= 25
        notes.append(f"FAIL  topSkills: only {hits}/{len(expected)} expected matched -> {profile.get('topSkills')}")
    elif pct < 1.0:
        score -= 10
        notes.append(f"WARN  topSkills: {hits}/{len(expected)} expected matched -> {profile.get('topSkills')}")
    else:
        notes.append(f"PASS  topSkills     = {profile.get('topSkills')}")

    # 4. Experience
    exp = profile.get("experience") or ""
    if not exp or exp == "null":
        score -= 10
        notes.append("WARN  experience: not extracted")
    else:
        notes.append(f"PASS  experience    = {exp}")

    # 5. Education
    edu = profile.get("education") or ""
    if not edu or edu == "null":
        score -= 10
        notes.append("WARN  education: not extracted")
    else:
        notes.append(f"PASS  education     = {edu}")

    # 6. Vibe (only if expected)
    vibe = profile.get("suggestedVibe") or ""
    if resume["expected_vibe"]:
        if vibe == resume["expected_vibe"]:
            notes.append(f"PASS  suggestedVibe = {vibe}  <-- CORRECT")
        else:
            score -= 20
            notes.append(f"FAIL  suggestedVibe: expected={resume['expected_vibe']}, got={vibe}")
    else:
        notes.append(f"INFO  suggestedVibe = {vibe}  (no expected value, not penalised)")

    # 7. Vibe reason
    reason = profile.get("vibeReason") or ""
    if reason and reason != "null":
        notes.append(f"PASS  vibeReason    = {reason}")
    else:
        score -= 10
        notes.append("WARN  vibeReason: missing")

    return max(score, 0), notes


def check_backend() -> bool:
    try:
        r = httpx.get(f"{BACKEND}/health", timeout=4)
        return r.status_code == 200
    except Exception:
        return False


def main():
    print("=" * 60)
    print("  InterviewAI - Resume Extraction Quality Test")
    print("=" * 60)

    if not GEMINI_KEY:
        print("ERROR: GEMINI_API_KEY not found in .env")
        return

    print(f"  Gemini key : {GEMINI_KEY[:14]}...")
    backend_up = check_backend()
    print(f"  Backend    : {'UP (localhost:8000)' if backend_up else 'DOWN - testing Gemini directly'}")
    print()

    scores = []

    for i, resume in enumerate(RESUMES, 1):
        sep = "-" * 60
        print(sep)
        print(f"  TEST {i}/4: {resume['label']}")
        print(f"  Resume   : {len(resume['text'])} chars")
        print(sep)

        try:
            t0 = time.time()
            profile = call_gemini(resume["text"])
            elapsed = time.time() - t0

            score, notes = score_profile(profile, resume)
            scores.append(score)

            grade = "EXCELLENT" if score >= 85 else "GOOD" if score >= 70 else "ACCEPTABLE" if score >= 55 else "POOR"
            print(f"  Score    : {score}/100  [{grade}]  ({elapsed:.1f}s)")
            print()
            for note in notes:
                print(f"  {note}")
            print()
            print("  Raw Gemini JSON:")
            for line in json.dumps(profile, indent=4).splitlines():
                print("    " + line)

        except json.JSONDecodeError as e:
            print(f"  JSON PARSE ERROR: {e}")
            scores.append(0)
        except httpx.HTTPStatusError as e:
            print(f"  HTTP ERROR {e.response.status_code}: {e.response.text[:300]}")
            scores.append(0)
        except Exception as e:
            print(f"  EXCEPTION: {e}")
            scores.append(0)

        print()

    avg = sum(scores) / len(scores) if scores else 0

    print("=" * 60)
    print("  FINAL SUMMARY")
    print("=" * 60)
    print()
    for i, (sc, r) in enumerate(zip(scores, RESUMES), 1):
        filled = int(sc / 5)
        bar = "#" * filled + "." * (20 - filled)
        grade = "EXCELLENT" if sc >= 85 else "GOOD" if sc >= 70 else "ACCEPTABLE" if sc >= 55 else "POOR"
        print(f"  {i}. [{bar}] {sc:3d}/100  {grade}")
        print(f"     {r['label']}")
        print()

    overall = "EXCELLENT" if avg >= 85 else "GOOD" if avg >= 70 else "ACCEPTABLE" if avg >= 55 else "NEEDS IMPROVEMENT"
    print(f"  Average Score : {avg:.1f}/100")
    print(f"  Overall Grade : {overall}")
    print()
    print("=" * 60)


if __name__ == "__main__":
    main()
