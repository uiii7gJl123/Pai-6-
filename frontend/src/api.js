import axios from 'axios'

const ORIGIN = window.location.origin.replace(/\/$/, '')
const BASE = (import.meta?.env?.VITE_API_URL || '').trim() || ORIGIN

const client = axios.create({ baseURL: BASE, timeout: 20000 })

// صحة
export async function ping() {
  const { data } = await client.get('/api/health')
  return data
}

// دردشة
export async function aiChat(message, meta = {}) {
  const { data } = await client.post('/api/chat', { message, meta })
  return data?.reply ?? String(data ?? '')
}

// رفع عام + تمرير تعليمات
export async function uploadFile(file, instruction = '') {
  const form = new FormData()
  form.append('file', file)
  if (instruction) form.append('instruction', instruction)
  const { data } = await client.post('/api/upload', form)
  return data
}

// وسائط: صورة
export async function uploadImage(blobOrFile, instruction = '') {
  const file = blobOrFile instanceof File
    ? blobOrFile
    : new File([blobOrFile], 'capture.png', { type: 'image/png' })
  const form = new FormData()
  form.append('image', file)
  if (instruction) form.append('instruction', instruction)
  const { data } = await client.post('/api/upload/image', form)
  return data
}

// وسائط: صوت
export async function uploadAudio(blobOrFile, instruction = '') {
  const file = blobOrFile instanceof File
    ? blobOrFile
    : new File([blobOrFile], 'recording.webm', { type: 'audio/webm' })
  const form = new FormData()
  form.append('audio', file)
  if (instruction) form.append('instruction', instruction)
  const { data } = await client.post('/api/upload/audio', form)
  return data
}

// بيانات لوحة (إن لم تكن APIs جاهزة)
export async function fetchOverview() { return { plans: [], status: 'ok', ts: new Date().toISOString() } }
export async function fetchProjects() { return { projects: [] } }
export async function fetchStats() { return { totals: { files: 0, messages: 0 } } }