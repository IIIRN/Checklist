'use client'

import { useEffect } from 'react'

export function PreventZoom() {
  useEffect(() => {
    // 1. ป้องกัน Safari iOS Gesture Zoom (Pinch-to-zoom)
    const handleGesture = (e: Event) => {
      e.preventDefault()
    }
    document.addEventListener('gesturestart', handleGesture)
    document.addEventListener('gesturechange', handleGesture)
    document.addEventListener('gestureend', handleGesture)

    // 2. ป้องกัน Double-Tap to Zoom บนหน้าจอมือถือ
    let lastTouchEnd = 0
    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now()
      if (now - lastTouchEnd <= 300) {
        const target = e.target as HTMLElement
        // ยอมให้กด Input, Textarea, Select, Button, Link ได้ปกติ
        if (target && !['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(target.tagName)) {
          e.preventDefault()
        }
      }
      lastTouchEnd = now
    }
    document.addEventListener('touchend', handleTouchEnd, { passive: false })

    return () => {
      document.removeEventListener('gesturestart', handleGesture)
      document.removeEventListener('gesturechange', handleGesture)
      document.removeEventListener('gestureend', handleGesture)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  return null
}
