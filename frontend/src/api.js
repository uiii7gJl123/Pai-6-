import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'https://pai6-contractors.onrender.com/api'

const client = axios.create({
  baseURL: API,
  timeout: 20000
})

export async function fetchOverview() {
  const { data } = await client.get('/overview')
  return data
}

export async function fetchProjects() {
  const { data } = await client.get('/projects')
  return data
}

export async function fetchStats() {
  const { data } = await client.get('/stats')
  return data
}

export async function aiChat(message, meta = {}) {
  const { data } = await client.post('/chat', { message, meta })
  return data
}

export async function uploadFile(file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await client.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return data
}

export async function uploadAudio(blob) {
  const form = new FormData()
  form.append('audio', blob, 'recording.webm')
  const { data } = await client.post('/upload/audio', form)
  return data
}

export async function uploadImage(blob) {
  const form = new FormData()
  form.append('image', blob, 'capture.png')
  const { data } = await client.post('/upload/image', form)
  return data
}
