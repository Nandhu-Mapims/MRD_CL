import React, { useState } from 'react'
import { apiClient } from '../../api/client'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

export function PatientReport() {
  const [uhid, setUhid] = useState('')
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [error, setError] = useState('')
  const [consultantName, setConsultantName] = useState('')
  const [ward, setWard] = useState('')
  const [unitNo, setUnitNo] = useState('')

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!uhid.trim()) {
      setError('Please enter a UHID')
      return
    }

    setLoading(true)
    setError('')
    setReportData(null)

    try {
      // Use the new patient checklists endpoint for multi-department view
      const data = await apiClient.get(`/audits/patient-checklists?uhid=${uhid.trim().toUpperCase()}`)
      
      // Auto-populate ward and unitNo from patient data
      if (data.patient?.ward && !ward.trim()) {
        setWard(data.patient.ward)
      }
      if (data.patient?.unitNo && !unitNo.trim()) {
        setUnitNo(data.patient.unitNo)
      }

      // Transform data to match existing report structure
      const transformedData = {
        patient: data.patient,
        departments: data.checklists.map(checklist => ({
          department: checklist.department,
          form: checklist.form,
          submittedBy: checklist.submittedBy,
          submittedAt: checklist.submittedAt,
          sections: (() => {
            // Group items by section
            const sections = {}
            checklist.items.forEach(({ item, submission }) => {
              const sectionName = item.section || 'Other'
              if (!sections[sectionName]) {
                sections[sectionName] = []
              }
              sections[sectionName].push({
                checklistItemId: {
                  _id: item._id,
                  label: item.label,
                  section: item.section,
                  order: item.order,
                },
                ...(submission || {}),
              })
            })
            return Object.keys(sections).sort().map(sectionName => ({
              sectionName,
              items: sections[sectionName].sort((a, b) => 
                (a.checklistItemId?.order || 0) - (b.checklistItemId?.order || 0)
              ),
            }))
          })(),
        })),
        totalSubmissions: data.checklists.reduce((sum, c) => sum + c.items.filter(i => i.submission).length, 0),
      }
      
      // Auto-populate consultant name from first available submitter
      if (transformedData.departments.length > 0) {
        const firstSubmittedDept = transformedData.departments.find(d => d.submittedBy?.name)
        if (firstSubmittedDept?.submittedBy?.name && !consultantName.trim()) {
          setConsultantName(firstSubmittedDept.submittedBy.name)
        }
      }
      
      setReportData(transformedData)
      setError('')
    } catch (err) {
      console.error('Error fetching patient report:', err)
      setReportData(null)
      
      // Handle authentication errors specifically
      if (err.response?.status === 401) {
        const errorMessage = err.response?.data?.message || 'Your session has expired. Please log in again.'
        setError(`${errorMessage} Please click the logout button and log in again.`)
        // Don't redirect automatically - let user see the error and decide
        return
      }
      
      // Try fallback to old endpoint if new one fails
      if (err.response?.status === 404 || err.message?.includes('Cannot GET')) {
        try {
          console.log('Trying fallback endpoint...')
          const fallbackData = await apiClient.get(`/audits/uhid/${uhid.trim().toUpperCase()}`)
          setReportData(fallbackData)
          setError('')
        } catch (fallbackErr) {
          const errorMessage = fallbackErr.response?.data?.message || 
                              fallbackErr.message || 
                              'Failed to fetch patient report. Please check your connection and try again.'
          setError(errorMessage)
        }
      } else {
        const errorMessage = err.response?.data?.message || 
                            err.message || 
                            'Failed to fetch patient report. Please check your connection and try again.'
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleExportPDF = () => {
    if (!reportData) return

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    // Header matching template
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('MAPIMS - CASECHEET AUDIT CHECKLIST', 105, 15, { align: 'center' })
    
    doc.setFontSize(8)
    doc.setFont(undefined, 'normal')
    doc.text('DOCUMENT ID: CS/OG MAPIMS/01', 20, 22)
    doc.text('DOCUMENT CATEGORY: CHECKLIST', 20, 26)
    doc.text('DOCUMENT: 1', 100, 22)
    doc.text('VERSION:', 100, 26)
    doc.text('ISSUES DATE:', 150, 22)

    // Consultant, Ward, Unit fields
    let yPos = 32
    doc.setFontSize(9)
    doc.text('CONSULTANT NAME:', 20, yPos)
    doc.text(consultantName || '_______________________', 60, yPos)
    doc.text('WARD:', 130, yPos)
    doc.text(ward || '___________', 145, yPos)
    doc.text('UNIT NO:', 170, yPos)
    doc.text(unitNo || '____', 185, yPos)

    yPos = 40

    // Patient Information
    doc.setFontSize(10)
    doc.setFont(undefined, 'bold')
    doc.text('PATIENT INFORMATION', 20, yPos)
    yPos += 5
    doc.setFont(undefined, 'normal')
    doc.setFontSize(9)
    doc.text(`UHID: ${reportData.patient.uhid}`, 20, yPos)
    doc.text(`Patient Name: ${reportData.patient.patientName}`, 100, yPos)
    yPos += 8

    // Main table header
    doc.setFontSize(8)
    doc.setFont(undefined, 'bold')
    doc.setFillColor(240, 240, 240)
    doc.rect(20, yPos, 170, 6, 'F')
    
    // Table headers
    doc.text('STANDARD & OBJECTIVE ELEMENTS', 22, yPos + 4)
    doc.text('Yes', 120, yPos + 4)
    doc.text('No', 135, yPos + 4)
    doc.text('COMPLIANCE', 145, yPos + 2)
    doc.text('Remarks (NA)', 145, yPos + 4.5)
    doc.text('Responsibility', 165, yPos + 4)

    yPos += 7

    // Department-wise checklist
    reportData.departments.forEach((deptData) => {
      // Check page break
      if (yPos > 270) {
        doc.addPage()
        yPos = 20
      }

      // Department header
      doc.setFontSize(10)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text(`${deptData.department.name} (${deptData.department.code})`, 20, yPos)
      yPos += 5

      // Sections
      deptData.sections.forEach((section) => {
        if (yPos > 270) {
          doc.addPage()
          yPos = 20
        }

        // Section name
        doc.setFontSize(9)
        doc.setFont(undefined, 'bold')
        doc.text(section.sectionName, 22, yPos)
        yPos += 4

        // Checklist items
        section.items.forEach((item, idx) => {
          if (yPos > 270) {
            doc.addPage()
            yPos = 20
          }

          const label = item.checklistItemId?.label || 'N/A'
          const responseValue = item.responseValue || item.yesNoNa || ''
          const isYes = responseValue === 'YES' || responseValue === 'Yes'
          const isNo = responseValue === 'NO' || responseValue === 'No'
          const remarks = item.remarks || ''
          const responsibility = item.responsibility || ''

          // Item label
          doc.setFontSize(8)
          doc.setFont(undefined, 'normal')
          doc.text(`${idx + 1}. ${label}`, 22, yPos)

          // Yes checkbox
          doc.rect(120, yPos - 3, 3, 3, isYes ? 'F' : 'S')
          if (isYes) {
            doc.setFontSize(6)
            doc.text('✓', 120.5, yPos - 1.5)
          }

          // No checkbox
          doc.rect(135, yPos - 3, 3, 3, isNo ? 'F' : 'S')
          if (isNo) {
            doc.setFontSize(6)
            doc.text('✓', 135.5, yPos - 1.5)
          }

          // Remarks
          doc.setFontSize(7)
          const remarksLines = doc.splitTextToSize(remarks || '-', 20)
          doc.text(remarksLines[0] || '-', 145, yPos)

          // Responsibility
          doc.text(responsibility || '-', 165, yPos)

          yPos += 5
        })

        yPos += 2
      })

      yPos += 3
    })

    // Remarks & Observation section
    if (yPos > 250) {
      doc.addPage()
      yPos = 20
    }

    doc.setFontSize(10)
    doc.setFont(undefined, 'bold')
    doc.text('REMARKS & OBSERVATION', 20, yPos)
    yPos += 5

    doc.setFontSize(8)
    doc.setFont(undefined, 'normal')
    doc.text('S.NO', 20, yPos)
    doc.text('REMARKS', 50, yPos)
    
    // Draw table for remarks
    for (let i = 0; i < 5; i++) {
      yPos += 5
      doc.rect(20, yPos - 4, 170, 4, 'S')
      doc.text(`${i + 1}`, 22, yPos - 1.5)
    }

    yPos += 8

    // Name & Signature of Audit Members
    if (yPos > 250) {
      doc.addPage()
      yPos = 20
    }

    doc.setFontSize(10)
    doc.setFont(undefined, 'bold')
    doc.text('NAME & SIGNATURE OF AUDIT MEMBERS', 20, yPos)
    yPos += 5

    // Table header
    doc.setFontSize(8)
    doc.setFont(undefined, 'bold')
    doc.setFillColor(240, 240, 240)
    doc.rect(20, yPos, 170, 5, 'F')
    doc.text('S.NO', 22, yPos + 3)
    doc.text('NAME', 40, yPos + 3)
    doc.text('DEPARTMENT', 80, yPos + 3)
    doc.text('DESIGINATION', 130, yPos + 3)
    doc.text('SIGNATURE', 165, yPos + 3)

    yPos += 6

    // Signature rows
    for (let i = 0; i < 4; i++) {
      doc.rect(20, yPos, 170, 8, 'S')
      doc.setFont(undefined, 'normal')
      doc.text(`${i + 1}`, 22, yPos + 4)
      yPos += 8
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(7)
      doc.setTextColor(128, 128, 128)
      doc.text(
        `Page ${i} of ${pageCount} | Generated: ${new Date().toLocaleString('en-GB')}`,
        105,
        285,
        { align: 'center' }
      )
    }

    doc.save(`Patient_Report_${reportData.patient.uhid}_${Date.now()}.pdf`)
  }

  return (
    <>
      {/* Enhanced Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm 15mm;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          body {
            margin: 0;
            padding: 0;
            background: white;
            font-size: 10pt;
          }
          
          .no-print {
            display: none !important;
            visibility: hidden !important;
          }
          
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          
          .print-page {
            page-break-after: auto;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          /* Ensure tables are visible and properly formatted */
          table {
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
            border-spacing: 0 !important;
            page-break-inside: auto;
            display: table !important;
            visibility: visible !important;
          }
          
          table thead {
            display: table-header-group !important;
            visibility: visible !important;
          }
          
          table tbody {
            display: table-row-group !important;
            visibility: visible !important;
          }
          
          table tr {
            page-break-inside: avoid;
            page-break-after: auto;
            break-inside: avoid;
            display: table-row !important;
            visibility: visible !important;
          }
          
          table td,
          table th {
            display: table-cell !important;
            visibility: visible !important;
            border: 1.5px solid #1e293b !important;
            padding: 4px 6px !important;
            vertical-align: top;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          
          /* Prevent section headers from breaking */
          .section-header {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          
          .section-header td {
            background-color: #f1f5f9 !important;
            font-weight: 600 !important;
          }
          
          .dept-header {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          
          .dept-header td {
            background-color: #dbeafe !important;
            font-weight: bold !important;
          }
          
          /* Ensure table headers repeat on each page */
          thead {
            display: table-header-group !important;
          }
          
          tfoot {
            display: table-footer-group !important;
          }
          
          /* Fix checkbox visibility */
          .checkbox-cell {
            visibility: visible !important;
            border: 2px solid #1e293b !important;
          }
          
          /* Ensure all text is visible */
          * {
            color: #000 !important;
            background-color: transparent !important;
          }
          
          tr:nth-child(even) {
            background-color: #f8fafc !important;
          }
          
          tr:nth-child(odd) {
            background-color: #ffffff !important;
          }
          
          /* Page breaks */
          .page-break {
            page-break-before: always;
            break-before: page;
          }
          
          /* Ensure no overflow */
          * {
            overflow: visible !important;
          }
        }
        
        @media screen {
          .print-container {
            max-width: 210mm;
            margin: 0 auto;
          }
        }
      `}</style>

      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border-l-4 border-blue-600 no-print">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 mb-2">
            Patient Report Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Enter UHID to view complete checklist report matching MAPIMS template
          </p>
        </div>

      {/* Search Form */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 no-print">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                Enter UHID
              </label>
              <input
                type="text"
                value={uhid}
                onChange={(e) => setUhid(e.target.value.toUpperCase())}
                placeholder="Enter UHID (e.g., 234567)"
                className="w-full border-2 border-slate-300 rounded-lg px-4 py-2.5 sm:py-3 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed transform hover:scale-[1.02] text-sm sm:text-base"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {/* Additional Fields */}
          {reportData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Consultant Name
                </label>
                <input
                  type="text"
                  value={consultantName}
                  onChange={(e) => setConsultantName(e.target.value)}
                  placeholder="Enter consultant name"
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Ward
                </label>
                <div className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-slate-50 text-slate-600">
                  {ward || reportData?.patient?.ward || 'Not provided'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Unit No
                </label>
                <div className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-slate-50 text-slate-600">
                  {unitNo || reportData?.patient?.unitNo || 'Not provided'}
                </div>
              </div>
            </div>
          )}
        </form>

        {error && (
          <div className={`mt-4 p-4 rounded-lg text-sm border-2 ${
            error.includes('not found') || error.includes('no audit submissions')
              ? 'bg-yellow-50 border-yellow-300 text-yellow-800'
              : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0">
                {error.includes('not found') || error.includes('no audit submissions') ? 'ℹ️' : '⚠️'}
              </span>
              <div>
                <p className="font-semibold mb-1">
                  {error.includes('not found') ? 'Patient Not Found' : 
                   error.includes('no audit submissions') ? 'No Submissions Available' : 
                   'Error'}
                </p>
                <p>{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Report Display - Matching Template Format */}
      {reportData && reportData.totalSubmissions > 0 && (
        <div className="space-y-4 sm:space-y-6">
          {/* Action Buttons */}
          <div className="bg-white rounded-lg shadow-md p-4 flex flex-wrap gap-3 justify-end no-print">
            <button
              onClick={handleExportPDF}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-6 py-2.5 rounded-lg shadow-lg transition-all transform hover:scale-[1.02] text-sm sm:text-base"
            >
              📄 Export to PDF
            </button>
            <button
              onClick={() => window.print()}
              className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-semibold px-6 py-2.5 rounded-lg shadow-lg transition-all transform hover:scale-[1.02] text-sm sm:text-base"
            >
              🖨️ Print
            </button>
          </div>

          {/* A4 Printable Report - Template Format */}
          <div className="bg-white shadow-lg rounded-lg overflow-visible print-container">
            <div
              className="p-6 sm:p-8 md:p-10 print:p-8 print-page"
              style={{
                width: '210mm',
                minHeight: '297mm',
                margin: '0 auto',
                backgroundColor: 'white',
                overflow: 'visible',
              }}
            >
              {/* Header matching template */}
              <div className="text-center mb-4 print:mb-3 border-b-2 border-slate-800 pb-3 print:pb-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 mb-1 print:text-lg">
                  MAPIMS - CASECHEET AUDIT CHECKLIST
                </h1>
                <div className="text-xs print:text-[10px] text-slate-700 grid grid-cols-3 gap-2 mt-2">
                  <div className="text-left">
                    <div>DOCUMENT ID: CS/OG MAPIMS/01</div>
                    <div>DOCUMENT CATEGORY: CHECKLIST</div>
                  </div>
                  <div className="text-center">
                    <div>DOCUMENT: 1</div>
                    <div>VERSION:</div>
                  </div>
                  <div className="text-right">
                    <div>ISSUES DATE:</div>
                  </div>
                </div>
              </div>

              {/* Consultant, Ward, Unit fields */}
              <div className="mb-4 print:mb-3 text-xs print:text-[10px] grid grid-cols-3 gap-4">
                <div>
                  <span className="font-semibold">CONSULTANT NAME:</span>{' '}
                  <span className="border-b border-slate-400 inline-block min-w-[150px]">
                    {consultantName || (reportData?.departments?.[0]?.submittedBy?.name || '_______________________')}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">WARD:</span>{' '}
                  <span className="border-b border-slate-400 inline-block min-w-[80px]">
                    {ward || reportData?.patient?.ward || '___________'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">UNIT NO:</span>{' '}
                  <span className="border-b border-slate-400 inline-block min-w-[60px]">
                    {unitNo || reportData?.patient?.unitNo || '____'}
                  </span>
                </div>
              </div>

              {/* Patient Information */}
              <div className="mb-4 print:mb-3 p-3 print:p-2 bg-slate-50 border border-slate-300 rounded">
                <div className="text-sm print:text-xs font-semibold mb-2">PATIENT INFORMATION</div>
                <div className="text-xs print:text-[10px] grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-semibold">UHID:</span>{' '}
                    <span className="font-medium">{reportData.patient.uhid}</span>
                  </div>
                  <div><span className="font-semibold">Patient Name:</span> {reportData.patient.patientName}</div>
                </div>
              </div>

              {/* Main Table Header */}
              <div className="mb-2 print:mb-1 overflow-x-auto">
                <table 
                  className="w-full text-xs print:text-[9px] border-collapse" 
                  style={{ 
                    border: '1.5px solid #1e293b',
                    tableLayout: 'fixed',
                    width: '100%',
                  }}
                >
                  <thead style={{ display: 'table-header-group' }}>
                    <tr className="bg-slate-200" style={{ backgroundColor: '#e2e8f0', display: 'table-row' }}>
                      <th className="border border-slate-800 px-2 py-2.5 print:px-1.5 print:py-2 text-left font-bold align-top" style={{ width: '45%', border: '1.5px solid #1e293b', verticalAlign: 'middle', display: 'table-cell' }}>
                        STANDARD & OBJECTIVE ELEMENTS
                      </th>
                      <th className="border border-slate-800 px-1 py-2.5 print:px-0.5 print:py-2 text-center font-bold" style={{ width: '6%', border: '1.5px solid #1e293b', verticalAlign: 'middle', display: 'table-cell' }}>
                        Yes
                      </th>
                      <th className="border border-slate-800 px-1 py-2.5 print:px-0.5 print:py-2 text-center font-bold" style={{ width: '6%', border: '1.5px solid #1e293b', verticalAlign: 'middle', display: 'table-cell' }}>
                        No
                      </th>
                      <th className="border border-slate-800 px-2 py-2.5 print:px-1.5 print:py-2 text-center font-bold align-top" style={{ width: '20%', border: '1.5px solid #1e293b', verticalAlign: 'middle', display: 'table-cell' }}>
                        COMPLIANCE<br />Remarks (NA)
                      </th>
                      <th className="border border-slate-800 px-2 py-2.5 print:px-1.5 print:py-2 text-center font-bold" style={{ width: '23%', border: '1.5px solid #1e293b', verticalAlign: 'middle', display: 'table-cell' }}>
                        Responsibility
                      </th>
                    </tr>
                  </thead>
                  <tbody style={{ display: 'table-row-group' }}>
                    {/* Department-wise Sections */}
                    {reportData.departments.map((deptData, deptIndex) => (
                      <React.Fragment key={deptIndex}>
                        {/* Department Header Row */}
                        <tr 
                          className="dept-header" 
                          style={{ 
                            backgroundColor: '#dbeafe', 
                            pageBreakAfter: 'avoid',
                            breakAfter: 'avoid',
                            display: 'table-row',
                          }}
                        >
                          <td 
                            colSpan="5" 
                            className="border border-slate-800 px-2 py-2.5 print:px-1.5 print:py-2 font-bold text-sm print:text-xs" 
                            style={{ 
                              border: '1.5px solid #1e293b', 
                              fontWeight: 'bold',
                              backgroundColor: '#dbeafe',
                              display: 'table-cell',
                            }}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                              <div>
                                <span className="font-bold">
                                  {deptData.department.name} ({deptData.department.code})
                                </span>
                                {deptData.form?.name && (
                                  <span className="text-xs print:text-[9px] font-normal text-slate-600 ml-2">
                                    - {deptData.form.name}
                                  </span>
                                )}
                              </div>
                              {deptData.submittedBy && deptData.submittedAt && (
                                <div className="text-xs print:text-[9px] font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                                  <span className="font-bold">Submitted by:</span> {deptData.submittedBy.name} | <span className="font-bold">Date:</span> {new Date(deptData.submittedAt).toLocaleString('en-GB', { 
                                    year: 'numeric', 
                                    month: '2-digit', 
                                    day: '2-digit', 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </div>
                              )}
                              {!deptData.submittedBy && (
                                <span className="text-xs print:text-[9px] font-normal text-slate-500 italic">
                                  Not submitted yet
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Sections */}
                        {deptData.sections.map((section, sectionIndex) => (
                          <React.Fragment key={sectionIndex}>
                            {/* Section Header Row */}
                            <tr 
                              className="section-header" 
                              style={{ 
                                backgroundColor: '#f1f5f9', 
                                pageBreakAfter: 'avoid',
                                breakAfter: 'avoid',
                                display: 'table-row',
                              }}
                            >
                              <td 
                                colSpan="5" 
                                className="border border-slate-800 px-2 py-2 print:px-1.5 print:py-1.5 font-semibold text-xs print:text-[10px]" 
                                style={{ 
                                  border: '1.5px solid #1e293b', 
                                  fontWeight: '600',
                                  backgroundColor: '#f1f5f9',
                                  display: 'table-cell',
                                }}
                              >
                                {section.sectionName}
                              </td>
                            </tr>

                            {/* Checklist Items */}
                            {section.items.map((item, itemIndex) => {
                              const label = item.checklistItemId?.label || 'N/A'
                              const responseValue = item.responseValue || item.yesNoNa || ''
                              const isYes = responseValue === 'YES' || responseValue === 'Yes' || responseValue === 'yes'
                              const isNo = responseValue === 'NO' || responseValue === 'No' || responseValue === 'no'
                              const remarks = item.remarks || '-'
                              const responsibility = item.responsibility || '-'

                              return (
                                <tr 
                                  key={itemIndex} 
                                  style={{ 
                                    backgroundColor: itemIndex % 2 === 0 ? '#ffffff' : '#f8fafc',
                                    display: 'table-row',
                                    pageBreakInside: 'avoid',
                                    breakInside: 'avoid',
                                  }}
                                >
                                  <td 
                                    className="border border-slate-800 px-2 py-2.5 print:px-1.5 print:py-2 text-slate-700" 
                                    style={{ 
                                      border: '1.5px solid #1e293b', 
                                      verticalAlign: 'top', 
                                      lineHeight: '1.4',
                                      display: 'table-cell',
                                      wordWrap: 'break-word',
                                      overflowWrap: 'break-word',
                                    }}
                                  >
                                    <span style={{ fontWeight: '500' }}>{itemIndex + 1}.</span> {label}
                                  </td>
                                  <td 
                                    className="border border-slate-800 px-1 py-2.5 print:px-0.5 print:py-2 text-center checkbox-cell" 
                                    style={{ 
                                      border: '1.5px solid #1e293b', 
                                      verticalAlign: 'middle',
                                      display: 'table-cell',
                                    }}
                                  >
                                    <div 
                                      className="w-5 h-5 mx-auto border-2 border-slate-800 flex items-center justify-center print:w-4 print:h-4" 
                                      style={{ 
                                        width: '20px', 
                                        height: '20px', 
                                        border: '2px solid #1e293b', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        margin: '0 auto',
                                        backgroundColor: isYes ? '#e5e7eb' : 'white',
                                      }}
                                    >
                                      {isYes && <span className="text-xs print:text-[10px]" style={{ fontSize: '12px', fontWeight: 'bold', color: '#000' }}>✓</span>}
                                    </div>
                                  </td>
                                  <td 
                                    className="border border-slate-800 px-1 py-2.5 print:px-0.5 print:py-2 text-center checkbox-cell" 
                                    style={{ 
                                      border: '1.5px solid #1e293b', 
                                      verticalAlign: 'middle',
                                      display: 'table-cell',
                                    }}
                                  >
                                    <div 
                                      className="w-5 h-5 mx-auto border-2 border-slate-800 flex items-center justify-center print:w-4 print:h-4" 
                                      style={{ 
                                        width: '20px', 
                                        height: '20px', 
                                        border: '2px solid #1e293b', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        margin: '0 auto',
                                        backgroundColor: isNo ? '#e5e7eb' : 'white',
                                      }}
                                    >
                                      {isNo && <span className="text-xs print:text-[10px]" style={{ fontSize: '12px', fontWeight: 'bold', color: '#000' }}>✓</span>}
                                    </div>
                                  </td>
                                  <td 
                                    className="border border-slate-800 px-2 py-2.5 print:px-1.5 print:py-2 text-slate-700 text-[10px] print:text-[9px]" 
                                    style={{ 
                                      border: '1.5px solid #1e293b', 
                                      verticalAlign: 'top', 
                                      lineHeight: '1.3', 
                                      wordWrap: 'break-word',
                                      overflowWrap: 'break-word',
                                      display: 'table-cell',
                                    }}
                                  >
                                    {remarks}
                                  </td>
                                  <td 
                                    className="border border-slate-800 px-2 py-2.5 print:px-1.5 print:py-2 text-center text-slate-700 text-[10px] print:text-[9px]" 
                                    style={{ 
                                      border: '1.5px solid #1e293b', 
                                      verticalAlign: 'middle', 
                                      lineHeight: '1.3',
                                      display: 'table-cell',
                                      wordWrap: 'break-word',
                                    }}
                                  >
                                    {responsibility}
                                  </td>
                                </tr>
                              )
                            })}
                          </React.Fragment>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Remarks & Observation Section */}
              <div className="mt-6 print:mt-4 page-break-inside-avoid">
                <div className="text-sm print:text-xs font-bold mb-2" style={{ fontWeight: 'bold', marginBottom: '8px' }}>REMARKS & OBSERVATION</div>
                <table 
                  className="w-full text-xs print:text-[9px] border-collapse" 
                  style={{ 
                    border: '1.5px solid #1e293b',
                    tableLayout: 'fixed',
                    width: '100%',
                  }}
                >
                  <thead style={{ display: 'table-header-group' }}>
                    <tr className="bg-slate-200" style={{ backgroundColor: '#e2e8f0', display: 'table-row' }}>
                      <th className="border border-slate-800 px-2 py-2.5 print:px-1.5 print:py-2 text-center font-bold" style={{ width: '10%', border: '1.5px solid #1e293b', verticalAlign: 'middle', display: 'table-cell' }}>
                        S.NO
                      </th>
                      <th className="border border-slate-800 px-2 py-2.5 print:px-1.5 print:py-2 text-left font-bold" style={{ border: '1.5px solid #1e293b', verticalAlign: 'middle', display: 'table-cell' }}>
                        REMARKS
                      </th>
                    </tr>
                  </thead>
                  <tbody style={{ display: 'table-row-group' }}>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <tr key={num} style={{ display: 'table-row', pageBreakInside: 'avoid' }}>
                        <td className="border border-slate-800 px-2 py-4 print:px-1.5 print:py-3 text-center" style={{ border: '1.5px solid #1e293b', verticalAlign: 'middle', fontWeight: '500', display: 'table-cell' }}>
                          {num}
                        </td>
                        <td className="border border-slate-800 px-2 py-4 print:px-1.5 print:py-3" style={{ border: '1.5px solid #1e293b', verticalAlign: 'top', minHeight: '30px', display: 'table-cell' }}>
                          &nbsp;
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Name & Signature of Audit Members */}
              <div className="mt-6 print:mt-4 page-break-inside-avoid">
                <div className="text-sm print:text-xs font-bold mb-2" style={{ fontWeight: 'bold', marginBottom: '8px' }}>NAME & SIGNATURE OF AUDIT MEMBERS</div>
                <table 
                  className="w-full text-xs print:text-[9px] border-collapse" 
                  style={{ 
                    border: '1.5px solid #1e293b',
                    tableLayout: 'fixed',
                    width: '100%',
                  }}
                >
                  <thead style={{ display: 'table-header-group' }}>
                    <tr className="bg-slate-200" style={{ backgroundColor: '#e2e8f0', display: 'table-row' }}>
                      <th className="border border-slate-800 px-2 py-2.5 print:px-1.5 print:py-2 text-center font-bold" style={{ width: '8%', border: '1.5px solid #1e293b', verticalAlign: 'middle', display: 'table-cell' }}>
                        S.NO
                      </th>
                      <th className="border border-slate-800 px-2 py-2.5 print:px-1.5 print:py-2 text-left font-bold" style={{ width: '25%', border: '1.5px solid #1e293b', verticalAlign: 'middle', display: 'table-cell' }}>
                        NAME
                      </th>
                      <th className="border border-slate-800 px-2 py-2.5 print:px-1.5 print:py-2 text-left font-bold" style={{ width: '30%', border: '1.5px solid #1e293b', verticalAlign: 'middle', display: 'table-cell' }}>
                        DEPARTMENT
                      </th>
                      <th className="border border-slate-800 px-2 py-2.5 print:px-1.5 print:py-2 text-left font-bold" style={{ width: '20%', border: '1.5px solid #1e293b', verticalAlign: 'middle', display: 'table-cell' }}>
                        DESIGINATION
                      </th>
                      <th className="border border-slate-800 px-2 py-2.5 print:px-1.5 print:py-2 text-center font-bold" style={{ width: '17%', border: '1.5px solid #1e293b', verticalAlign: 'middle', display: 'table-cell' }}>
                        SIGNATURE
                      </th>
                    </tr>
                  </thead>
                  <tbody style={{ display: 'table-row-group' }}>
                    {[1, 2, 3, 4].map((num) => (
                      <tr key={num} style={{ display: 'table-row', pageBreakInside: 'avoid' }}>
                        <td className="border border-slate-800 px-2 py-5 print:px-1.5 print:py-4 text-center" style={{ border: '1.5px solid #1e293b', verticalAlign: 'middle', fontWeight: '500', display: 'table-cell' }}>
                          {num}
                        </td>
                        <td className="border border-slate-800 px-2 py-5 print:px-1.5 print:py-4" style={{ border: '1.5px solid #1e293b', verticalAlign: 'middle', minHeight: '40px', display: 'table-cell' }}>
                          &nbsp;
                        </td>
                        <td className="border border-slate-800 px-2 py-5 print:px-1.5 print:py-4" style={{ border: '1.5px solid #1e293b', verticalAlign: 'middle', display: 'table-cell' }}>
                          &nbsp;
                        </td>
                        <td className="border border-slate-800 px-2 py-5 print:px-1.5 print:py-4" style={{ border: '1.5px solid #1e293b', verticalAlign: 'middle', display: 'table-cell' }}>
                          &nbsp;
                        </td>
                        <td className="border border-slate-800 px-2 py-5 print:px-1.5 print:py-4" style={{ border: '1.5px solid #1e293b', verticalAlign: 'middle', display: 'table-cell' }}>
                          &nbsp;
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="mt-6 print:mt-4 pt-4 print:pt-3 border-t border-slate-300 text-center">
                <p className="text-xs print:text-[9px] text-slate-600">
                  Generated on {new Date().toLocaleString('en-GB')} | Hospital Audit System - Medical Records Department
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
    </>
  )
}
