
# pai‑6 — Render-ready single service

نسخة موحدة تعمل على Render بدون فصل واجهة وخلفية.

## المتطلبات
- حساب Render مجاني.
- ربط المستودع أو الرفع المباشر.

## النشر على Render باستخدام render.yaml
1) أنشئ مستودع Git جديد وادفع الملفات.
2) على Render: New + → **Blueprint** (من مستودع)، واختر هذا المشروع الذي يحتوي على `render.yaml`.
3) Render سيثبت المتطلبات (`requirements.txt`) ثم يشغل:
   ```
   gunicorn -k uvicorn.workers.UvicornWorker app:app
   ```

## اختبار محليًا (اختياري)
```bash
python -m venv .venv
source .venv/bin/activate  # على ويندوز: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 10000
```
افتح http://localhost:10000

## نقاط النهاية
- GET `/api/health`
- POST `/api/chat`  { "message": "..." }
- POST `/api/upload`  form-data مع المفتاح `file`

الملفات المرفوعة تحفظ في مجلد `uploads/`.
