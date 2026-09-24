import type { Metadata } from 'next'
import { Noto_Sans_Thai, Sarabun } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

const notoSansThai = Noto_Sans_Thai({
  subsets: ['thai'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto',
})

const sarabun = Sarabun({
  subsets: ['thai'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sarabun',
})

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
      <body className={`${notoSansThai.variable} ${sarabun.variable} font-sans antialiased`}>
        <TooltipProvider>
          {children}
          <Toaster position="top-right" richColors />
        </TooltipProvider>
      </body>
    </html>
  )
}
