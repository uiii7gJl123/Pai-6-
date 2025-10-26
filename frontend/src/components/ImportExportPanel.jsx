import React, { useRef, useState } from 'react'
import { uploadFile } from '../api'

export default function ImportExportPanel() {
  const fileRef = useRef(null)
  const [status, setStatus] = useState(null)

  async function onFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setStatus('جارِ الرفع…')
    try {
      const res = await uploadFile(f)
      setStatus('تم الرفع: ' + (res?.status || 'OK'))
    } catch (e) {
      setStatus('فشل الرفع: ' + (e?.message || 'خطأ'))
    } finally {
      e.target.value = ''
    }
  }

  function exportJSON() {
    const data = { exported_at: new Date().toISOString(), sample: [1,2,3] }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pai6-export.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-3">
        <input ref={fileRef} type="file" className="hidden" onChange={onFile} />
        <button className="btn" onClick={() => fileRef.current?.click()}>رفع ملف</button>
        <button className="btn-ghost" onClick={exportJSON}>تصدير JSON</button>
      </div>
      <div className="text-sm text-white/70 min-h-6">{status}</div>
    </div>
  )
}