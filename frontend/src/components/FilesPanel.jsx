import React, { useEffect, useMemo, useState } from 'react'
import { deleteFiles } from '../api'

export default function FilesPanel() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [selected, setSelected] = useState(() => new Set())

  async function load() {
    setLoading(true); setErr('')
    try {
      const res = await fetch('/api/files')
      const data = await res.json()
      setItems(data.items || [])
      setSelected(new Set())
    } catch (e) {
      setErr(e?.message || 'Network')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const allIds = useMemo(() => items.map(it => it.id), [items])
  const allSelected = selected.size > 0 && selected.size === items.length
  const anySelected = selected.size > 0

  function toggleOne(id) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allIds))
    }
  }

  async function handleDeleteSelected() {
    if (!anySelected) return
    const ids = Array.from(selected)
    const ok = window.confirm(`سيتم حذف ${ids.length} ملف. هل أنت متأكد؟`)
    if (!ok) return
    try {
      setLoading(true)
      await deleteFiles(ids)
      await load()
    } catch (e) {
      setErr(e?.message || 'Delete failed')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button className="btn-ghost text-sm" onClick={load} disabled={loading}>تحديث</button>
        <button className="btn text-sm" onClick={toggleAll} disabled={loading}>
          {allSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
        </button>
        <button className="btn-ghost text-sm" onClick={handleDeleteSelected} disabled={!anySelected || loading}>
          حذف المحدد ({selected.size})
        </button>
        {err && <div className="text-red-400 text-sm ml-auto">خطأ: {err}</div>}
      </div>

      <div className="card overflow-auto">
        {loading && <div className="text-white/70 text-sm p-3">جاري التحميل…</div>}

        {!loading && (
          <table className="w-full text-sm">
            <thead className="text-white/60">
              <tr>
                <th className="p-2 text-right w-10">
                  <input type="checkbox" checked={allSelected}
                    onChange={toggleAll} aria-label="select all" />
                </th>
                <th className="p-2 text-right">الاسم</th>
                <th className="p-2 text-right">الفئة</th>
                <th className="p-2 text-right">MIME</th>
                <th className="p-2 text-right">الحجم</th>
                <th className="p-2 text-right">المسار</th>
                <th className="p-2 text-right">الوقت</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => {
                const checked = selected.has(it.id)
                return (
                  <tr key={it.id} className="border-t border-white/10">
                    <td className="p-2">
                      <input type="checkbox" checked={checked}
                        onChange={() => toggleOne(it.id)} aria-label={`select ${it.id}`} />
                    </td>
                    <td className="p-2">{it.filename}</td>
                    <td className="p-2">{it.dest_folder}</td>
                    <td className="p-2">{it.mime}</td>
                    <td className="p-2">{(it.size_bytes || 0).toLocaleString()}</td>
                    <td className="p-2">{it.path}</td>
                    <td className="p-2">{new Date(it.created_at).toLocaleString()}</td>
                  </tr>
                )
              })}
              {items.length === 0 && (
                <tr><td className="p-2 text-white/60" colSpan={7}>لا توجد ملفات.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}