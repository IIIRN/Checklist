import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { PreventZoom } from '@/components/layout/PreventZoom'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'ระบบ Checklist โครงการ | Site Entry Management',
  description: 'ระบบบันทึก Checklist พนักงานและผู้รับเหมาเข้าโครงการ รองรับ PC และ Mobile',
  keywords: ['checklist', 'contractor', 'site entry', 'ผู้รับเหมา'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="th" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <PreventZoom />
        <TooltipProvider>
          {children}
          <Toaster position="top-right" richColors />
        </TooltipProvider>
      </body>
    </html>
  )
}
