import { useState } from 'react'
import { apiClient } from '../../api/client'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

export function PatientReport() {
  const [uhid, setUhid] = useState('')
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [error, setError] = useState('')

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
      const data = await apiClient.get(`/audits/uhid/${uhid.trim().toUpperCase()}`)
      setReportData(data)
      // If patient found but no submissions, show info message
      if (data.message) {
        setError(data.message)
      } else {
        setError('')
      }
    } catch (err) {
      console.error('Error fetching patient report:', err)
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Failed to fetch patient report. Please check your connection and try again.'
      setError(errorMessage)
      setReportData(null)
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

    // Elegant Header with gradient effect
    doc.setFillColor(239, 68, 68)
    doc.rect(0, 0, 210, 25, 'F')
    
    // White text on red background
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont(undefined, 'bold')
    doc.text('HOSPITAL AUDIT SYSTEM', 105, 12, { align: 'center' })
    
    doc.setFontSize(11)
    doc.setFont(undefined, 'normal')
    doc.text('Medical Records Department', 105, 18, { align: 'center' })
    
    // Decorative line
    doc.setDrawColor(239, 68, 68)
    doc.setLineWidth(0.5)
    doc.line(20, 28, 190, 28)
    
    // Patient Information Box - Elegant Design
    doc.setFillColor(254, 242, 242) // Light red background
    doc.roundedRect(20, 32, 170, 20, 3, 3, 'F')
    
    doc.setFontSize(13)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(220, 38, 38)
    doc.text('PATIENT INFORMATION', 105, 38, { align: 'center' })
    
    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.setTextColor(30, 41, 59)
    
    // Patient details in two columns
    doc.text(`UHID: ${reportData.patient.uhid}`, 25, 44)
    doc.text(`Patient Name: ${reportData.patient.patientName}`, 25, 48)
    doc.text(`Total Submissions: ${reportData.totalSubmissions}`, 110, 44)
    doc.text(`Report Date: ${new Date().toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    })}`, 110, 48)

    let yPos = 58

    // Department-wise checklist
    reportData.departments.forEach((deptData, deptIndex) => {
      // Check if we need a new page
      if (yPos > 250) {
        doc.addPage()
        // Redraw header on new page
        doc.setFillColor(239, 68, 68)
        doc.rect(0, 0, 210, 25, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(22)
        doc.setFont(undefined, 'bold')
        doc.text('HOSPITAL AUDIT SYSTEM', 105, 12, { align: 'center' })
        doc.setFontSize(11)
        doc.setFont(undefined, 'normal')
        doc.text('Medical Records Department', 105, 18, { align: 'center' })
        doc.setDrawColor(239, 68, 68)
        doc.line(20, 28, 190, 28)
        yPos = 32
      }

      // Elegant Department Header Box
      doc.setFillColor(239, 68, 68)
      doc.roundedRect(20, yPos, 170, 8, 2, 2, 'F')
      
      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(`${deptData.department.name} (${deptData.department.code})`, 25, yPos + 5.5)
      yPos += 10

      // Sections within department
      deptData.sections.forEach((section) => {
        if (yPos > 250) {
          doc.addPage()
          // Redraw header on new page
          doc.setFillColor(239, 68, 68)
          doc.rect(0, 0, 210, 25, 'F')
          doc.setTextColor(255, 255, 255)
          doc.setFontSize(22)
          doc.setFont(undefined, 'bold')
          doc.text('HOSPITAL AUDIT SYSTEM', 105, 12, { align: 'center' })
          doc.setFontSize(11)
          doc.setFont(undefined, 'normal')
          doc.text('Medical Records Department', 105, 18, { align: 'center' })
          doc.setDrawColor(239, 68, 68)
          doc.line(20, 28, 190, 28)
          yPos = 32
        }

        // Elegant Section Header
        doc.setFillColor(254, 242, 242)
        doc.roundedRect(25, yPos, 165, 6, 2, 2, 'F')
        
        doc.setFontSize(10)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(185, 28, 28)
        doc.text(section.sectionName, 28, yPos + 4)
        yPos += 8

        // Checklist Items Table
        const tableData = section.items.map((item) => {
          const responseValue = item.responseValue || item.yesNoNa || 'N/A'
          const status = item.status || 'OPEN'
          const remarks = item.remarks || '-'
          const responsibility = item.responsibility || '-'
          
          return [
            item.checklistItemId?.label || 'N/A',
            responseValue,
            status,
            responsibility,
            remarks,
          ]
        })

        doc.autoTable({
          startY: yPos,
          head: [['Checklist Item', 'Response', 'Status', 'Responsibility', 'Remarks']],
          body: tableData,
          theme: 'striped',
          headStyles: {
            fillColor: [220, 38, 38],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'center',
            valign: 'middle',
            cellPadding: 3,
          },
          bodyStyles: {
            fontSize: 8,
            textColor: [30, 41, 59],
            cellPadding: 2.5,
            lineColor: [241, 245, 249],
            lineWidth: 0.3,
          },
          alternateRowStyles: {
            fillColor: [255, 255, 255],
          },
          columnStyles: {
            0: { 
              cellWidth: 60,
              halign: 'left',
              fontStyle: 'normal',
            },
            1: { 
              cellWidth: 25,
              halign: 'center',
              fontStyle: 'bold',
            },
            2: { 
              cellWidth: 25,
              halign: 'center',
            },
            3: { 
              cellWidth: 30,
              halign: 'center',
            },
            4: { 
              cellWidth: 50,
              halign: 'left',
            },
          },
          margin: { left: 25, right: 20, top: 5 },
          styles: { 
            overflow: 'linebreak', 
            cellPadding: 2.5,
            lineColor: [226, 232, 240],
            lineWidth: 0.5,
          },
          didParseCell: function (data) {
            // Color code responses
            if (data.column.index === 1 && data.cell.text) {
              const response = data.cell.text[0]
              if (response === 'YES') {
                data.cell.styles.fillColor = [220, 252, 231]
                data.cell.styles.textColor = [22, 163, 74]
              } else if (response === 'NO') {
                data.cell.styles.fillColor = [254, 226, 226]
                data.cell.styles.textColor = [220, 38, 38]
              } else {
                data.cell.styles.fillColor = [254, 243, 199]
                data.cell.styles.textColor = [217, 119, 6]
              }
            }
            // Color code status
            if (data.column.index === 2 && data.cell.text) {
              const status = data.cell.text[0]
              if (status === 'CLOSED') {
                data.cell.styles.fillColor = [220, 252, 231]
                data.cell.styles.textColor = [22, 163, 74]
              } else if (status === 'IN_PROGRESS') {
                data.cell.styles.fillColor = [254, 243, 199]
                data.cell.styles.textColor = [217, 119, 6]
              } else {
                data.cell.styles.fillColor = [254, 226, 226]
                data.cell.styles.textColor = [220, 38, 38]
              }
            }
          },
        })

        yPos = doc.lastAutoTable.finalY + 5
      })

      // Add spacing between departments
      if (deptIndex < reportData.departments.length - 1) {
        yPos += 5
      }
    })

    // Elegant Footer on each page
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      
      // Footer line
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.5)
      doc.line(20, 280, 190, 280)
      
      // Footer text
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.setFont(undefined, 'normal')
      doc.text(
        `Page ${i} of ${pageCount}`,
        105,
        285,
        { align: 'center' }
      )
      
      // Hospital name and date
      doc.text(
        `Hospital Audit System - Medical Records Department | Generated: ${new Date().toLocaleString('en-GB')}`,
        105,
        290,
        { align: 'center' }
      )
    }

    // Save PDF
    doc.save(`Patient_Report_${reportData.patient.uhid}_${Date.now()}.pdf`)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border-l-4 border-red-600">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 mb-2">
          Patient Report Dashboard
        </h2>
        <p className="text-xs sm:text-sm text-slate-600">
          Enter UHID to view complete checklist report for a patient
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1">
            <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
              Enter UHID
            </label>
            <input
              type="text"
              value={uhid}
              onChange={(e) => setUhid(e.target.value.toUpperCase())}
              placeholder="Enter UHID (e.g., UHID12345)"
              className="w-full border-2 border-slate-300 rounded-lg px-4 py-2.5 sm:py-3 text-sm sm:text-base focus:ring-2 focus:ring-red-500 focus:border-red-500"
              required
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed transform hover:scale-[1.02] text-sm sm:text-base"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {error && (
          <div className={`mt-4 p-4 rounded-lg text-sm border-2 ${
            error.includes('not found') || error.includes('no audit submissions')
              ? 'bg-yellow-50 border-yellow-300 text-yellow-800'
              : 'bg-red-50 border-red-200 text-red-700'
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

      {/* Report Display - A4 Printable Format */}
      {reportData && reportData.totalSubmissions > 0 && (
        <div className="space-y-4 sm:space-y-6">
          {/* Action Buttons */}
          <div className="bg-white rounded-lg shadow-md p-4 flex flex-wrap gap-3 justify-end">
            <button
              onClick={handleExportPDF}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold px-6 py-2.5 rounded-lg shadow-lg transition-all transform hover:scale-[1.02] text-sm sm:text-base"
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

          {/* A4 Printable Report */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none print:rounded-none">
            {/* Printable Content - A4 Size */}
            <div
              className="p-6 sm:p-8 md:p-10 print:p-8"
              style={{
                width: '210mm',
                minHeight: '297mm',
                margin: '0 auto',
                backgroundColor: 'white',
              }}
            >
              {/* Elegant Header */}
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-t-lg print:rounded-none p-6 print:p-4 mb-6 print:mb-4 shadow-lg print:shadow-none">
                <div className="text-center">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 print:text-3xl drop-shadow-md">
                    HOSPITAL AUDIT SYSTEM
                  </h1>
                  <p className="text-sm sm:text-base text-red-100 print:text-sm">
                    Medical Records Department
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-red-500 border-opacity-30 print:border-t-0 print:pt-0 print:mt-0"></div>
              </div>

              {/* Elegant Patient Information Box */}
              <div className="mb-6 print:mb-4 bg-gradient-to-br from-red-50 to-white p-5 print:p-4 rounded-xl print:rounded-lg border-2 border-red-200 shadow-md print:shadow-none">
                <div className="flex items-center gap-3 mb-4 print:mb-3">
                  <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center print:w-8 print:h-8">
                    <span className="text-white text-xl print:text-base">👤</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-red-700 print:text-lg">
                    PATIENT INFORMATION
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm print:text-xs bg-white p-4 print:p-3 rounded-lg print:rounded border border-red-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-red-600 min-w-[100px] print:min-w-[80px]">UHID:</span>
                    <span className="text-slate-800 font-semibold">{reportData.patient.uhid}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-red-600 min-w-[100px] print:min-w-[80px]">Patient Name:</span>
                    <span className="text-slate-800 font-semibold">{reportData.patient.patientName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-red-600 min-w-[100px] print:min-w-[80px]">Total Submissions:</span>
                    <span className="text-slate-800 font-semibold">{reportData.totalSubmissions}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-red-600 min-w-[100px] print:min-w-[80px]">Report Date:</span>
                    <span className="text-slate-800 font-semibold">
                      {new Date().toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Department-wise Checklists */}
              <div className="space-y-6 print:space-y-4">
                {reportData.departments.map((deptData, deptIndex) => (
                  <div key={deptIndex} className="break-inside-avoid">
                    {/* Elegant Department Header */}
                    <div className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 text-white p-4 print:p-3 rounded-t-lg print:rounded-t mb-0 shadow-lg print:shadow-none">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center print:w-6 print:h-6">
                          <span className="text-white text-lg print:text-sm">🏥</span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold print:text-base">
                          {deptData.department.name} ({deptData.department.code})
                        </h3>
                      </div>
                    </div>

                    {/* Sections */}
                    <div className="border-2 border-red-200 border-t-0 rounded-b-lg print:rounded-b overflow-hidden">
                      {deptData.sections.map((section, sectionIndex) => (
                        <div
                          key={sectionIndex}
                          className={sectionIndex > 0 ? 'border-t-2 border-red-100' : ''}
                        >
                          {/* Elegant Section Header */}
                          <div className="bg-gradient-to-r from-red-50 to-red-100 px-4 py-3 print:px-3 print:py-2 border-l-4 border-red-600">
                            <h4 className="text-sm sm:text-base font-bold text-red-700 print:text-sm flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span>
                              {section.sectionName}
                            </h4>
                          </div>

                          {/* Checklist Items Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs print:text-[10px] border-collapse">
                              <thead>
                                <tr className="bg-red-50">
                                  <th className="border border-slate-300 px-2 py-2 print:px-1 print:py-1 text-left font-semibold text-slate-800">
                                    Checklist Item
                                  </th>
                                  <th className="border border-slate-300 px-2 py-2 print:px-1 print:py-1 text-center font-semibold text-slate-800 w-20 print:w-16">
                                    Response
                                  </th>
                                  <th className="border border-slate-300 px-2 py-2 print:px-1 print:py-1 text-center font-semibold text-slate-800 w-20 print:w-16">
                                    Status
                                  </th>
                                  <th className="border border-slate-300 px-2 py-2 print:px-1 print:py-1 text-center font-semibold text-slate-800 w-24 print:w-20">
                                    Responsibility
                                  </th>
                                  <th className="border border-slate-300 px-2 py-2 print:px-1 print:py-1 text-left font-semibold text-slate-800">
                                    Remarks
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {section.items.map((item, itemIndex) => {
                                  const responseValue = item.responseValue || item.yesNoNa || 'N/A'
                                  const status = item.status || 'OPEN'
                                  const remarks = item.remarks || '-'
                                  const responsibility = item.responsibility || '-'
                                  
                                  return (
                                    <tr
                                      key={itemIndex}
                                      className={itemIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                                    >
                                      <td className="border border-slate-300 px-2 py-2 print:px-1 print:py-1 text-slate-700">
                                        {item.checklistItemId?.label || 'N/A'}
                                      </td>
                                      <td className="border border-slate-300 px-2 py-2 print:px-1 print:py-1 text-center">
                                        <span
                                          className={`inline-block px-2 py-0.5 rounded text-[10px] print:text-[9px] font-medium ${
                                            responseValue === 'YES'
                                              ? 'bg-green-100 text-green-800'
                                              : responseValue === 'NO'
                                              ? 'bg-red-100 text-red-800'
                                              : 'bg-yellow-100 text-yellow-800'
                                          }`}
                                        >
                                          {responseValue}
                                        </span>
                                      </td>
                                      <td className="border border-slate-300 px-2 py-2 print:px-1 print:py-1 text-center">
                                        <span
                                          className={`inline-block px-2 py-0.5 rounded text-[10px] print:text-[9px] font-medium ${
                                            status === 'CLOSED'
                                              ? 'bg-green-100 text-green-800'
                                              : status === 'IN_PROGRESS'
                                              ? 'bg-yellow-100 text-yellow-800'
                                              : 'bg-red-100 text-red-800'
                                          }`}
                                        >
                                          {status.replace('_', ' ')}
                                        </span>
                                      </td>
                                      <td className="border border-slate-300 px-2 py-2 print:px-1 print:py-1 text-center text-slate-700">
                                        {responsibility}
                                      </td>
                                      <td className="border border-slate-300 px-2 py-2 print:px-1 print:py-1 text-slate-700">
                                        {remarks}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Elegant Footer */}
              <div className="mt-8 print:mt-6 pt-6 print:pt-4 border-t-2 border-red-200 text-center">
                <div className="bg-red-50 p-4 print:p-3 rounded-lg print:rounded border border-red-100">
                  <p className="text-xs print:text-[10px] text-slate-600 font-medium mb-1">
                    Generated on {new Date().toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="text-xs print:text-[10px] text-red-600 font-semibold">
                    Hospital Audit System - Medical Records Department
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

