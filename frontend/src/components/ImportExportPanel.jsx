import React, { useRef, useState } from 'react'
import { uploadFile } from '../api'
import UploadConfirm from './UploadConfirm'

export default function ImportExportPanel() {
  const fileRef = useRef(null)
  const [status, setStatus] = useState(null)
  const [pendingFile, setPendingFile] = useState(null)

  function choose() { fileRef.current?.click() }

  function onPick(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) setPendingFile(f)
  }

  async function confirmUpload(instruction) {
    if (!pendingFile) return
    setStatus('جارٍ الرفع…')
    try {
      const res = await uploadFile(pendingFile, instruction)
      setStatus(`تم: ${res?.dest_folder || 'ok'} → ${res?.filename}`)
    } catch (e) {
      setStatus('فشل الرفع: ' + (e?.message || 'Network'))
    } finally {
      setPendingFile(null)
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
      <input ref={fileRef} type="file" className="hidden" onChange={onPick} />
      <div className="flex items-center gap-3">
        <button className="btn" onClick={choose}>اختيار ملف</button>
        <button className="btn-ghost" onClick={exportJSON}>تصدير JSON</button>
      </div>
      <div className="text-sm text-white/70 min-h-6">{status}</div>

      {pendingFile && (
        <UploadConfirm
          file={pendingFile}
          onCancel={() => setPendingFile(null)}
          onConfirm={confirmUpload}
        />
      )}
    </div>
  )
}