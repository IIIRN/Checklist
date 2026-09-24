import type { ChecklistEntry, Contractor, Company } from '@/lib/types'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

export interface MemberStatusDetail {
  name: string
  position?: string
  status: 'passed' | 'failed' | 'missing'
  checkInTime?: string | null
  purpose?: string | null
  alcResult?: string | null
  failReason?: string | null
}

export interface CompanySummary {
  companyName: string
  totalRegistered: number
  checkedInCount: number
  passedCount: number
  failedCount: number
  missingCount: number
  lateOrRequests: { name: string; purpose: string; checkInTime?: string | null }[]
  failedMembers: { name: string; reason: string; checkInTime?: string | null }[]
  missingMembers: string[]
  checkedInMembers: { name: string; checkInTime?: string | null }[]
  membersDetails: MemberStatusDetail[]
}

export interface DailyReportData {
  date: string
  totalRegistered: number
  totalCheckedIn: number
  totalPassed: number
  totalFailed: number
  totalMissing: number
  companies: CompanySummary[]
}

/**
 * คำนวณสรุปข้อมูล Checklist ประจำวัน แยกตามสาขา / บริษัท
 */
export function buildDailyReportData(
  dateStr: string,
  entries: ChecklistEntry[],
  contractors: Contractor[],
  companies: Company[]
): DailyReportData {
  // Map company names
  const companyMap = new Map<string, Contractor[]>()

  contractors
    .filter(c => c.employee_type !== 'employee' && c.is_active)
    .forEach(c => {
      const compName = (c.company_name || 'รับจ้างอิสระ').trim()
      if (!companyMap.has(compName)) {
        companyMap.set(compName, [])
      }
      companyMap.get(compName)!.push(c)
    })

  // Entries map for target date
  const dateEntries = entries.filter(e => e.entry_date === dateStr)

  const companySummaries: CompanySummary[] = []

  let totalRegistered = 0
  let totalCheckedIn = 0
  let totalPassed = 0
  let totalFailed = 0
  let totalMissing = 0

  Array.from(companyMap.entries()).forEach(([compName, members]) => {
    const regCount = members.length
    totalRegistered += regCount

    const checkedIn: { name: string; checkInTime?: string | null }[] = []
    const lateOrReqs: { name: string; purpose: string; checkInTime?: string | null }[] = []
    const failedList: { name: string; reason: string; checkInTime?: string | null }[] = []
    const missingList: string[] = []
    const membersDetails: MemberStatusDetail[] = []

    let passedInComp = 0
    let failedInComp = 0

    members.forEach(m => {
      const entry = dateEntries.find(
        e => (e.contractor_id && e.contractor_id === m.id) || e.contractor_name === m.name
      )

      if (entry) {
        const timeStr = entry.check_in_time ? entry.check_in_time.substring(0, 5) : null
        checkedIn.push({ name: m.name, checkInTime: timeStr })

        // Check if has special purpose or late request
        if (entry.purpose && entry.purpose.trim()) {
          lateOrReqs.push({ name: m.name, purpose: entry.purpose.trim(), checkInTime: timeStr })
        }

        // Check if passed ALC and PPE
        const isAlcPass = entry.alc_result === '0%'
        const isPpePass =
          entry.ppe_helmet &&
          entry.ppe_vest &&
          entry.ppe_shirt &&
          entry.ppe_gloves &&
          entry.ppe_shoes

        if (isAlcPass && isPpePass) {
          passedInComp += 1
          membersDetails.push({
            name: m.name,
            position: m.position || undefined,
            status: 'passed',
            checkInTime: timeStr,
            purpose: entry.purpose || undefined,
            alcResult: entry.alc_result,
          })
        } else {
          failedInComp += 1
          const reasons: string[] = []
          if (!isAlcPass) reasons.push(`ALC ${entry.alc_result}`)
          if (!isPpePass) {
            const missingPpe: string[] = []
            if (!entry.ppe_helmet) missingPpe.push('หมวก')
            if (!entry.ppe_vest) missingPpe.push('กั๊ก')
            if (!entry.ppe_shirt) missingPpe.push('เสื้อ')
            if (!entry.ppe_gloves) missingPpe.push('ถุงมือ')
            if (!entry.ppe_shoes) missingPpe.push('รองเท้า')
            reasons.push(`ขาด ${missingPpe.join('/')}`)
          }
          const failReason = reasons.join(', ')
          failedList.push({ name: m.name, reason: failReason, checkInTime: timeStr })
          membersDetails.push({
            name: m.name,
            position: m.position || undefined,
            status: 'failed',
            checkInTime: timeStr,
            purpose: entry.purpose || undefined,
            alcResult: entry.alc_result,
            failReason,
          })
        }
      } else {
        missingList.push(m.name)
        membersDetails.push({
          name: m.name,
          position: m.position || undefined,
          status: 'missing',
        })
      }
    })

    const checkedCount = checkedIn.length
    const missingCount = regCount - checkedCount

    totalCheckedIn += checkedCount
    totalPassed += passedInComp
    totalFailed += failedInComp
    totalMissing += missingCount

    companySummaries.push({
      companyName: compName,
      totalRegistered: regCount,
      checkedInCount: checkedCount,
      passedCount: passedInComp,
      failedCount: failedInComp,
      missingCount: missingCount,
      lateOrRequests: lateOrReqs,
      failedMembers: failedList,
      missingMembers: missingList,
      checkedInMembers: checkedIn,
      membersDetails,
    })
  })

  return {
    date: dateStr,
    totalRegistered,
    totalCheckedIn,
    totalPassed,
    totalFailed,
    totalMissing,
    companies: companySummaries.sort((a, b) => b.checkedInCount - a.checkedInCount),
  }
}

