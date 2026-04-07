"""Quick E2E test for Gemini and Tavus APIs"""
from dotenv import load_dotenv; load_dotenv()
import os, httpx, json, time

gemini_key = os.getenv('GEMINI_API_KEY', '')
tavus_key  = os.getenv('TAVUS_API_KEY', '')

print("Keys loaded:")
print(" Gemini:", gemini_key[:12] + "..." if gemini_key else "MISSING")
print(" Tavus: ", tavus_key[:12] + "..." if tavus_key else "MISSING")

# ── 1) Gemini Profile Extraction ─────────────────────────────────────────────
print("\n=== TEST 1: Gemini Profile Extraction ===")
resume_text = "Jane Doe, jane@example.com. 5 years as Python developer. Skills: Python, FastAPI, PostgreSQL, Docker, React. B.Sc Computer Science, University of Delhi. Senior Software Engineer at Infosys."
prompt = (
    'Extract a candidate profile from this resume and return ONLY valid JSON.\n'
    'Fields: name, email, topSkills (array, max 5), experience (string), education (string)\n'
    f'Resume: {resume_text}\n'
    'Return ONLY: {"name": "...", "email": "...", "topSkills": [...], "experience": "...", "education": "..."}'
)

r = httpx.post(
    f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}',
    json={
        'contents': [{'parts': [{'text': prompt}]}],
        'generationConfig': {'temperature': 0, 'maxOutputTokens': 512}
    },
    timeout=30
)
print("Status:", r.status_code)
if r.status_code == 200:
    raw = r.json()['candidates'][0]['content']['parts'][0]['text'].strip()
    raw = raw.replace('```json', '').replace('```', '').strip()
    profile = json.loads(raw)
    print("Profile:", json.dumps(profile, indent=2))
else:
    print("Error:", r.json().get('error', {}).get('message', '?')[:200])

# ── 2) Tavus Conversation Creation ────────────────────────────────────────────
print("\n=== TEST 2: Tavus Conversation (The Griller - Steve Professional) ===")
payload = {
    "replica_id": "rdd4c86e5e1a",
    "conversation_name": "InterviewAI — Jane Doe — The Griller [TEST]",
    "conversational_context": "You are The Griller — a senior engineer interviewing Jane Doe who knows Python, FastAPI, and PostgreSQL. Ask her one technical question right away.",
    "custom_greeting": "Hey Jane. I'm Alex. Let's get right into it — what's the time complexity of a hash map lookup in Python, and why?",
    "properties": {
        "max_call_duration": 600,
        "enable_recording": False,
        "apply_greenscreen": False,
        "language": "english",
        "enable_closed_captions": True
    }
}
r2 = httpx.post(
    'https://tavusapi.com/v2/conversations',
    headers={'Content-Type': 'application/json', 'x-api-key': tavus_key},
    json=payload,
    timeout=30
)
print("Status:", r2.status_code)
data = r2.json()
if r2.status_code in (200, 201):
    print("conversation_id:", data.get('conversation_id'))
    print("conversation_url:", data.get('conversation_url'))
    print("\n✅ SUCCESS — paste this URL into a browser to test the live AI interview!")
else:
    print("Error response:", json.dumps(data, indent=2)[:400])
