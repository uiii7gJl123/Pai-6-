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

/* بيانات حقيقية من السيرفر للداشبورد */
export async function fetchOverview() {
  const { data } = await client.get('/api/overview')
  return data
}

export async function fetchProjects() {
  const { data } = await client.get('/api/projects')
  return data
}

export async function fetchStats() {
  const { data } = await client.get('/api/stats')
  return data
}