import os, shutil, mimetypes, time
from typing import Optional
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
from openai import OpenAI

# PostgreSQL
import psycopg2, psycopg2.extras

APP_NAME = "pai-6 — Operational AI (Render Edition)"
APP_VERSION = "2.5.0"

app = FastAPI(title=APP_NAME, version=APP_VERSION)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# تخزين ملفات مؤقت
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# OpenAI
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# DB
DB_URL = os.environ.get("DATABASE_URL")

def db():
    conn = psycopg2.connect(DB_URL, sslmode="require")
    return conn

@app.on_event("startup")
def init_db():
    conn = db()
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS files (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL,
      mime TEXT,
      size_bytes INTEGER,
      dest_folder TEXT,
      path TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    """)
    conn.commit()
    conn.close()

class ChatMessage(BaseModel):
    message: str
    context: Optional[list] = None

@app.get("/api/health")
def health():
    llm_ready = bool(client)
    db_ready = True
    try:
        conn = db(); conn.close()
    except Exception:
        db_ready = False
    return {"ok": True, "service": APP_NAME, "version": APP_VERSION, "llm_ready": llm_ready, "db_ready": db_ready}

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
        return {"reply": resp.choices[0].message.content or ""}
    except Exception as e:
        return {"error": "LLM_FAILED", "detail": str(e)}

def classify_folder(name: str, mime: str, sample_text: str) -> str:
    # قواعد بدائية إذا LLM غير مفعّل
    if client is None:
        if mime.startswith("image/"): return "images"
        if mime.startswith("audio/"): return "audio"
        if mime.startswith("video/"): return "video"
        if mime in {"application/pdf","text/plain"}: return "docs"
        return "other"

    prompt = f"""صنّف هذا الملف إلى واحد فقط من:
invoices, receipts, contracts, images, audio, video, docs, spreadsheets, presentations, code, other.
الاسم: {name}
النوع: {mime}
مقتطف:
{sample_text[:1500]}
أجب بكلمة مجلد واحدة فقط."""
    try:
        r = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role":"system","content":"أعد اسم مجلد واحد فقط."},
                {"role":"user","content":prompt}
            ],
            temperature=0, max_tokens=10,
        )
        out = (r.choices[0].message.content or "other").strip().lower()
        allowed = {"invoices","receipts","contracts","images","audio","video","docs","spreadsheets","presentations","code","other"}
        return out if out in allowed else "other"
    except Exception:
        return "other"

def process_upload(content: bytes, filename: str, content_type: str):
    # 1) حفظ مؤقت باسم فريد
    base, ext = os.path.splitext(filename)
    tmp_path = os.path.join(UPLOAD_DIR, filename)
    i = 1
    while os.path.exists(tmp_path):
        tmp_path = os.path.join(UPLOAD_DIR, f"{base}_{i}{ext}")
        i += 1
    with open(tmp_path, "wb") as f:
        f.write(content)

    # 2) استخراج معلومات للتصنيف
    mime = content_type or mimetypes.guess_type(tmp_path)[0] or "application/octet-stream"
    try:
        if mime.startswith("text/") or ext.lower() in {".txt",".md",".csv",".log",".json"}:
            sample_text = content[:4000].decode("utf-8", errors="ignore")
        else:
            sample_text = f"(binary {mime}, size={len(content)} bytes)"
    except Exception:
        sample_text = "(unreadable)"

    # 3) تصنيف
    folder = classify_folder(os.path.basename(tmp_path), mime, sample_text)

    # 4) نقل للوجهة النهائية
    dest_dir = os.path.join("vault", folder)
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = os.path.join(dest_dir, os.path.basename(tmp_path))
    shutil.move(tmp_path, dest_path)

    # 5) إدراج في قاعدة البيانات
    conn = db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO files (filename, mime, size_bytes, dest_folder, path) VALUES (%s,%s,%s,%s,%s);",
        (os.path.basename(dest_path), mime, len(content), folder, dest_path)
    )
    conn.commit()
    conn.close()

    return {
        "saved": True,
        "filename": os.path.basename(dest_path),
        "mime": mime,
        "dest_folder": folder,
        "path": dest_path
    }

# نقطة رفع عامة (تُستخدم من لوحة الاستيراد/التصدير)
@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    content = await file.read()
    return process_upload(content, file.filename, file.content_type or "")

# نقاط رفع للوسائط تُمرِّر لنفس المسار الذكي
@app.post("/api/upload/audio")
async def upload_audio(audio: UploadFile = File(...)):
    content = await audio.read()
    name = audio.filename or "recording.webm"
    return process_upload(content, name, audio.content_type or "audio/webm")

@app.post("/api/upload/image")
async def upload_image(image: UploadFile = File(...)):
    content = await image.read()
    name = image.filename or "capture.png"
    return process_upload(content, name, image.content_type or "image/png")

# عرض قائمة الملفات للوحة التحكم
@app.get("/api/files")
def list_files(limit: int = 100):
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT id, filename, mime, size_bytes, dest_folder, path, created_at FROM files ORDER BY id DESC LIMIT %s;", (limit,))
    rows = cur.fetchall()
    conn.close()
    return {"items": rows}

# تقديم الواجهة
app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))