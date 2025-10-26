import os
import shutil
import mimetypes
from typing import Optional
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
from openai import OpenAI

APP_NAME = "pai-6 — Operational AI (Render Edition)"
APP_VERSION = "2.3.0"

app = FastAPI(title=APP_NAME, version=APP_VERSION)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# تخزين
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# OpenAI
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

# تصنيف مجلد بسيط متزامن
def classify_folder(name: str, mime: str, sample_text: str) -> str:
    """
    يعيد اسم مجلد واحد من القائمة التالية:
    invoices, receipts, contracts, images, audio, video, docs, spreadsheets, presentations, code, other
    """
    if client is None:
        # بدون نموذج، استخدم قواعد بسيطة
        if mime.startswith("image/"):
            return "images"
        if mime.startswith("audio/"):
            return "audio"
        if mime.startswith("video/"):
            return "video"
        if mime in {"application/pdf", "text/plain"}:
            return "docs"
        return "other"

    prompt = f"""
صنّف هذا الملف إلى مجلد واحد فقط من:
invoices, receipts, contracts, images, audio, video, docs, spreadsheets, presentations, code, other.
الاسم: {name}
النوع: {mime}
مقتطف المحتوى:
{sample_text[:1500]}
أجب بكلمة مجلد واحدة فقط دون شرح.
""".strip()

    try:
        r = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "أعد اسم مجلد واحد فقط."},
                {"role": "user", "content": prompt},
            ],
            temperature=0,
            max_tokens=10,
        )
        out = (r.choices[0].message.content or "other").strip().lower()
        allowed = {
            "invoices", "receipts", "contracts", "images", "audio",
            "video", "docs", "spreadsheets", "presentations", "code", "other"
        }
        return out if out in allowed else "other"
    except Exception:
        return "other"

@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    # 1) حفظ أولي باسم فريد
    tmp_path = os.path.join(UPLOAD_DIR, file.filename)
    base, ext = os.path.splitext(file.filename)
    i = 1
    while os.path.exists(tmp_path):
        tmp_path = os.path.join(UPLOAD_DIR, f"{base}_{i}{ext}")
        i += 1
    content = await file.read()
    with open(tmp_path, "wb") as f:
        f.write(content)

    # 2) معلومات بسيطة للتصنيف
    mime = file.content_type or mimetypes.guess_type(tmp_path)[0] or "application/octet-stream"
    try:
        if mime.startswith("text/") or ext.lower() in {".txt", ".md", ".csv", ".log", ".json"}:
            sample_text = content[:4000].decode("utf-8", errors="ignore")
        else:
            sample_text = f"(binary {mime}, size={len(content)} bytes)"
    except Exception:
        sample_text = "(unreadable)"

    # 3) تصنيف المجلد
    folder = classify_folder(os.path.basename(tmp_path), mime, sample_text)

    # 4) نقل إلى الوجهة النهائية
    dest_dir = os.path.join("vault", folder)
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = os.path.join(dest_dir, os.path.basename(tmp_path))
    shutil.move(tmp_path, dest_path)

    return {
        "saved": True,
        "filename": os.path.basename(dest_path),
        "mime": mime,
        "dest_folder": folder,
        "path": dest_path,
    }

# تقديم واجهة البناء
app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))