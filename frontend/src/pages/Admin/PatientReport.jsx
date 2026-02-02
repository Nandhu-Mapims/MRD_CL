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
  const [unitChief, setUnitChief] = useState('')
  const [admissions, setAdmissions] = useState([])
  const [groupsFromUHID, setGroupsFromUHID] = useState([]) // grouped by date+time+IPID
  const [selectedIPID, setSelectedIPID] = useState(null)
  const [selectedGroup, setSelectedGroup] = useState(null) // { date, auditTime, ipid, submissions }
  const [loadingAdmissions, setLoadingAdmissions] = useState(false)

  // Build report data from a list of submissions (same structure as loadChecklistByIPID)
  const buildReportDataFromSubmissions = (submissions) => {
    if (!submissions || submissions.length === 0) return null
    const deptMap = new Map()
    const patient = submissions[0]?.patient || { uhid: submissions[0]?.uhid || uhid?.trim().toUpperCase(), patientName: submissions[0]?.patientName || 'N/A' }
    submissions.forEach(sub => {
      const deptId = sub.department?._id || sub.department
      const deptName = sub.department?.name || 'Unknown Department'
      const deptCode = sub.department?.code || 'N/A'
      const formId = sub.formTemplate?._id || sub.formTemplate
      const formName = sub.formTemplate?.name || 'Unknown Form'
      const key = `${deptId}_${formId}`
      if (!deptMap.has(key)) {
        deptMap.set(key, {
          department: { _id: deptId, name: deptName, code: deptCode },
          form: { _id: formId, name: formName },
          submittedBy: sub.submittedBy,
          submittedAt: sub.submittedAt,
          sections: new Map()
        })
      }
      const deptData = deptMap.get(key)
      const sectionName = sub.checklistItemId?.section || 'General'
      if (!deptData.sections.has(sectionName)) {
        deptData.sections.set(sectionName, { sectionName, items: [] })
      }
      const section = deptData.sections.get(sectionName)
      section.items.push({
        checklistItemId: {
          _id: sub.checklistItemId?._id,
          label: sub.checklistItemId?.label || 'N/A',
          section: sub.checklistItemId?.section,
          responseType: sub.checklistItemId?.responseType || 'YES_NO',
          order: 0,
        },
        responseValue: sub.responseValue || sub.yesNoNa || '',
        remarks: sub.remarks || '',
        corrective: sub.corrective || '',
        preventive: sub.preventive || '',
        submittedAt: sub.submittedAt,
      })
    })
    return {
      patient,
      departments: Array.from(deptMap.values()).map(deptData => ({
        department: deptData.department,
        form: deptData.form,
        submittedBy: deptData.submittedBy,
        submittedAt: deptData.submittedAt,
        sections: Array.from(deptData.sections.values()).map(section => ({
          sectionName: section.sectionName,
          items: section.items.sort((a, b) => (a.checklistItemId?.order || 0) - (b.checklistItemId?.order || 0)),
        })),
      })),
      totalSubmissions: submissions.length,
    }
  }

  // Load admissions and/or submission groups for UHID
  const loadAdmissions = async (uhidValue) => {
    if (!uhidValue || !uhidValue.trim()) return
    
    setLoadingAdmissions(true)
    setAdmissions([])
    setGroupsFromUHID([])
    setError('')
    setSelectedIPID(null)
    setSelectedGroup(null)
    setReportData(null)
    
    try {
      const normalizedUHID = uhidValue.trim().toUpperCase()
      // Prefer submissions grouped by date+time+IPID for report/logs
      let groups = []
      try {
        const auditsRes = await apiClient.get(`/audits/uhid/${encodeURIComponent(normalizedUHID)}`)
        if (auditsRes?.groupedByDateAndIPID && auditsRes.groupedByDateAndIPID.length > 0) {
          groups = auditsRes.groupedByDateAndIPID
          setGroupsFromUHID(groups)
        }
      } catch (auditErr) {
        if (auditErr.response?.status !== 404) console.error('Error loading audits by UHID:', auditErr)
      }
      // If no groups, try admissions API
      let hasData = groups.length > 0
      if (!hasData) {
        try {
          const admissionsData = await apiClient.get(`/admissions/patient/${encodeURIComponent(normalizedUHID)}`)
          let admissionsList = []
          if (Array.isArray(admissionsData)) admissionsList = admissionsData
          else if (admissionsData?.admissions) admissionsList = admissionsData.admissions
          else if (admissionsData?.data?.admissions) admissionsList = admissionsData.data.admissions
          if (admissionsList.length > 0) {
            setAdmissions(admissionsList)
            hasData = true
          } else {
            const submissions = await apiClient.get(`/audits/uhid/${encodeURIComponent(normalizedUHID)}`)
            const raw = submissions?.submissions || (Array.isArray(submissions) ? submissions : [])
            if (raw.length > 0) {
              const uniqueIPIDs = [...new Set(raw.map(s => s.ipid).filter(Boolean))]
              const virtualAdmissions = uniqueIPIDs.map(ipid => {
                const subWithIPID = raw.find(s => s.ipid === ipid)
                return {
                  ipid,
                  uhid: normalizedUHID,
                  admissionDate: subWithIPID?.submittedAt || new Date(),
                  status: 'Admitted',
                  ward: subWithIPID?.admission?.ward || subWithIPID?.ward || subWithIPID?.patient?.ward || 'N/A',
                  unitNo: subWithIPID?.admission?.unitNo || subWithIPID?.unitNo || subWithIPID?.patient?.unitNo || 'N/A',
                  isVirtual: true
                }
              })
              setAdmissions(virtualAdmissions)
              hasData = true
            }
          }
        } catch (admErr) {
          if (admErr.response?.status === 404) setError(`No admissions found for UHID: ${normalizedUHID}`)
          else setError(admErr.response?.data?.message || admErr.message || 'Failed to load')
        }
      }
      if (!hasData && groups.length === 0) {
        setError(`No admissions or audit submissions found for UHID: ${normalizedUHID}`)
      }
    } catch (err) {
      console.error('Error loading admissions:', err)
      setAdmissions([])
      setGroupsFromUHID([])
      if (err.response?.status === 404) {
        setError(`No admissions found for UHID: ${uhidValue.trim().toUpperCase()}`)
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load admissions')
      }
    } finally {
      setLoadingAdmissions(false)
    }
  }

  // Load checklist for specific IPID
  const loadChecklistByIPID = async (ipid) => {
    if (!ipid || !ipid.trim()) return
    
    setLoading(true)
    setError('')
    setSelectedIPID(ipid.trim().toUpperCase())
    setReportData(null)

    try {
      // Get submissions for this IPID
      const submissions = await apiClient.get(`/audits/ipid/${encodeURIComponent(ipid.trim().toUpperCase())}`)
      
      if (!submissions || submissions.length === 0) {
        setError('No submissions found for this IPID')
        return
      }

      // Group submissions by department and form
      const deptMap = new Map()
      const patient = submissions[0]?.patient || { 
        uhid: submissions[0]?.uhid || uhid.trim().toUpperCase(), 
        patientName: submissions[0]?.patientName || 'N/A' 
      }

      submissions.forEach(sub => {
        const deptId = sub.department?._id || sub.department
        const deptName = sub.department?.name || 'Unknown Department'
        const deptCode = sub.department?.code || 'N/A'
        const formId = sub.formTemplate?._id || sub.formTemplate
        const formName = sub.formTemplate?.name || 'Unknown Form'
        
        const key = `${deptId}_${formId}`
        
        if (!deptMap.has(key)) {
          deptMap.set(key, {
            department: { _id: deptId, name: deptName, code: deptCode },
            form: { _id: formId, name: formName },
            submittedBy: sub.submittedBy,
            submittedAt: sub.submittedAt,
            sections: new Map()
          })
        }
        
        const deptData = deptMap.get(key)
        const sectionName = sub.checklistItemId?.section || 'General'
        
        if (!deptData.sections.has(sectionName)) {
          deptData.sections.set(sectionName, {
            sectionName,
            items: []
          })
        }
        
        const section = deptData.sections.get(sectionName)
        section.items.push({
          checklistItemId: {
            _id: sub.checklistItemId?._id,
            label: sub.checklistItemId?.label || 'N/A',
            section: sub.checklistItemId?.section,
            responseType: sub.checklistItemId?.responseType || 'YES_NO',
            order: 0,
          },
          responseValue: sub.responseValue || sub.yesNoNa || '',
          remarks: sub.remarks || '',
          corrective: sub.corrective || '',
          preventive: sub.preventive || '',
          submittedAt: sub.submittedAt,
        })
      })

      // Transform to match existing structure
      const transformedData = {
        patient,
        departments: Array.from(deptMap.values()).map(deptData => ({
          department: deptData.department,
          form: deptData.form,
          submittedBy: deptData.submittedBy,
          submittedAt: deptData.submittedAt,
          sections: Array.from(deptData.sections.values()).map(section => ({
            sectionName: section.sectionName,
            items: section.items.sort((a, b) => 
              (a.checklistItemId?.order || 0) - (b.checklistItemId?.order || 0)
            ),
          })),
        })),
        totalSubmissions: submissions.length,
      }
      
      // Auto-populate ward, unitNo, and unitChief from admission or submission
      const admission = submissions[0]?.admission
      const firstSubmission = submissions[0]
      if (admission) {
        setWard(admission.ward || '')
        setUnitNo(admission.unitNo || '')
      }
      // Unit Chief is stored in submission
      if (firstSubmission?.unitChief) {
        setUnitChief(firstSubmission.unitChief)
      }
      
      // Auto-populate consultant name from the first department's submitter
      // This ensures consultant name matches the person who filled the checklist
      if (transformedData.departments.length > 0) {
        const firstSubmittedDept = transformedData.departments.find(d => d.submittedBy?.name)
        if (firstSubmittedDept?.submittedBy?.name) {
          // Always auto-populate to match the submitter (user can still manually override)
          setConsultantName(firstSubmittedDept.submittedBy.name)
        }
      }
      
      setReportData(transformedData)
      setError('')
    } catch (err) {
      console.error('Error fetching checklist by IPID:', err)
      setReportData(null)
      const errorMessage = err.response?.data?.message || 'Failed to load checklist for this IPID'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!uhid.trim()) {
      setError('Please enter a UHID')
      return
    }
    await loadAdmissions(uhid.trim())
  }

  // Select a group (date+time+IPID) and build report from its submissions
  const handleGroupClick = (group) => {
    setSelectedGroup(group)
    setSelectedIPID(group.ipid)
    const data = buildReportDataFromSubmissions(group.submissions)
    setReportData(data)
    setError('')
    const firstSub = group.submissions[0]
    if (firstSub?.unitChief) setUnitChief(firstSub.unitChief)
    // Ward and unitNo are on admission, not directly on submission
    const adm = firstSub?.admission
    const w = adm?.ward || firstSub?.ward || ''
    const u = adm?.unitNo || firstSub?.unitNo || ''
    setWard(w)
    setUnitNo(u)
    if (data?.departments?.length > 0) {
      const firstDept = data.departments.find(d => d.submittedBy?.name)
      if (firstDept?.submittedBy?.name) setConsultantName(firstDept.submittedBy.name)
    }
  }

  const handleIPIDClick = async (ipid) => {
    await loadChecklistByIPID(ipid)
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
    
    // Consultant, Ward, Unit, Unit Chief fields
    let yPos = 22
    doc.setFontSize(9)
    doc.text('CONSULTANT NAME:', 20, yPos)
    doc.text(consultantName || '_______________________', 60, yPos)
    doc.text('UNIT CHIEF:', 120, yPos)
    doc.text(unitChief || '___________', 150, yPos)
    yPos += 5
    doc.text('WARD:', 20, yPos)
    doc.text(ward || '___________', 38, yPos)
    doc.text('UNIT NO:', 90, yPos)
    doc.text(unitNo || '____', 110, yPos)

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
    yPos += 5
    doc.text(`IPID: ${selectedIPID || 'N/A'}`, 20, yPos)
    const departmentNames = reportData.departments && reportData.departments.length > 0
      ? reportData.departments.map(dept => dept.department.name).join(', ')
      : 'N/A'
    doc.text(`Department Name: ${departmentNames}`, 100, yPos)
    yPos += 8

    // Main table header (landscape layout needed for more columns)
    doc.setFontSize(7)
    doc.setFont(undefined, 'bold')
    doc.setFillColor(240, 240, 240)
    doc.rect(15, yPos, 180, 8, 'F')
    
    // Table headers - adjusted positions for all 6 columns
    doc.text('STANDARD & OBJECTIVE ELEMENTS', 17, yPos + 5)
    doc.text('Y', 90, yPos + 5)
    doc.text('N', 97, yPos + 5)
    doc.text('Remarks', 105, yPos + 5)
    doc.text('Corrective', 130, yPos + 5)
    doc.text('Preventive', 160, yPos + 5)

    yPos += 9

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
          const corrective = item.corrective || ''
          const preventive = item.preventive || ''

          // Item label (truncated if too long)
          doc.setFontSize(7)
          doc.setFont(undefined, 'normal')
          const labelLines = doc.splitTextToSize(`${idx + 1}. ${label}`, 70)
          doc.text(labelLines[0], 17, yPos)

          // Yes checkbox
          doc.rect(90, yPos - 3, 3, 3, isYes ? 'F' : 'S')
          if (isYes) {
            doc.setFontSize(6)
            doc.text('✓', 90.5, yPos - 1.5)
          }

          // No checkbox
          doc.rect(97, yPos - 3, 3, 3, isNo ? 'F' : 'S')
          if (isNo) {
            doc.setFontSize(6)
            doc.text('✓', 97.5, yPos - 1.5)
          }

          // Remarks (truncated)
          doc.setFontSize(6)
          const remarksLines = doc.splitTextToSize(remarks || '-', 20)
          doc.text(remarksLines[0] || '-', 105, yPos)

          // Corrective (truncated)
          const correctiveLines = doc.splitTextToSize(corrective || '-', 25)
          doc.text(correctiveLines[0] || '-', 130, yPos)

          // Preventive (truncated)
          const preventiveLines = doc.splitTextToSize(preventive || '-', 25)
          doc.text(preventiveLines[0] || '-', 160, yPos)

          yPos += 5
        })

        yPos += 2
      })

      yPos += 3
    })

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
            margin: 12mm 15mm;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            font-size: 10pt !important;
            width: 100% !important;
            height: auto !important;
          }
          
          .no-print {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            overflow: hidden !important;
          }
          
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            page-break-inside: avoid !important;
          }
          
          .print-page {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
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
            page-break-inside: auto !important;
            display: table !important;
            visibility: visible !important;
            table-layout: fixed !important;
            font-size: 9pt !important;
          }
          
          table thead {
            display: table-header-group !important;
            visibility: visible !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          }
          
          table tbody {
            display: table-row-group !important;
            visibility: visible !important;
          }
          
          table tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
            break-inside: avoid !important;
            display: table-row !important;
            visibility: visible !important;
          }
          
          table td,
          table th {
            display: table-cell !important;
            visibility: visible !important;
            border: 1.5px solid #1e293b !important;
            padding: 3px 4px !important;
            vertical-align: top !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            hyphens: auto !important;
            font-size: 9pt !important;
            line-height: 1.3 !important;
          }
          
          /* Text response type - better wrapping */
          table td div[style*="whiteSpace: pre-wrap"] {
            white-space: pre-wrap !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            max-width: 100% !important;
            font-size: 8pt !important;
            line-height: 1.4 !important;
          }
          
          /* Prevent section headers from breaking */
          .section-header {
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          
          .section-header td {
            background-color: #f1f5f9 !important;
            font-weight: 600 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .dept-header {
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          
          .dept-header td {
            background-color: #dbeafe !important;
            font-weight: bold !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
            width: 6% !important;
            text-align: center !important;
          }
          
          /* Ensure all text is visible and black */
          * {
            color: #000 !important;
          }
          
          /* Keep background colors for headers */
          .dept-header td,
          .section-header td {
            background-color: #dbeafe !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          tr:nth-child(even) {
            background-color: #f8fafc !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          tr:nth-child(odd) {
            background-color: #ffffff !important;
          }
          
          /* Page breaks */
          .page-break {
            page-break-before: always !important;
            break-before: page !important;
          }
          
          /* Ensure no overflow but allow text wrapping */
          * {
            overflow: visible !important;
          }
          
          /* Better spacing for print */
          h1, h2, h3, h4 {
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          
          /* Footer positioning */
          .mt-6.print\\:mt-4 {
            margin-top: 8mm !important;
            page-break-inside: avoid !important;
          }
        }
        
        @media screen {
          .print-container {
            max-width: 210mm;
            margin: 0 auto;
          }
        }
      `}</style>

      <div className="space-y-6">
        {/* Header Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden no-print">
          <div className="bg-white border-b border-slate-200 px-6 py-5">
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-1">
              Patient Report Dashboard
            </h1>
            <p className="text-sm sm:text-base text-slate-600">
              Generate comprehensive audit checklist reports for patient admissions
            </p>
          </div>

          {/* Search Form */}
          <div className="p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Enter Unique Hospital ID (UHID)
                  </label>
                  <input
                    type="text"
                    value={uhid}
                    onChange={(e) => setUhid(e.target.value.toUpperCase())}
                    placeholder="Enter UHID (e.g., 234567)"
                    className="w-full border-2 border-slate-300 rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm hover:shadow-md"
                    required
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold px-8 py-3 rounded-lg shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed text-base min-w-[140px]"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                        Searching...
                      </span>
                    ) : (
                      'Search'
                    )}
                  </button>
                </div>
              </div>

              {/* Additional Fields - Only show when report is loaded */}
              {reportData && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">
                    Report Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-2">
                        Consultant Name
                        <span className="text-blue-600 ml-1 text-[10px]">(Auto-filled from submitter)</span>
                      </label>
                      <input
                        type="text"
                        value={consultantName}
                        onChange={(e) => setConsultantName(e.target.value)}
                        placeholder="Enter consultant name"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-blue-50"
                        title="Automatically set to match the checklist submitter. You can override if needed."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-2">
                        Ward
                      </label>
                      <div className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-slate-50 text-slate-700 font-medium">
                        {ward || reportData?.patient?.ward || 'Not provided'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-2">
                        Unit No
                      </label>
                      <div className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-slate-50 text-slate-700 font-medium">
                        {unitNo || reportData?.patient?.unitNo || 'Not provided'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-2">
                        Unit Chief
                      </label>
                      <div className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-slate-50 text-slate-700 font-medium">
                        {unitChief || 'Not provided'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>

            {error && (
              <div className={`mt-4 p-4 rounded-lg text-sm border-2 ${
                error.includes('not found') || error.includes('no audit submissions')
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-red-50 border-red-300 text-red-800'
              }`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">
                    {error.includes('not found') || error.includes('no audit submissions') ? 'ℹ️' : '⚠️'}
                  </span>
                  <div>
                    <p className="font-semibold mb-1">
                      {error.includes('not found') ? 'Patient Not Found' : 
                       error.includes('no audit submissions') ? 'No Submissions Available' : 
                       'Error'}
                    </p>
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* List: groups (date+time+IPID) or admissions (IPID) - when UHID entered, no report selected */}
      {uhid && !selectedIPID && !reportData && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h3 className="text-xl font-semibold text-slate-900">
              {groupsFromUHID.length > 0 ? 'Select Audit (Date + Time + IPID)' : 'Select Admission (IPID)'}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              UHID: <span className="font-mono font-semibold text-indigo-700">{uhid.trim().toUpperCase()}</span>
            </p>
          </div>
          <div className="p-6">
            {loadingAdmissions ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-3 border-blue-600 border-t-transparent mb-4"></div>
                <div className="text-slate-600 font-medium">Loading...</div>
              </div>
            ) : groupsFromUHID.length > 0 ? (
              <div className="space-y-3">
                {groupsFromUHID.map((group, idx) => {
                  const dateStr = group.date ? new Date(group.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'
                  const timeStr = group.auditTime || (group.submissions?.[0]?.submittedAt ? new Date(group.submissions[0].submittedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '')
                  const ward = group.submissions?.[0]?.admission?.ward || group.submissions?.[0]?.ward || group.submissions?.[0]?.patient?.ward || 'N/A'
                  const unitNo = group.submissions?.[0]?.admission?.unitNo || group.submissions?.[0]?.unitNo || group.submissions?.[0]?.patient?.unitNo || 'N/A'
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleGroupClick(group)}
                      className="w-full text-left p-5 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 transition-all shadow-sm hover:shadow-md group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3 flex-wrap">
                            <span className="text-xl font-semibold text-indigo-700 group-hover:text-indigo-800 transition-colors">
                              IPID: {group.ipid}
                            </span>
                            <span className="text-sm font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                              {dateStr}
                            </span>
                            <span className="text-sm font-medium text-slate-600 bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                              {timeStr}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">🏥</span>
                              <div>
                                <div className="text-xs text-slate-500">Ward</div>
                                <div className="font-semibold text-slate-700">{ward}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">🏢</span>
                              <div>
                                <div className="text-xs text-slate-500">Unit</div>
                                <div className="font-semibold text-slate-700">{unitNo}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="ml-6 flex items-center">
                          <span className="text-indigo-700 text-sm font-semibold group-hover:text-indigo-800 transition-colors flex items-center gap-2">
                            View Report
                            <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : admissions.length === 0 ? (
              <div className="text-center py-12 bg-amber-50 border-2 border-amber-200 rounded-lg">
                <div className="text-5xl mb-3">📭</div>
                <p className="font-semibold text-amber-800 mb-2">No Admissions Found</p>
                <p className="text-sm text-amber-700">
                  No admission or audit records for UHID: <span className="font-mono font-semibold">{uhid.trim().toUpperCase()}</span>
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {admissions.map((admission, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleIPIDClick(admission.ipid)}
                    className="w-full text-left p-5 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 transition-all shadow-sm hover:shadow-md group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-xl font-semibold text-indigo-700 group-hover:text-indigo-800 transition-colors">
                            IPID: {admission.ipid}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">🏥</span>
                            <div>
                              <div className="text-xs text-slate-500">Ward</div>
                              <div className="font-semibold text-slate-700">{admission.ward}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">🏢</span>
                            <div>
                              <div className="text-xs text-slate-500">Unit</div>
                              <div className="font-semibold text-slate-700">{admission.unitNo}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="ml-6 flex items-center">
                        <span className="text-indigo-700 text-sm font-semibold group-hover:text-indigo-800 transition-colors flex items-center gap-2">
                          View Report
                          <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        )}

        {/* Report Display - Matching Template Format */}
        {selectedIPID && reportData && reportData.totalSubmissions > 0 && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 no-print">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div className="text-xs text-slate-600 mb-1">Selected IPID</div>
                  <div className="font-mono font-semibold text-indigo-700 text-lg">{selectedIPID}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIPID(null)
                    setSelectedGroup(null)
                    setReportData(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors border border-slate-300 hover:border-indigo-300"
                >
                  ← Back to List
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleExportPDF}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium px-6 py-2.5 rounded-lg shadow-sm transition-all text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export to PDF
                </button>
                <button
                  onClick={() => window.print()}
                  className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium px-6 py-2.5 rounded-lg transition-all text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
              </div>
            </div>
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
              </div>

              {/* Consultant, Ward, Unit, Unit Chief fields */}
              <div className="mb-4 print:mb-3 text-xs print:text-[10px] grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="font-semibold">CONSULTANT NAME:</span>{' '}
                  <span className="border-b border-slate-400 inline-block min-w-[150px]">
                    {consultantName || (reportData?.departments?.[0]?.submittedBy?.name || '_______________________')}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">UNIT CHIEF:</span>{' '}
                  <span className="border-b border-slate-400 inline-block min-w-[120px]">
                    {unitChief || '___________'}
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
                  <div>
                    <span className="font-semibold">IPID:</span>{' '}
                    <span className="font-medium">{selectedIPID || 'N/A'}</span>
                  </div>
                  <div><span className="font-semibold">Patient Name:</span> {reportData.patient.patientName}</div>
                  <div>
                    <span className="font-semibold">Department Name:</span>{' '}
                    <span className="font-medium">
                      {reportData.departments && reportData.departments.length > 0
                        ? reportData.departments.map(dept => dept.department.name).join(', ')
                        : 'N/A'}
                    </span>
                  </div>
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
                      <th className="border border-slate-800 px-2 py-2.5 print:px-1.5 print:py-2 text-left font-bold align-top" style={{ width: '30%', border: '1.5px solid #1e293b', verticalAlign: 'middle', display: 'table-cell' }}>
                        STANDARD & OBJECTIVE ELEMENTS
                      </th>
                      <th className="border border-slate-800 px-1 py-2.5 print:px-0.5 print:py-2 text-center font-bold" style={{ width: '5%', border: '1.5px solid #1e293b', verticalAlign: 'middle', display: 'table-cell' }}>
                        Yes
                      </th>
                      <th className="border border-slate-800 px-1 py-2.5 print:px-0.5 print:py-2 text-center font-bold" style={{ width: '5%', border: '1.5px solid #1e293b', verticalAlign: 'middle', display: 'table-cell' }}>
                        No
                      </th>
                      <th className="border border-slate-800 px-2 py-2.5 print:px-1.5 print:py-2 text-center font-bold align-top" style={{ width: '15%', border: '1.5px solid #1e293b', verticalAlign: 'middle', display: 'table-cell' }}>
                        COMPLIANCE<br />Remarks (NA)
                      </th>
                      <th className="border border-slate-800 px-2 py-2.5 print:px-1.5 print:py-2 text-center font-bold" style={{ width: '15%', border: '1.5px solid #1e293b', verticalAlign: 'middle', display: 'table-cell' }}>
                        Corrective Action
                      </th>
                      <th className="border border-slate-800 px-2 py-2.5 print:px-1.5 print:py-2 text-center font-bold" style={{ width: '15%', border: '1.5px solid #1e293b', verticalAlign: 'middle', display: 'table-cell' }}>
                        Preventive Action
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
                                colSpan="6" 
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
                                colSpan="6" 
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
                              const responseType = item.checklistItemId?.responseType || 'YES_NO'
                              const isTextType = responseType === 'TEXT'
                              const responseValue = item.responseValue || item.yesNoNa || ''
                              const isYes = !isTextType && (responseValue === 'YES' || responseValue === 'Yes' || responseValue === 'yes')
                              const isNo = !isTextType && (responseValue === 'NO' || responseValue === 'No' || responseValue === 'no')
                              const remarks = item.remarks || '-'
                              const corrective = item.corrective || ''
                              const preventive = item.preventive || ''

                              // For TEXT type, render a single row spanning all columns
                              if (isTextType) {
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
                                    colSpan="6"
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
                                    <div style={{ marginBottom: '4px', fontWeight: '500' }}>
                                      <span style={{ fontWeight: '500' }}>{itemIndex + 1}.</span> {label}
                                    </div>
                                    <div 
                                      style={{ 
                                        backgroundColor: '#e0f2fe', 
                                        border: '1px solid #0284c7', 
                                        borderRadius: '4px', 
                                        padding: '8px', 
                                        marginTop: '4px',
                                        whiteSpace: 'pre-wrap',
                                        wordWrap: 'break-word',
                                        overflowWrap: 'break-word',
                                        fontStyle: 'italic',
                                        fontSize: '9pt',
                                        lineHeight: '1.4',
                                      }}
                                      className="print:text-[8pt]"
                                    >
                                      {responseValue || 'N/A'}
                                    </div>
                                  </td>
                                </tr>
                                )
                              }

                              // For YES_NO type, render normal row
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
                                    className="border border-slate-800 px-2 py-2.5 print:px-1.5 print:py-2 text-slate-700 text-[10px] print:text-[8px]" 
                                    style={{ 
                                      border: '1.5px solid #1e293b', 
                                      verticalAlign: 'top', 
                                      lineHeight: '1.3', 
                                      wordWrap: 'break-word',
                                      overflowWrap: 'break-word',
                                      display: 'table-cell',
                                      maxWidth: '20%',
                                    }}
                                  >
                                    <div style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                                      {remarks}
                                    </div>
                                  </td>
                                  <td 
                                    className="border border-slate-800 px-2 py-2.5 print:px-1.5 print:py-2 text-slate-700 text-[10px] print:text-[8px]" 
                                    style={{ 
                                      border: '1.5px solid #1e293b', 
                                      verticalAlign: 'top', 
                                      lineHeight: '1.3',
                                      display: 'table-cell',
                                      wordWrap: 'break-word',
                                      overflowWrap: 'break-word',
                                      maxWidth: '15%',
                                    }}
                                  >
                                    <div style={{ wordWrap: 'break-word', overflowWrap: 'break-word', fontStyle: item.corrective ? 'normal' : 'italic', color: item.corrective ? 'inherit' : '#94a3b8' }}>
                                      {item.corrective || '—'}
                                    </div>
                                  </td>
                                  <td 
                                    className="border border-slate-800 px-2 py-2.5 print:px-1.5 print:py-2 text-slate-700 text-[10px] print:text-[8px]" 
                                    style={{ 
                                      border: '1.5px solid #1e293b', 
                                      verticalAlign: 'top', 
                                      lineHeight: '1.3',
                                      display: 'table-cell',
                                      wordWrap: 'break-word',
                                      overflowWrap: 'break-word',
                                      maxWidth: '15%',
                                    }}
                                  >
                                    <div style={{ wordWrap: 'break-word', overflowWrap: 'break-word', fontStyle: item.preventive ? 'normal' : 'italic', color: item.preventive ? 'inherit' : '#94a3b8' }}>
                                      {item.preventive || '—'}
                                    </div>
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
