import axios from 'axios'

// نفس دومين Render
const ORIGIN = window.location.origin.replace(/\/$/, '')
const ENV = (import.meta?.env?.VITE_API_URL || '').trim()

const client = axios.create({
  baseURL: ENV || ORIGIN,
  timeout: 20000,
})

// صحة
export async function ping() {
  const { data } = await client.get('/api/health')
  return data
}

// دردشة
export async function aiChat(message, meta = {}) {
  const { data } = await client.post('/api/chat', { message, meta })
  return data
}

// رفع ملف عام (الـ backend يقبل المفتاح "file")
export async function uploadFile(file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await client.post('/api/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

// مطابقة لتوقّعات MediaBar دون الحاجة لمسارات باك إضافية
export async function uploadAudio(blob) {
  const file = blob instanceof File ? blob :
    new File([blob], 'recording.webm', { type: blob?.type || 'audio/webm' })
  return uploadFile(file)
}

export async function uploadImage(blob) {
  const file = blob instanceof File ? blob :
    new File([blob], 'capture.png', { type: blob?.type || 'image/png' })
  return uploadFile(file)
}

/* هذه الدوال كانت تضرب مسارات غير موجودة لديك.
   نعيد بيانات محلية لتجنّب 404 لحين إضافة APIs حقيقية. */
export async function fetchOverview() {
  return { plans: [], status: 'ok', ts: new Date().toISOString() }
}
export async function fetchProjects() { return { projects: [] } }
export async function fetchStats() { return { totals: { files: 0, messages: 0 } } }