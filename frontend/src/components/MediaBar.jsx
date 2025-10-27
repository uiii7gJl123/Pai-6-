import React, { useEffect, useRef, useState } from 'react'
import { uploadAudio, uploadImage } from '../api'
import UploadConfirm from './UploadConfirm'

export default function MediaBar() {
  const videoRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [rec, setRec] = useState(null)
  const [chunks, setChunks] = useState([])
  const [status, setStatus] = useState('جاهز')
  const [pending, setPending] = useState(null) // {type:'image'|'audio', file|blob}

  useEffect(() => {
    return () => { stream?.getTracks()?.forEach(t => t.stop()) }
  }, [stream])

  async function startCamera() {
    const s = await navigator.mediaDevices.getUserMedia({ video: true })
    videoRef.current.srcObject = s
    setStream(s)
  }

  function captureImage() {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      setPending({ type: 'image', file: blob })
    }, 'image/png')
  }

  async function startRec() {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true })
    const r = new MediaRecorder(s, { mimeType: 'audio/webm' })
    r.ondataavailable = e => setChunks(c => [...c, e.data])
    r.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      setChunks([])
      setPending({ type: 'audio', file: blob })
    }
    setRec(r)
    r.start()
    setStatus('تسجيل…')
  }

  function stopRec() {
    rec?.stop()
    setStatus('إيقاف التسجيل')
  }

  async function confirmUpload(instruction) {
    try {
      setStatus('جارٍ الرفع…')
      if (pending?.type === 'image') {
        const res = await uploadImage(pending.file, instruction)
        setStatus(`تم: ${res?.dest_folder || 'ok'} → ${res?.filename}`)
      } else if (pending?.type === 'audio') {
        const res = await uploadAudio(pending.file, instruction)
        setStatus(`تم: ${res?.dest_folder || 'ok'} → ${res?.filename}`)
      }
    } catch (e) {
      setStatus('فشل: ' + (e?.message || 'Network'))
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="card space-y-3">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-sm text-white/70">الكاميرا</div>
          <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl border border-white/10 bg-black/40" />
          <div className="flex gap-2">
            <button className="btn" onClick={startCamera}>تشغيل</button>
            <button className="btn-ghost" onClick={captureImage}>التقاط</button>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-sm text-white/70">الصوت</div>
          <div className="flex gap-2">
            <button className="btn" onClick={startRec}>بدء التسجيل</button>
            <button className="btn-ghost" onClick={stopRec}>إيقاف</button>
          </div>
        </div>
      </div>

      <div className="text-sm text-white/70">{status}</div>
      <div className="text-xs text-white/50">يتطلب HTTPS لإذن الكاميرا والميكروفون.</div>

      {pending && (
        <UploadConfirm
          file={pending.file instanceof File ? pending.file : { name: pending.type === 'audio' ? 'recording.webm' : 'capture.png', size: pending.file?.size || 0 }}
          onCancel={() => setPending(null)}
          onConfirm={confirmUpload}
        />
      )}
    </div>
  )
}