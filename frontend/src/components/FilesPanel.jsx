import React, { useEffect, useState } from 'react'

export default function FilesPanel() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/files')
    const data = await res.json()
    setItems(data.items || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-white/70">الملفات الأخيرة</div>
        <button className="btn-ghost text-sm" onClick={load}>تحديث</button>
      </div>

      {loading && <div className="text-white/70 text-sm">جاري التحميل…</div>}

      {!loading && (
        <table className="w-full text-sm">
          <thead className="text-white/60">
            <tr>
              <th className="p-2 text-right">الاسم</th>
              <th className="p-2 text-right">النوع</th>
              <th className="p-2 text-right">الحجم</th>
              <th className="p-2 text-right">المجلد</th>
              <th className="p-2 text-right">المسار</th>
              <th className="p-2 text-right">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id} className="border-t border-white/10">
                <td className="p-2">{it.filename}</td>
                <td className="p-2">{it.mime}</td>
                <td className="p-2">{(it.size_bytes||0).toLocaleString()}</td>
                <td className="p-2">{it.dest_folder}</td>
                <td className="p-2">{it.path}</td>
                <td className="p-2">{new Date(it.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}