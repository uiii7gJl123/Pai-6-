# PAI‑6 — Operational AI (Elite) Frontend

واجهة React عربية RTL مبنية بـ Vite + Tailwind.

## الإعداد

1) أنشئ ملف `.env` في جذر المشروع:

```
VITE_API_URL=https://pai6-contractors.onrender.com/api
```

2) ثبّت الحزم وشغّل التطوير:

```bash
npm i
npm run dev
```

3) البناء للإنتاج:

```bash
npm run build
npm run preview
```

## المزايا

- لوحة قيادة مع نظرة عامة ومشاريع
- دردشة متصلة بمسار `/chat`
- استيراد/تصدير ملفات
- مراقبة أداء من `/stats`
- وسائط: كاميرا وصوت مع رفع إلى `/upload/image` و`/upload/audio`

> يعمل دون أي أسطر ناقصة أو علامات `...`
