from fastapi import FastAPI, UploadFile, File, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import os, shutil, mimetypes, psycopg2, psycopg2.extras
from typing import Optional, List
from openai import OpenAI
import uvicorn

APP_NAME = "pai-6 — Operational AI (Render Edition)"
APP_VERSION = "2.6.0"

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
    return {"ok": True, "service": APP_NAME, "version": APP_VERSION}

@app.post("/api/chat")
def chat(msg: ChatMessage):
    if not msg.message:
        return {"reply": "اكتب رسالة أولاً."}
    if not client:
        return {"reply": "الذكاء الاصطناعي غير مفعّل حالياً."}
    r = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": "أجب بإيجاز وبالعربية."},
                  {"role": "user", "content": msg.message}],
    )
    return {"reply": r.choices[0].message.content}

def classify_folder(name, mime, content):
    if not client:
        if mime.startswith("image/"): return "images"
        if mime.startswith("audio/"): return "audio"
        return "other"
    prompt = f"صنّف الملف '{name}' بنوع {mime} إلى مجلد مناسب."
    r = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
    )
    return (r.choices[0].message.content or "other").strip().lower()

def process_upload(content: bytes, filename: str, mime: str):
    base, ext = os.path.splitext(filename)
    tmp_path = os.path.join(UPLOAD_DIR, filename)
    counter = 1
    while os.path.exists(tmp_path):
        tmp_path = os.path.join(UPLOAD_DIR, f"{base}_{counter}{ext}")
        counter += 1
    with open(tmp_path, "wb") as f:
        f.write(content)

    folder = classify_folder(filename, mime, content.decode("utf-8", errors="ignore"))
    dest_dir = os.path.join("vault", folder)
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = os.path.join(dest_dir, os.path.basename(tmp_path))
    shutil.move(tmp_path, dest_path)

    conn = db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO files (filename, mime, size_bytes, dest_folder, path) VALUES (%s,%s,%s,%s,%s);",
        (filename, mime, len(content), folder, dest_path),
    )
    conn.commit()
    conn.close()

    return {"saved": True, "filename": filename, "dest_folder": folder}

@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    content = await file.read()
    return process_upload(content, file.filename, file.content_type or "")

@app.get("/api/files")
def list_files(limit: int = 100):
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT * FROM files ORDER BY id DESC LIMIT %s;", (limit,))
    rows = cur.fetchall()
    conn.close()
    return {"items": rows}

@app.post("/api/files/delete")
def delete_files(ids: List[int] = Body(embed=True)):
    if not ids:
        raise HTTPException(status_code=400, detail="ids_required")

    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    ph = ",".join(["%s"] * len(ids))
    cur.execute(f"SELECT id, path FROM files WHERE id IN ({ph});", ids)
    rows = cur.fetchall()
    for r in rows:
        try:
            if os.path.exists(r["path"]):
                os.remove(r["path"])
        except Exception:
            pass
    cur.execute(f"DELETE FROM files WHERE id IN ({ph});", ids)
    conn.commit()
    conn.close()
    return {"deleted": len(rows)}

app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))