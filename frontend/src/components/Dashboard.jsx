import React, { useEffect, useState } from 'react'
import { fetchOverview, fetchProjects } from '../api'

export default function Dashboard() {
  const [overview, setOverview] = useState(null)
  const [projects, setProjects] = useState([])
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function run() {
      try {
        const [ov, pr] = await Promise.all([fetchOverview(), fetchProjects()])
        if (mounted) {
          setOverview(ov)
          setProjects(pr?.projects || pr || [])
        }
      } catch (e) {
        setErr(e?.message || 'خطأ غير معروف')
      } finally {
        setLoading(false)
      }
    }
    run()
    return () => { mounted = false }
  }, [])

  if (loading) return <div className="card">جارِ التحميل…</div>
  if (err) return <div className="card text-red-300">فشل التحميل: {String(err)}</div>

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="card col-span-2">
        <h2 className="text-sm text-white/70 mb-2">النظرة العامة</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card">
            <div className="text-white/70 text-xs">المهام</div>
            <div className="stat">{overview?.tasks ?? 0}</div>
          </div>
          <div className="card">
            <div className="text-white/70 text-xs">المشاريع</div>
            <div className="stat">{overview?.projects ?? 0}</div>
          </div>
          <div className="card">
            <div className="text-white/70 text-xs">العملاء</div>
            <div className="stat">{overview?.clients ?? 0}</div>
          </div>
          <div className="card">
            <div className="text-white/70 text-xs">معدل النجاح</div>
            <div className="stat">{overview?.success_rate ?? 0}%</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-sm text-white/70 mb-2">إشعارات</h2>
        <ul className="space-y-2 text-sm">
          <li>تم تحديث النظام</li>
          <li>مزامنة البيانات مكتملة</li>
          <li>لا توجد أخطاء حالياً</li>
        </ul>
      </div>

      <div className="card col-span-3">
        <h2 className="text-sm text-white/70 mb-3">المشاريع</h2>
        <div className="grid md:grid-cols-3 gap-3">
          {projects.map((p, i) => (
            <div key={p.id || i} className="card">
              <div className="text-sm font-medium">{p.name || p.title || 'مشروع'}</div>
              <div className="text-xs text-white/60 mt-1">القطاع: {p.sector || p.owner || 'غير محدد'}</div>
              <div className="w-full bg-white/10 h-2 rounded mt-3 overflow-hidden">
                <div className="bg-brand-600 h-2" style={{width: `${Math.round((p.progress ?? 0)*100)}%`}} />
              </div>
            </div>
          ))}
          {projects.length === 0 && <div className="text-white/60">لا توجد مشاريع</div>}
        </div>
      </div>
    </div>
  )
}
