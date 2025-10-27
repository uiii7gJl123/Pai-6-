import React, { useState } from 'react'

export default function UploadConfirm({ file, onCancel, onConfirm }) {
  const [instruction, setInstruction] = useState('')
  if (!file) return null

  const sizeKb = ((file.size || 0) / 1024).toFixed(1)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-slate-900 p-4 space-y-3">
        <div className="text-lg">تأكيد الرفع</div>
        <div className="text-sm text-white/70">
          سيتم رفع الملف إلى الذكاء الاصطناعي وتصنيفه تلقائيًا.
        </div>
        <div className="text-sm"><b>الملف:</b> {file.name} ({sizeKb} KB)</div>

        <label className="text-sm text-white/80">اكتب المطلوب للذكاء الاصطناعي</label>
        <textarea
          className="w-full rounded-lg bg-white/5 border border-white/10 p-2"
          rows={4}
          placeholder="مثال: استخرج الملخص وضعه تحت مجلد العقود..."
          value={instruction}
          onChange={e => setInstruction(e.target.value)}
        />

        <div className="flex gap-2 justify-end">
          <button className="btn-ghost" onClick={onCancel}>إلغاء</button>
          <button className="btn" onClick={() => onConfirm(instruction)}>رفع</button>
        </div>
      </div>
    </div>
  )
}