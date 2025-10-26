import React, { useState } from 'react'
import { aiChat } from '../api'

export default function ChatPanel() {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState([])
  const [busy, setBusy] = useState(false)

  async function send() {
    if (!input.trim()) return
    setBusy(true)
    try {
      setHistory(h => [...h, { role: 'user', content: input }])
      const res = await aiChat(input, { source: 'dashboard' })
      const content = typeof res === 'string' ? res : (res?.reply || JSON.stringify(res))
      setHistory(h => [...h, { role: 'assistant', content }])
      setInput('')
    } catch (e) {
      setHistory(h => [...h, { role: 'assistant', content: 'فشل الطلب: ' + (e?.message || 'خطأ') }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card space-y-3">
      <div className="max-h-72 overflow-auto space-y-2">
        {history.map((m, i) => (
          <div key={i} className={`p-2 rounded ${m.role === 'user' ? 'bg-white/10' : 'bg-white/5'}`}>
            <div className="text-xs text-white/60">{m.role === 'user' ? 'مستخدم' : 'مساعد'}</div>
            <div className="text-sm whitespace-pre-wrap">{m.content}</div>
          </div>
        ))}
        {history.length === 0 && <div className="text-white/60 text-sm">ابدأ كتابة سؤالك.</div>}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600"
          placeholder="اكتب رسالة…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <button className="btn" onClick={send} disabled={busy}>{busy ? 'جارٍ...' : 'إرسال'}</button>
      </div>
    </div>
  )
}