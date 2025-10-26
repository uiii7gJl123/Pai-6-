import axios from 'axios'

// استخدم نفس الدومين الحالي للخدمة على Render
const RENDER_ORIGIN = window.location.origin.replace(/\/$/, '')

// لو عندك VITE_API_URL وتركته فاضي يعمل نسبياً
const ENV_BASE = (import.meta?.env?.VITE_API_URL || '').trim()

const client = axios.create({
  baseURL: ENV_BASE || RENDER_ORIGIN,   // لا تضع https://...onrender ولا localhost
  timeout: 20000,
})

// موجود في الباك
export async function aiChat(message, meta = {}) {
  const { data } = await client.post('/api/chat', { message, meta })
  return data
}

export async function uploadFile(file) {
  const form = new FormData()
  form.append('file', file)              // الباك ينتظر المفتاح "file"
  const { data } = await client.post('/api/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function ping() {
  const { data } = await client.get('/api/health')
  return data
}

/* ------------------ مسارات غير موجودة في الباك عندك ------------------
   نعيد بيانات محلية لتفادي طلبات 404 التي تكسر الـ preflight/CORS.
   إن أضفت API فعلي لاحقاً، غيّرها إلى طلبات حقيقية.
----------------------------------------------------------------------- */
export async function fetchOverview() {
  return {
    plans: [],
    status: 'ok',
    ts: new Date().toISOString(),
  }
}

export async function fetchProjects() {
  return { projects: [] }
}

export async function fetchStats() {
  return { totals: { files: 0, messages: 0 } }
}