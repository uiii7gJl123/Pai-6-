import React, { useEffect, useState } from 'react'
import { fetchStats } from '../api'

export default function PerformanceMonitor() {
  const [stats, setStats] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    let timer
    async function load() {
      try {
        const s = await fetchStats()
        setStats(s)
        setErr(null)
      } catch (e) {
        setErr(e?.message || 'خطأ')
      }
      timer = setTimeout(load, 5000)
    }
    load()
    return () => clearTimeout(timer)
  }, [])

  if (err) return <div className="card text-red-300">فشل جلب الإحصاءات: {String(err)}</div>

  return (
    <div className="card">
      <h2 className="text-sm text-white/70 mb-2">مراقبة الأداء</h2>
      <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(stats, null, 2)}</pre>
    </div>
  )
}
