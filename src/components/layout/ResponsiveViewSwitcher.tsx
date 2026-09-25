'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

/**
 * คอมโพเนนต์สำหรับตรวจจับขนาดหน้าจออัตโนมัติ
 * หากหน้าจอมีขนาดเล็กกว่า 768px (โหมดมือถือ) และผู้ใช้ไม่ได้เลือก "ดูเวอร์ชัน Desktop"
 * ระบบจะสลับไปยังโหมดมือถือ (/checklist-m) ให้อัตโนมัติทันที
 */
export function ResponsiveViewSwitcher() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkViewport = () => {
      if (typeof window === 'undefined') return

      const isMobileWidth = window.innerWidth < 768
      const preferredMode = sessionStorage.getItem('sitecheck_view_mode')

      // สลับไปหน้า Mobile อัตโนมัติเฉพาะเมื่อจอเล็ก และผู้ใช้ไม่ได้ระบุว่าต้องการดูแบบ Desktop
      if (isMobileWidth && preferredMode !== 'desktop') {
        router.replace('/checklist-m')
      }
    }

    checkViewport()
    window.addEventListener('resize', checkViewport)
    return () => window.removeEventListener('resize', checkViewport)
  }, [router, pathname])

  return null
}
