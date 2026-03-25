import httpx, json

key = "34a077dd649f456aaa51ee0c3b00fdd4"
headers = {"x-api-key": key}

# 1) Verify key
r = httpx.get("https://tavusapi.com/v2/replicas?limit=5", headers=headers, timeout=15)
print("Status:", r.status_code)
if r.status_code == 200:
    data = r.json()
    replicas = data.get("data", [])
    total = data.get("total_count", len(replicas))
    print(f"Key valid! {total} replicas available.")
    for rep in replicas[:5]:
        print(f"  {rep['replica_id']} | {rep['replica_name']} | {rep['model_name']}")
else:
    print("Error:", r.text[:200])

# 2) Quick conversation creation test
print()
r2 = httpx.post(
    "https://tavusapi.com/v2/conversations",
    headers={"Content-Type": "application/json", "x-api-key": key},
    json={
        "replica_id": "rdd4c86e5e1a",
        "conversation_name": "Key Validation Test",
        "conversational_context": "Say hello briefly.",
        "custom_greeting": "Hi there!",
        "properties": {
            "max_call_duration": 60,
            "enable_recording": False,
            "apply_greenscreen": False,
            "language": "english",
        },
    },
    timeout=20,
)
print("Conversation test status:", r2.status_code)
d = r2.json()
if r2.status_code in (200, 201):
    print("conversation_id:", d.get("conversation_id"))
    url = d.get("conversation_url", "")
    print("conversation_url:", url)
    print()
    print("SUCCESS - new API key is working!")
else:
    print("Error:", json.dumps(d, indent=2)[:400])
