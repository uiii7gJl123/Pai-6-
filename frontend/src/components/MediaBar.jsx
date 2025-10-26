import React, { useEffect, useRef, useState } from 'react'
import { uploadAudio, uploadImage } from '../api'

export default function MediaBar() {
  const videoRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [rec, setRec] = useState(null)
  const [chunks, setChunks] = useState([])
  const [status, setStatus] = useState('جاهز')

  useEffect(() => {
    return () => {
      stream?.getTracks()?.forEach(t => t.stop())
    }
  }, [stream])

  async function startCamera() {
    const s = await navigator.mediaDevices.getUserMedia({ video: true })
    videoRef.current.srcObject = s
    setStream(s)
  }

  async function captureImage() {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    canvas.toBlob(async (blob) => {
      setStatus('رفع الصورة…')
      try {
        const res = await uploadImage(blob)
        setStatus('تم: ' + (res?.status || 'OK'))
      } catch (e) {
        setStatus('فشل: ' + (e?.message || 'خطأ'))
      }
    }, 'image/png')
  }

  async function startRec() {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true })
    const r = new MediaRecorder(s, { mimeType: 'audio/webm' })
    r.ondataavailable = e => setChunks(c => [...c, e.data])
    r.onstop = async () => {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      setChunks([])
      setStatus('رفع الصوت…')
      try {
        const res = await uploadAudio(blob)
        setStatus('تم: ' + (res?.status || 'OK'))
      } catch (e) {
        setStatus('فشل: ' + (e?.message || 'خطأ'))
      }
    }
    setRec(r)
    r.start()
    setStatus('تسجيل…')
  }

  function stopRec() {
    rec?.stop()
    setStatus('إيقاف التسجيل')
  }

  return (
    <div className="card space-y-3">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-sm text-white/70">الكاميرا</div>
          <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl border border-white/10 bg-black/40" />
          <div className="flex gap-2">
            <button className="btn" onClick={startCamera}>تشغيل</button>
            <button className="btn-ghost" onClick={captureImage}>التقاط ورفع</button>
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
    </div>
  )
}
