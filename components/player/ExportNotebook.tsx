'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface ExportNotebookProps {
  courseTitle: string
  notebookId: string
}

export function ExportNotebook({ courseTitle, notebookId }: ExportNotebookProps) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const { jsPDF } = await import('jspdf')
      const html2canvas = (await import('html2canvas')).default

      const element = document.getElementById(notebookId)
      if (!element) return

      const canvas = await html2canvas(element, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/png')

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      pdf.setFontSize(16)
      pdf.text(`Caderno — ${courseTitle}`, 10, 15)
      pdf.addImage(imgData, 'PNG', 10, 25, pdfWidth - 20, pdfHeight)
      pdf.save(`caderno-${courseTitle.toLowerCase().replace(/\s+/g, '-')}.pdf`)
    } catch (err) {
      console.error('Erro ao exportar PDF:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={loading} className="gap-1.5">
      <Download className="h-3.5 w-3.5" />
      {loading ? 'Gerando...' : 'Exportar PDF'}
    </Button>
  )
}
