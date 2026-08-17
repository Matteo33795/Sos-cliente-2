import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import type { IScannerControls } from '@zxing/browser'

interface BarcodeScannerProps {
  onResult: (text: string) => void
  onClose: () => void
}

export function BarcodeScanner({ onResult, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    let controls: IScannerControls | undefined
    let cancelled = false

    reader
      .decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        videoRef.current!,
        (result, err) => {
          if (cancelled) return
          if (result) {
            onResult(result.getText())
          }
          // NotFoundException viene emessa continuamente finche' non trova nulla: si ignora.
          if (err && err.name !== 'NotFoundException') {
            // errori di decodifica silenziosi, non bloccano la scansione
          }
        },
      )
      .then((c) => {
        controls = c
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message || 'Impossibile accedere alla fotocamera')
      })

    return () => {
      cancelled = true
      controls?.stop()
    }
  }, [onResult])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-medium">Inquadra il codice a barre / QR</span>
        <button onClick={onClose} className="rounded-full bg-white/10 px-3 py-1 text-sm">
          Chiudi
        </button>
      </div>
      <div className="relative flex-1">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        <div className="pointer-events-none absolute inset-x-8 inset-y-1/3 rounded-2xl border-2 border-white/70" />
      </div>
      {error && (
        <p className="bg-red-600 px-4 py-3 text-sm text-white">
          {error}. Verifica di aver concesso il permesso fotocamera al browser.
        </p>
      )}
    </div>
  )
}
