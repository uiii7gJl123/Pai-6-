import os
from typing import Optional
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn

APP_NAME = "pai-6 — Operational AI (Render Edition)"
APP_VERSION = "2.1.0"

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

class ChatMessage(BaseModel):
    message: str
    context: Optional[list] = None

@app.get("/api/health")
def health():
    return {"ok": True, "service": APP_NAME, "version": APP_VERSION}

@app.post("/api/chat")
def chat(msg: ChatMessage):
    user_text = (msg.message or "").strip()
    if not user_text:
        return {"reply": "اكتب رسالة أولاً."}
    return {"reply": f"تم الاستلام: {user_text}"}

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

# قدّم مجلد البناء الخاص بالواجهة
app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))