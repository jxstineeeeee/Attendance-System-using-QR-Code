import { useCallback, useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

/**
 * Reads QR codes from the device camera.
 *
 * Decoding happens here rather than in the browser's own barcode support:
 * BarcodeDetector is not available on Windows Chrome, which is what the gate
 * tablets and the dev machines run. jsQR works on an ImageData frame, so the
 * loop is: draw the video into an offscreen canvas, hand the pixels over,
 * repeat on the next animation frame.
 */

export type CameraStatus = 'idle' | 'starting' | 'scanning' | 'blocked' | 'error'

/** Frames are scaled to this width before decoding; smaller is faster. */
const DECODE_WIDTH = 480

function decodeImageData(data: ImageData): string | null {
  const code = jsQR(data.data, data.width, data.height, {
    // The codes are dark-on-light; skipping inversion halves the work.
    inversionAttempts: 'dontInvert',
  })
  return code?.data ?? null
}

export function useQrScanner({
  onCode,
  paused = false,
}: {
  onCode: (text: string) => void
  paused?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameRef = useRef<number | null>(null)

  // Kept in refs so changing them never restarts the camera.
  const onCodeRef = useRef(onCode)
  const pausedRef = useRef(paused)
  onCodeRef.current = onCode
  pausedRef.current = paused

  const [status, setStatus] = useState<CameraStatus>('idle')
  const [error, setError] = useState('')

  const canvas = () => {
    canvasRef.current ??= document.createElement('canvas')
    return canvasRef.current
  }

  const stop = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setStatus('idle')
  }, [])

  const start = useCallback(async () => {
    if (streamRef.current) return
    setError('')
    setStatus('starting')

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('error')
      setError(
        'This browser will not open a camera here. A camera needs HTTPS or ' +
          'localhost; the image fallback below still works.',
      )
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // The back camera on a tablet; a laptop simply ignores this.
        video: { facingMode: 'environment', width: { ideal: 1280 } },
        audio: false,
      })
      streamRef.current = stream

      const video = videoRef.current
      if (!video) {
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        return
      }

      video.srcObject = stream
      video.setAttribute('playsinline', 'true')
      await video.play()
      setStatus('scanning')

      const tick = () => {
        frameRef.current = requestAnimationFrame(tick)

        if (pausedRef.current) return
        if (!video.videoWidth) return

        const scale = DECODE_WIDTH / video.videoWidth
        const w = DECODE_WIDTH
        const h = Math.round(video.videoHeight * scale)

        const c = canvas()
        c.width = w
        c.height = h
        const ctx = c.getContext('2d', { willReadFrequently: true })
        if (!ctx) return

        ctx.drawImage(video, 0, 0, w, h)
        const found = decodeImageData(ctx.getImageData(0, 0, w, h))
        if (found) onCodeRef.current(found)
      }

      frameRef.current = requestAnimationFrame(tick)
    } catch (err) {
      streamRef.current = null
      const name = err instanceof DOMException ? err.name : ''
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setStatus('blocked')
        setError(
          'Camera access was refused. Allow the camera for this site, or use ' +
            'the image fallback below.',
        )
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setStatus('error')
        setError('No camera is attached to this device.')
      } else {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'The camera failed to start.')
      }
    }
  }, [])

  // Whatever happens, do not leave the camera light on.
  useEffect(() => stop, [stop])

  /**
   * Decodes a still image instead of the camera — a photo of a card, or a
   * saved QR. Also the way to exercise the gate on a machine with no camera.
   */
  const decodeFile = useCallback(async (file: File): Promise<string | null> => {
    const bitmap = await createImageBitmap(file)
    const c = canvas()
    c.width = bitmap.width
    c.height = bitmap.height
    const ctx = c.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null

    ctx.drawImage(bitmap, 0, 0)
    bitmap.close()

    return decodeImageData(ctx.getImageData(0, 0, c.width, c.height))
  }, [])

  return { videoRef, status, error, start, stop, decodeFile }
}
