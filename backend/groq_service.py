import os
from dotenv import load_dotenv
from groq import Groq

# Initialize
load_dotenv()
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
client = None

if GROQ_API_KEY:
    try:
        client = Groq(api_key=GROQ_API_KEY)
        print("--- Groq Client Service Initialized ---")
    except Exception as e:
        print(f"!!! Groq Service Error: {e} !!!")

def get_ai_completion(prompt, system_message="You are a professional AI Risk Analyst."):
    """Central helper for all Groq-powered AI calls."""
    if not client:
        return "AI not configured. Using local logic."
    
    try:
        completion = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1024,
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"!!! Groq API Call FAILED: {e} !!!")
        return f"AI analysis unavailable: {e}"
