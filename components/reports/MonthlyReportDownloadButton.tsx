"use client"

import { useState } from 'react'
import { FileDown } from 'lucide-react'
import type { MonthlyReportData } from '@/lib/utils/pdf-document'

interface Props {
  data: MonthlyReportData
}

export default function MonthlyReportDownloadButton({ data }: Props) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const { MonthlyReportPDF } = await import('@/lib/utils/pdf-document')
      const blob = await pdf(<MonthlyReportPDF data={data} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Monthly-Report-${data.period.replace(/\s+/g, '-')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF generation failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-700 hover:bg-purple-800 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl transition-colors shadow-sm"
      title="Download PDF report"
    >
      <FileDown className="w-4 h-4" />
      {loading ? 'Generating…' : 'Export PDF'}
    </button>
  )
}
