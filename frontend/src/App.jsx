import React, { useEffect, useMemo, useState } from 'react'
import { Monitor, Upload, MessageSquare, Gauge, Camera, Mic, Trash2 } from 'lucide-react'
import Header from './components/Header.jsx'
import Dashboard from './components/Dashboard.jsx'
import ChatPanel from './components/ChatPanel.jsx'
import ImportExportPanel from './components/ImportExportPanel.jsx'
import PerformanceMonitor from './components/PerformanceMonitor.jsx'
import MediaBar from './components/MediaBar.jsx'

export default function App() {
  const [tab, setTab] = useState('dashboard')

  const tabs = useMemo(() => ([
    { id: 'dashboard', label: 'لوحة القيادة', icon: <Monitor size={18}/> },
    { id: 'chat', label: 'الدردشة', icon: <MessageSquare size={18}/> },
    { id: 'import', label: 'استيراد/تصدير', icon: <Upload size={18}/> },
    { id: 'monitor', label: 'الأداء', icon: <Gauge size={18}/> },
    { id: 'media', label: 'وسائط', icon: <Camera size={18}/> },
  ]), [])

  return (
    <div className="min-h-dvh">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <nav className="flex gap-2 flex-wrap">
          {tabs.map(t => (
            <button key={t.id}
              className={`btn-ghost ${tab === t.id ? 'bg-white/10' : ''}`}
              onClick={() => setTab(t.id)}>
              {t.icon}<span>{t.label}</span>
            </button>
          ))}
        </nav>

        {tab === 'dashboard' && <Dashboard />}
        {tab === 'chat' && <ChatPanel />}
        {tab === 'import' && <ImportExportPanel />}
        {tab === 'monitor' && <PerformanceMonitor />}
        {tab === 'media' && <MediaBar />}
      </main>
      <footer className="text-center text-xs text-white/50 py-6">
        PAI‑6 — Operational AI (Elite)
      </footer>
    </div>
  )
}
