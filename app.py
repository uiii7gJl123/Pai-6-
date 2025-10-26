import os
from typing import Optional
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn

# دردشة حقيقية عبر OpenAI
from openai import OpenAI

APP_NAME = "pai-6 — Operational AI (Render Edition)"
APP_VERSION = "2.2.0"

app = FastAPI(title=APP_NAME, version=APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

class ChatMessage(BaseModel):
    message: str
    context: Optional[list] = None

@app.get("/api/health")
def health():
    return {
        "ok": True,
        "service": APP_NAME,
        "version": APP_VERSION,
        "llm_ready": bool(client),
    }

@app.post("/api/chat")
def chat(msg: ChatMessage):
    text = (msg.message or "").strip()
    if not text:
        return {"reply": "اكتب رسالة أولاً."}
    if client is None:
        return {"error": "LLM_DISABLED", "detail": "أضف OPENAI_API_KEY في بيئة Render."}

    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "أجب بالعربية بإيجاز ووضوح."},
                {"role": "user", "content": text},
            ],
            temperature=0.7,
            max_tokens=400,
        )
        out = resp.choices[0].message.content or ""
        return {"reply": out}
    except Exception as e:
        return {"error": "LLM_FAILED", "detail": str(e)}

@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    dest_path = os.path.join(UPLOAD_DIR, file.filename)
    base, ext = os.path.splitext(file.filename)
    counter = 1
    while os.path.exists(dest_path):
        dest_path = os.path.join(UPLOAD_DIR, f"{base}_{counter}{ext}")
        counter += 1
    with open(dest_path, "wb") as f:
        f.write(await file.read())
    return {"saved": True, "filename": os.path.basename(dest_path)}

# قدّم مجلد البناء للواجهة
app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))