import os, shutil, mimetypes
from typing import Optional, Tuple
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
from openai import OpenAI

# PostgreSQL
import psycopg2, psycopg2.extras

APP_NAME = "pai-6 — Operational AI (Render Edition)"
APP_VERSION = "3.0.0"

app = FastAPI(title=APP_NAME, version=APP_VERSION)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# مسارات
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# OpenAI
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# DB
DB_URL = os.environ.get("DATABASE_URL")

def db():
    return psycopg2.connect(DB_URL, sslmode="require")

@app.on_event("startup")
def init_db():
    conn = db()
    cur = conn.cursor()
    # الجدول الأساسي
    cur.execute("""
    CREATE TABLE IF NOT EXISTS files (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL,
      mime TEXT,
      size_bytes INTEGER,
      dest_folder TEXT,
      path TEXT NOT NULL,
      instruction TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    """)
    # أعمدة إضافية للوحة
    cur.execute("ALTER TABLE files ADD COLUMN IF NOT EXISTS ext TEXT;")
    cur.execute("ALTER TABLE files ADD COLUMN IF NOT EXISTS file_type TEXT;")
    cur.execute("ALTER TABLE files ALTER COLUMN created_at SET DEFAULT NOW();")
    conn.commit()
    conn.close()

# نماذج
class ChatMessage(BaseModel):
    message: str
    context: Optional[list] = None

# صحة
@app.get("/api/health")
def health():
    llm_ready = bool(client)
    db_ready = True
    try:
        conn = db(); conn.close()
    except Exception:
        db_ready = False
    return {"ok": True, "service": APP_NAME, "version": APP_VERSION, "llm_ready": llm_ready, "db_ready": db_ready}

# دردشة
@app.post("/api/chat")
def chat(msg: ChatMessage):
    text = (msg.message or "").strip()
    if not text:
        return {"reply": "اكتب رسالة أولاً."}
    if client is None:
        return {"error": "LLM_DISABLED", "detail": "أضف OPENAI_API_KEY."}
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

# تصنيف أولي حسب الامتداد
def map_ext_category(ext: str) -> Tuple[str, str]:
    e = ext.lower().lstrip(".")
    drawings = {"dwg","dxf","dgn","rvt","skp"}
    models   = {"ifc","3ds","fbx","obj","stl","step","iges","igs"}
    docs     = {"doc","docx","txt","rtf","md"}
    sheets   = {"xls","xlsx","csv"}
    images   = {"jpg","jpeg","png","tif","tiff","bmp","webp"}
    videos   = {"mp4","mov","mkv","avi"}
    audio    = {"wav","mp3","m4a","aac","ogg","webm"}
    timeline = {"mpp"}
    archives = {"zip","rar","7z","tar","gz"}
    pdf      = {"pdf"}

    if e in drawings: return ("drawings", "drawing")
    if e in models:   return ("models",   "model")
    if e in docs:     return ("docs",     "document")
    if e in sheets:   return ("finance",  "spreadsheet")
    if e in images:   return ("photos",   "image")
    if e in videos:   return ("media",    "video")
    if e in audio:    return ("media",    "audio")
    if e in timeline: return ("timeline", "schedule")
    if e in archives: return ("archives", "archive")
    if e in pdf:      return ("unknown",  "pdf")
    return ("other",  "other")

# تصنيف نهائي مع LLM عند الحاجة
def classify_folder(name: str, mime: str, sample_text: str, ext: str, pre_cat: str, file_type: str) -> str:
    if pre_cat not in {"unknown", "other"}:
        return pre_cat
    if client is None:
        if file_type in {"document","pdf"}: return "reports"
        if file_type == "spreadsheet": return "finance"
        return "other"

    prompt = f"""
اختر مجلد واحد فقط من:
drawings, models, contracts, finance, photos, reports, timeline, media, device_data, archives, other.

الاسم: {name}
النوع: {mime}
الامتداد: {ext}
مقتطف:
{sample_text[:1500]}

أعد اسم مجلد واحد فقط.
""".strip()

    try:
        r = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role":"system","content":"أعد اسم مجلد واحد فقط من القائمة."},
                {"role":"user","content": prompt}
            ],
            temperature=0,
            max_tokens=8,
        )
        out = (r.choices[0].message.content or "other").strip().lower()
        allowed = {"drawings","models","contracts","finance","photos","reports","timeline","media","device_data","archives","other"}
        return out if out in allowed else "other"
    except Exception:
        return "other"

# معالجة رفع موحّدة
def process_upload(content: bytes, filename: str, content_type: str, instruction: Optional[str]):
    base, ext = os.path.splitext(filename)
    tmp_path = os.path.join(UPLOAD_DIR, filename)
    i = 1
    while os.path.exists(tmp_path):
        tmp_path = os.path.join(UPLOAD_DIR, f"{base}_{i}{ext}"); i += 1
    with open(tmp_path, "wb") as f:
        f.write(content)

    mime = content_type or mimetypes.guess_type(tmp_path)[0] or "application/octet-stream"
    try:
        if (mime.startswith("text/") or ext.lower() in {".txt",".md",".csv",".log",".json"}):
            sample_text = content[:4000].decode("utf-8", errors="ignore")
        else:
            sample_text = f"(binary {mime}, size={len(content)} bytes)"
    except Exception:
        sample_text = "(unreadable)"

    pre_cat, file_type = map_ext_category(ext)
    dest_folder = classify_folder(os.path.basename(tmp_path), mime, sample_text, ext, pre_cat, file_type)

    dest_dir = os.path.join("vault", dest_folder)
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = os.path.join(dest_dir, os.path.basename(tmp_path))
    shutil.move(tmp_path, dest_path)

    conn = db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO files (filename, mime, size_bytes, dest_folder, path, instruction, ext, file_type) VALUES (%s,%s,%s,%s,%s,%s,%s,%s);",
        (os.path.basename(dest_path), mime, len(content), dest_folder, dest_path, instruction, ext.lower().lstrip("."), file_type)
    )
    conn.commit()
    conn.close()

    return {
        "saved": True,
        "filename": os.path.basename(dest_path),
        "mime": mime,
        "size_bytes": len(content),
        "ext": ext.lower().lstrip("."),
        "file_type": file_type,
        "dest_folder": dest_folder,
        "path": dest_path,
        "instruction": instruction,
    }

# نقاط الرفع (كلها تدعم instruction)
@app.post("/api/upload")
async def upload(file: UploadFile = File(...), instruction: Optional[str] = Form(None)):
    content = await file.read()
    return process_upload(content, file.filename, file.content_type or "", instruction)

@app.post("/api/upload/audio")
async def upload_audio(audio: UploadFile = File(...), instruction: Optional[str] = Form(None)):
    content = await audio.read()
    name = audio.filename or "recording.webm"
    return process_upload(content, name, audio.content_type or "audio/webm", instruction)

@app.post("/api/upload/image")
async def upload_image(image: UploadFile = File(...), instruction: Optional[str] = Form(None)):
    content = await image.read()
    name = image.filename or "capture.png"
    return process_upload(content, name, image.content_type or "image/png", instruction)

# قائمة الملفات للوحة القيادة
@app.get("/api/files")
def list_files(limit: int = 100):
    conn = db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT id, filename, ext, file_type, mime, size_bytes, dest_folder, path, instruction, created_at
        FROM files ORDER BY id DESC LIMIT %s;
    """, (limit,))
    rows = cur.fetchall()
    conn.close()
    return {"items": rows}

# تقديم الواجهة
app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))