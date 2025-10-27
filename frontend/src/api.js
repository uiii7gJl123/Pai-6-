import axios from 'axios'

const ORIGIN = window.location.origin.replace(/\/$/, '')
const BASE = (import.meta?.env?.VITE_API_URL || '').trim() || ORIGIN
const client = axios.create({ baseURL: BASE, timeout: 20000 })

export async function ping() {
  const { data } = await client.get('/api/health')
  return data
}

export async function aiChat(message, meta = {}) {
  const { data } = await client.post('/api/chat', { message, meta })
  return data?.reply ?? String(data ?? '')
}

export async function uploadFile(file, instruction = '') {
  const form = new FormData()
  form.append('file', file)
  if (instruction) form.append('instruction', instruction)
  const { data } = await client.post('/api/upload', form)
  return data
}

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

export async function deleteFiles(ids = []) {
  const { data } = await client.post('/api/files/delete', { ids })
  return data
}

/* مطلوبة للـ Dashboard.jsx */
export async function fetchOverview() {
  return {
    tasks: 12,
    projects: 3,
    clients: 5,
    success_rate: 92,
    ts: new Date().toISOString(),
  }
}

export async function fetchProjects() {
  return {
    projects: [
      { id: 1, name: 'مشروع مستشفى الرياض', sector: 'صحي',   progress: 0.75 },
      { id: 2, name: 'برج الميناء',        sector: 'تجاري', progress: 0.40 },
      { id: 3, name: 'مجمع سكني الشمال',   sector: 'سكني',  progress: 0.20 },
    ],
  }
}