/**
 * สร้างข้อความแจ้งเตือนสรุปประจำวัน (LINE Text Message)
 */
export function formatDailyLineMessage(report: DailyReportData): string {
  let dText = report.date
  try {
    dText = format(new Date(report.date), 'EEEEที่ d MMMM yyyy', { locale: th })
  } catch {}

  const lines: string[] = []

  lines.push(`📋 [สรุปผล Checklist ประจำวัน]`)
  lines.push(`📅 วัน${dText}`)
  lines.push(`────────────────`)
  lines.push(`📊 ภาพรวมทั้งโครงการ:`)
  lines.push(`• เข้างานแล้ว: ${report.totalCheckedIn} / ${report.totalRegistered} คน`)
  lines.push(`• ผ่านเกณฑ์ 100%: ${report.totalPassed} คน`)
  if (report.totalFailed > 0) {
    lines.push(`• ❌ ไม่ผ่านเกณฑ์: ${report.totalFailed} คน`)
  }
  if (report.totalMissing > 0) {
    lines.push(`• ⚠️ ขาด/ยังไม่ตรวจ: ${report.totalMissing} คน`)
  }
  lines.push(`────────────────`)

  report.companies.forEach(comp => {
    lines.push(`🏢 บริษัท/สาขา: ${comp.companyName} (${comp.totalRegistered} คน)`)
    lines.push(`  • เข้างาน: ${comp.checkedInCount} คน | ขาด: ${comp.missingCount} คน`)
    lines.push(`  • ผ่าน: ${comp.passedCount} คน | ไม่ผ่าน: ${comp.failedCount} คน`)

    comp.membersDetails.forEach(m => {
      if (m.status === 'passed') {
        const t = m.checkInTime ? ` (เข้า ${m.checkInTime} น.)` : ''
        lines.push(`    - ${m.name}${t}: ✅ ผ่าน`)
      } else if (m.status === 'failed') {
        const t = m.checkInTime ? ` (เข้า ${m.checkInTime} น.)` : ''
        lines.push(`    - ${m.name}${t}: ❌ ไม่ผ่าน [${m.failReason || 'ไม่ผ่านเกณฑ์'}]`)
      } else {
        lines.push(`    - ${m.name}: ⚠️ ขาด/ยังไม่เข้างาน`)
      }
    })

    if (comp.lateOrRequests.length > 0) {
      const reqDetails = comp.lateOrRequests.map(r => `${r.name} (${r.purpose})`).join(', ')
      lines.push(`  📌 หมายเหตุ/แจ้งเวลา: [${reqDetails}]`)
    }

    lines.push(``)
  })

  lines.push(`🕒 รายงานเมื่อ: ${format(new Date(), 'HH:mm น.')}`)
  lines.push(`🛡️ ระบบ SiteCheck PRO`)

  return lines.join('\n')
}

/**
 * สร้าง LINE Flex Message แยก Bubble แต่ละสาขา / บริษัท (Carousel)
 */
