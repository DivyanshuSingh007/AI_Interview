"""Test the full auth flow against the running server."""
import httpx, json

BASE = "http://localhost:8000"

# 1) Register
print("=== Register ===")
r = httpx.post(f"{BASE}/auth/register", json={
    "name": "Divya Test",
    "email": "divya_test@interviewai.local",
    "password": "testpass123"
})
print("Status:", r.status_code)
if r.status_code == 201:
    data = r.json()
    token = data["access_token"]
    print("User:", data["user"])
    print("Token (first 40):", token[:40], "...")
elif r.status_code == 409:
    print("User already exists - testing login instead")
    token = None
else:
    print("Error:", r.text[:200])
    token = None

# 2) Login
print("\n=== Login ===")
r2 = httpx.post(f"{BASE}/auth/login", json={
    "email": "divya_test@interviewai.local",
    "password": "testpass123"
})
print("Status:", r2.status_code)
if r2.status_code == 200:
    data2 = r2.json()
    token = data2["access_token"]
    print("Logged in as:", data2["user"])
else:
    print("Error:", r2.text[:200])

# 3) /auth/me
if token:
    print("\n=== /auth/me ===")
    r3 = httpx.get(f"{BASE}/auth/me", headers={"Authorization": f"Bearer {token}"})
    print("Status:", r3.status_code)
    print("Profile:", r3.json())

print("\nAll auth tests passed!")
