import React from 'react'

export default function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/60 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">PAI‑6 — Operational AI (Elite)</h1>
        <div className="text-xs text-white/70">واجهة عربية · RTL</div>
      </div>
    </header>
  )
}
