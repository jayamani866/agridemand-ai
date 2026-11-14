from dotenv import load_dotenv
from google import genai
import os
load_dotenv(".env")
key = os.getenv("GEMINI_API_KEY")
print("1. API key loaded:", bool(key), flush=True)
try:
    client = genai.Client(
        api_key=key,
        http_options={"timeout": 15000}
    )
    print("2. Sending request...", flush=True)
    result = client.models.generate_content(
        model="gemini-3.8-flash",
        contents="Say AgriDemand AI connected"
    )
    print("3. RESULT:", result.text, flush=True)
except Exception as e:
    print("3. ERROR:", type(e).__name__, str(e)[:300], flush=True)
