import React, { useEffect, useRef, useState } from 'react'
import { uploadAudio, uploadImage } from '../api'
import UploadConfirm from './UploadConfirm'

export default function MediaBar() {
  const videoRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [rec, setRec] = useState(null)
  const [chunks, setChunks] = useState([])
  const [status, setStatus] = useState('جاهز')
  const [pending, setPending] = useState(null) // {type:'image'|'audio', file: File|Blob}

  useEffect(() => {
    return () => {
      stopCamera()
      stopRecordingCleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // تشغيل الكاميرا
  async function startCamera() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = s
      }
      setStream(s)
      setStatus('الكاميرا تعمل')
    } catch (e) {
      console.error(e)
      setStatus('فشل تشغيل الكاميرا: ' + (e?.message || 'خطأ'))
    }
  }

  // إيقاف الكاميرا نهائياً
  function stopCamera() {
    try {
      stream?.getTracks()?.forEach(t => {
        try { t.stop() } catch {}
      })
    } catch (e) { /* ignore */ }
    if (videoRef.current) {
      try { videoRef.current.srcObject = null } catch {}
    }
    setStream(null)
    setStatus('الكاميرا متوقفة')
  }

  // التقاط صورة ووضعها كـ pending لعرض التأكيد
  function captureImage() {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'capture.png', { type: 'image/png' })
        setPending({ type: 'image', file })
        setStatus('صورة جاهزة للتأكيد')
      } else {
        setStatus('فشل التقاط الصورة')
      }
    }, 'image/png')
  }

  // تنظيف التسجيل عند الإنهاء غير المتوقع
  function stopRecordingCleanup() {
    try {
      rec?.state === 'recording' && rec.stop()
    } catch {}
    setRec(null)
    setChunks([])
  }

  // بدء التسجيل الصوتي
  async function startRec() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true })
      const options = { mimeType: 'audio/webm' }
      let recorder
      try {
        recorder = new MediaRecorder(s, options)
      } catch (e) {
        // فشل نوع mimeType، جرب بدون خيارات
        recorder = new MediaRecorder(s)
      }

      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) {
          setChunks(prev => [...prev, e.data])
        }
      }

      recorder.onstart = () => setStatus('تسجيل...')

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        const file = new File([blob], 'recording.webm', { type: blob.type })
        setChunks([])
        setPending({ type: 'audio', file })
        setStatus('التسجيل جاهز للتأكيد')
        // أوقف مسارات الميكروفون لأننا انتهينا منه
        try { s.getTracks().forEach(t => t.stop()) } catch {}
      }

      recorder.onerror = (ev) => {
        console.error('recorder error', ev)
        setStatus('خطأ في التسجيل')
      }

      setRec(recorder)
      setChunks([])
      recorder.start()
    } catch (e) {
      console.error(e)
      setStatus('فشل بدء التسجيل: ' + (e?.message || 'خطأ'))
    }
  }

  // إيقاف التسجيل (يدعو حدث onstop)
  function stopRec() {
    try {
      if (rec && rec.state === 'recording') {
        rec.stop()
        setStatus('إيقاف التسجيل...')
      } else {
        setStatus('لا يوجد تسجيل جاري')
      }
    } catch (e) {
      console.error(e)
      setStatus('فشل إيقاف التسجيل')
    } finally {
      setRec(null)
    }
  }

  // تأكيد الرفع: يرسل pending.file + instruction
  async function confirmUpload(instruction) {
    if (!pending?.file) return
    try {
      setStatus('جارٍ الرفع…')
      if (pending.type === 'image') {
        const res = await uploadImage(pending.file, instruction)
        setStatus(`تم: ${res?.dest_folder || 'ok'} → ${res?.filename}`)
      } else if (pending.type === 'audio') {
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
          <div className="flex gap-2 mt-2">
            <button className="btn" onClick={startCamera}>تشغيل</button>
            <button className="btn-ghost" onClick={captureImage}>التقاط</button>
            <button className="btn-ghost" onClick={stopCamera}>إيقاف الكاميرا</button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-white/70">الصوت</div>
          <div className="flex gap-2 mt-2">
            <button className="btn" onClick={startRec}>بدء التسجيل</button>
            <button className="btn-ghost" onClick={stopRec}>إيقاف التسجيل</button>
          </div>
        </div>
      </div>

      <div className="text-sm text-white/70">{status}</div>
      <div className="text-xs text-white/50">يتطلب HTTPS لإذن الكاميرا والميكروفون.</div>

      {pending && (
        <UploadConfirm
          file={pending.file instanceof File ? pending.file : { name: pending.type === 'audio' ? 'recording.webm' : 'capture.png', size: pending.file?.size || 0 }}
          onCancel={() => { setPending(null); setChunks([]) }}
          onConfirm={confirmUpload}
        />
      )}
    </div>
  )
}