export function buildDailyLineFlexMessage(report: DailyReportData): any {
  let dText = report.date
  try {
    dText = format(new Date(report.date), 'd MMM yyyy', { locale: th })
  } catch {}

  const currentTime = format(new Date(), 'HH:mm น.')

  // 1. Bubble ภาพรวม (Overview Bubble)
  const overviewBubble = {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#0f172a',
      paddingAll: '16px',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '🛡️ SITECHECK SUMMARY',
              weight: 'bold',
              color: '#38bdf8',
              size: 'xs',
              flex: 1,
            },
            {
              type: 'text',
              text: dText,
              color: '#94a3b8',
              size: 'xs',
              align: 'end',
            },
          ],
        },
        {
          type: 'text',
          text: 'สรุปการเข้างานประจำวัน',
          weight: 'bold',
          color: '#ffffff',
          size: 'lg',
          margin: 'xs',
        },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '16px',
      spacing: 'md',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          spacing: 'md',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              backgroundColor: '#f0fdf4',
              cornerRadius: '8px',
              paddingAll: '10px',
              flex: 1,
              contents: [
                { type: 'text', text: 'เข้างานแล้ว', size: 'xxs', color: '#166534' },
                {
                  type: 'text',
                  text: `${report.totalCheckedIn} / ${report.totalRegistered}`,
                  weight: 'bold',
                  size: 'lg',
                  color: '#15803d',
                },
                { type: 'text', text: 'คน', size: 'xxs', color: '#166534' },
              ],
            },
            {
              type: 'box',
              layout: 'vertical',
              backgroundColor: report.totalFailed > 0 ? '#fef2f2' : '#f8fafc',
              cornerRadius: '8px',
              paddingAll: '10px',
              flex: 1,
              contents: [
                {
                  type: 'text',
                  text: 'ไม่ผ่านเกณฑ์',
                  size: 'xxs',
                  color: report.totalFailed > 0 ? '#991b1b' : '#64748b',
                },
                {
                  type: 'text',
                  text: `${report.totalFailed}`,
                  weight: 'bold',
                  size: 'lg',
                  color: report.totalFailed > 0 ? '#dc2626' : '#334155',
                },
                {
                  type: 'text',
                  text: 'คน',
                  size: 'xxs',
                  color: report.totalFailed > 0 ? '#991b1b' : '#64748b',
                },
              ],
            },
            {
              type: 'box',
              layout: 'vertical',
              backgroundColor: report.totalMissing > 0 ? '#fffbeb' : '#f8fafc',
              cornerRadius: '8px',
              paddingAll: '10px',
              flex: 1,
              contents: [
                {
                  type: 'text',
                  text: 'ขาด / ไม่มา',
                  size: 'xxs',
                  color: report.totalMissing > 0 ? '#92400e' : '#64748b',
                },
                {
                  type: 'text',
                  text: `${report.totalMissing}`,
                  weight: 'bold',
                  size: 'lg',
                  color: report.totalMissing > 0 ? '#d97706' : '#334155',
                },
                {
                  type: 'text',
                  text: 'คน',
                  size: 'xxs',
                  color: report.totalMissing > 0 ? '#92400e' : '#64748b',
                },
              ],
            },
          ],
        },
        {
          type: 'box',
          layout: 'vertical',
          margin: 'sm',
          contents: [
            {
              type: 'text',
              text: `🏢 รวมทั้งหมด ${report.companies.length} บริษัท/สาขา`,
              size: 'xs',
              color: '#475569',
              weight: 'bold',
            },
            {
              type: 'text',
              text: '👉 เลื่อนดูสรุปแยกแต่ละสาขาด้านขวา',
              size: 'xxs',
              color: '#0284c7',
              margin: 'xs',
            },
          ],
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '12px',
      backgroundColor: '#f8fafc',
      contents: [
        {
          type: 'text',
          text: `อัปเดตข้อมูล: ${currentTime}`,
          size: 'xxs',
          color: '#94a3b8',
          align: 'center',
        },
      ],
    },
  }

  // 2. Bubble แยกแต่ละบริษัท / สาขา
  const companyBubbles = report.companies.slice(0, 11).map(comp => {
    // Header style depending on pass/fail
    let headerBg = '#1e293b'
    let badgeBg = '#334155'
    let statusText = 'ปกติ'

    if (comp.failedCount > 0) {
      headerBg = '#991b1b' // Red tone
      badgeBg = '#dc2626'
      statusText = `ไม่ผ่าน ${comp.failedCount} คน`
    } else if (comp.missingCount > 0) {
      headerBg = '#0369a1' // Blue/Sky tone
      badgeBg = '#0284c7'
      statusText = `ขาด ${comp.missingCount} คน`
    } else if (comp.checkedInCount === comp.totalRegistered && comp.totalRegistered > 0) {
      headerBg = '#15803d' // Green tone
      badgeBg = '#16a34a'
      statusText = 'มาครบ 100%'
    }

    // List of contractor items inside bubble
    const memberRows: any[] = comp.membersDetails.slice(0, 8).map(m => {
      let iconColor = '#16a34a'
      let statusLabel = '✅ ผ่าน'
      let subInfo = m.checkInTime ? `เข้า ${m.checkInTime} น.` : ''

      if (m.status === 'failed') {
        iconColor = '#dc2626'
        statusLabel = `❌ ${m.failReason || 'ไม่ผ่าน'}`
      } else if (m.status === 'missing') {
        iconColor = '#f59e0b'
        statusLabel = '⚠️ ขาด/ไม่มา'
        subInfo = ''
      }

      return {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        margin: 'xs',
        contents: [
          {
            type: 'text',
            text: m.name,
            size: 'xs',
            color: '#1e293b',
            weight: 'bold',
            flex: 4,
            wrap: true,
          },
          {
            type: 'box',
            layout: 'vertical',
            flex: 5,
            contents: [
              {
                type: 'text',
                text: statusLabel,
                size: 'xxs',
                color: iconColor,
                weight: 'bold',
                wrap: true,
              },
              ...(subInfo
                ? [
                    {
                      type: 'text',
                      text: subInfo,
                      size: 'xxs',
                      color: '#64748b',
                    },
                  ]
                : []),
            ],
          },
        ],
      }
    })

    if (comp.membersDetails.length > 8) {
      memberRows.push({
        type: 'text',
        text: `...และอีก ${comp.membersDetails.length - 8} คน`,
        size: 'xxs',
        color: '#64748b',
        align: 'center',
        margin: 'xs',
      })
    }

    // Late/notes if any
    const notesContents: any[] = []
    if (comp.lateOrRequests.length > 0) {
      notesContents.push({
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#fefce8',
        paddingAll: '8px',
        cornerRadius: '6px',
        margin: 'sm',
        contents: [
          {
            type: 'text',
            text: `⏰ แจ้งเวลา/หมายเหตุ (${comp.lateOrRequests.length} คน):`,
            size: 'xxs',
            color: '#854d0e',
            weight: 'bold',
          },
          ...comp.lateOrRequests.slice(0, 3).map(r => ({
            type: 'text',
            text: `• ${r.name}: ${r.purpose}${r.checkInTime ? ` (${r.checkInTime} น.)` : ''}`,
            size: 'xxs',
            color: '#713f12',
            wrap: true,
          })),
        ],
      })
    }

    return {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: headerBg,
        paddingAll: '14px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: '🏢 บริษัท / สาขา',
                color: '#e2e8f0',
                size: 'xxs',
                flex: 1,
              },
              {
                type: 'text',
                text: statusText,
                color: '#ffffff',
                size: 'xxs',
                weight: 'bold',
                align: 'end',
              },
            ],
          },
          {
            type: 'text',
            text: comp.companyName,
            weight: 'bold',
            color: '#ffffff',
            size: 'md',
            wrap: true,
            margin: 'xs',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '14px',
        contents: [
          // Stat chips
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'xs',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#f1f5f9',
                paddingAll: '6px',
                cornerRadius: '4px',
                flex: 1,
                alignItems: 'center',
                contents: [
                  { type: 'text', text: 'ทั้งหมด', size: 'xxs', color: '#64748b' },
                  { type: 'text', text: `${comp.totalRegistered}`, weight: 'bold', size: 'xs', color: '#0f172a' },
                ],
              },
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#f0fdf4',
                paddingAll: '6px',
                cornerRadius: '4px',
                flex: 1,
                alignItems: 'center',
                contents: [
                  { type: 'text', text: 'เข้างาน', size: 'xxs', color: '#166534' },
                  { type: 'text', text: `${comp.checkedInCount}`, weight: 'bold', size: 'xs', color: '#15803d' },
                ],
              },
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: comp.failedCount > 0 ? '#fef2f2' : '#f8fafc',
                paddingAll: '6px',
                cornerRadius: '4px',
                flex: 1,
                alignItems: 'center',
                contents: [
                  { type: 'text', text: 'ไม่ผ่าน', size: 'xxs', color: comp.failedCount > 0 ? '#991b1b' : '#64748b' },
                  { type: 'text', text: `${comp.failedCount}`, weight: 'bold', size: 'xs', color: comp.failedCount > 0 ? '#dc2626' : '#334155' },
                ],
              },
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: comp.missingCount > 0 ? '#fffbeb' : '#f8fafc',
                paddingAll: '6px',
                cornerRadius: '4px',
                flex: 1,
                alignItems: 'center',
                contents: [
                  { type: 'text', text: 'ขาด', size: 'xxs', color: comp.missingCount > 0 ? '#92400e' : '#64748b' },
                  { type: 'text', text: `${comp.missingCount}`, weight: 'bold', size: 'xs', color: comp.missingCount > 0 ? '#d97706' : '#334155' },
                ],
              },
            ],
          },
          {
            type: 'separator',
            margin: 'md',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'sm',
            contents: memberRows,
          },
          ...notesContents,
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '10px',
        backgroundColor: '#f8fafc',
        contents: [
          {
            type: 'text',
            text: `วันที่ ${dText} • ${currentTime}`,
            size: 'xxs',
            color: '#94a3b8',
            align: 'center',
          },
        ],
      },
    }
  })

  return {
    type: 'flex',
    altText: `📋 สรุปรายการเช็คชื่อประจำวัน (${dText})`,
    contents: {
      type: 'carousel',
      contents: [overviewBubble, ...companyBubbles],
    },
  }
}
