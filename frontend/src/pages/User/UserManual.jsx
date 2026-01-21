import React from 'react'

export function UserManual() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">📖 User Manual</h1>
        <p className="text-blue-100">Complete guide to using the Hospital Audit System</p>
      </div>

      {/* Table of Contents */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>📑</span> Table of Contents
        </h2>
        <ul className="space-y-2 text-slate-700">
          <li><a href="#getting-started" className="text-blue-600 hover:underline">1. Getting Started</a></li>
          <li><a href="#login" className="text-blue-600 hover:underline">2. Login</a></li>
          <li><a href="#navigation" className="text-blue-600 hover:underline">3. Navigation</a></li>
          <li><a href="#filling-forms" className="text-blue-600 hover:underline">4. Filling Audit Forms</a></li>
          <li><a href="#viewing-reports" className="text-blue-600 hover:underline">5. Viewing Reports</a></li>
          <li><a href="#department-logs" className="text-blue-600 hover:underline">6. Department Logs</a></li>
          <li><a href="#faq" className="text-blue-600 hover:underline">7. Frequently Asked Questions</a></li>
        </ul>
      </div>

      {/* Getting Started */}
      <section id="getting-started" className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>🚀</span> 1. Getting Started
        </h2>
        <div className="space-y-4 text-slate-700">
          <p>
            Welcome to the Hospital Audit System! This system helps you manage and track audit checklists 
            for patient admissions across different departments in the hospital.
          </p>
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p className="font-semibold text-blue-800 mb-2">What you can do:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Fill out audit checklist forms for patient admissions</li>
              <li>View patient reports and audit submissions</li>
              <li>Check department logs and submission history</li>
              <li>Track compliance and audit status</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Login */}
      <section id="login" className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>🔐</span> 2. Login
        </h2>
        <div className="space-y-4 text-slate-700">
          <p>To access the system, you need to log in with your credentials:</p>
          <ol className="list-decimal list-inside space-y-3 ml-2">
            <li>
              <strong>Navigate to the login page</strong> - If you're not logged in, you'll be automatically redirected to the login page.
            </li>
            <li>
              <strong>Enter your credentials:</strong>
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li><strong>Email:</strong> Your registered email address</li>
                <li><strong>Password:</strong> Your account password</li>
              </ul>
            </li>
            <li>
              <strong>Click "Login"</strong> to access the system.
            </li>
          </ol>
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
            <p className="font-semibold text-amber-800">⚠️ Important:</p>
            <p className="text-amber-700">If you forget your password or have login issues, please contact your system administrator.</p>
          </div>
        </div>
      </section>

      {/* Navigation */}
      <section id="navigation" className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>🧭</span> 3. Navigation
        </h2>
        <div className="space-y-4 text-slate-700">
          <p>The main navigation bar is located at the top of the screen. Here's what each menu item does:</p>
          
          <div className="space-y-3">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                <span>📝</span> Form Links
              </h3>
              <p>These are the audit checklist forms assigned to your department. Click on any form to fill it out for a patient admission.</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                <span>📋</span> Patient Report
              </h3>
              <p>View comprehensive audit reports for any patient by entering their UHID (Unique Hospital ID).</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                <span>📊</span> Department Logs
              </h3>
              <p>View all audit submissions for your department, filter by UHID, and preview submission details.</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                <span>👤</span> User Profile
              </h3>
              <p>Your name and role are displayed in the top right corner. Click "Logout" to securely exit the system.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Filling Forms */}
      <section id="filling-forms" className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>✍️</span> 4. Filling Audit Forms
        </h2>
        <div className="space-y-4 text-slate-700">
          <p>To fill out an audit checklist form for a patient admission:</p>
          
          <ol className="list-decimal list-inside space-y-3 ml-2">
            <li>
              <strong>Select a form</strong> from the navigation menu (e.g., "General Medicine - Audit Checklist").
            </li>
            <li>
              <strong>Enter Patient Information:</strong>
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li><strong>UHID:</strong> The patient's Unique Hospital ID (e.g., UHID000001)</li>
                <li><strong>IPID:</strong> The In-Patient ID for this specific admission (e.g., IPID000001)</li>
                <li><strong>Ward:</strong> The ward where the patient is admitted</li>
                <li><strong>Unit No:</strong> The unit number</li>
              </ul>
            </li>
            <li>
              <strong>Fill out the checklist items:</strong>
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li><strong>Yes/No Questions:</strong> Select "Yes" or "No" for each question</li>
                <li><strong>Multi-Select Questions:</strong> Select one or more options from the dropdown</li>
                <li><strong>Text Box Questions:</strong> Enter detailed text about the patient's condition or observations</li>
              </ul>
            </li>
            <li>
              <strong>Add Remarks (if applicable):</strong> For Yes/No and Multi-Select questions, you can add remarks in the "Remarks" field.
            </li>
            <li>
              <strong>Assign Responsibility (if applicable):</strong> Specify who is responsible for each item.
            </li>
            <li>
              <strong>Review your entries</strong> before submitting.
            </li>
            <li>
              <strong>Click "Submit"</strong> to save your audit submission.
            </li>
          </ol>

          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <p className="font-semibold text-green-800 mb-2">✅ Important Notes:</p>
            <ul className="list-disc list-inside space-y-1 text-green-700">
              <li>All mandatory fields must be filled before submission</li>
              <li>You can only submit <strong>one audit form per UHID, IPID, and Department combination</strong></li>
              <li>If a duplicate submission is detected, the form will be disabled and you'll see an error message</li>
              <li>Text box questions don't require Remarks or Responsibility fields</li>
            </ul>
          </div>

          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <p className="font-semibold text-red-800 mb-2">❌ Error Handling:</p>
            <ul className="list-disc list-inside space-y-1 text-red-700">
              <li>If you see "Duplicate - Cannot Submit", it means a submission already exists for this UHID, IPID, and Department</li>
              <li>If fields turn red, check that all required information is entered correctly</li>
              <li>Network errors will be displayed at the top of the form</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Viewing Reports */}
      <section id="viewing-reports" className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>📋</span> 5. Viewing Patient Reports
        </h2>
        <div className="space-y-4 text-slate-700">
          <p>To generate and view a patient audit report:</p>
          
          <ol className="list-decimal list-inside space-y-3 ml-2">
            <li>
              <strong>Click "Patient Report"</strong> in the navigation menu.
            </li>
            <li>
              <strong>Enter the UHID</strong> of the patient in the search field (e.g., UHID000001).
            </li>
            <li>
              <strong>Click "Search"</strong> to find all admissions for that patient.
            </li>
            <li>
              <strong>Select an IPID</strong> from the list of admissions displayed.
            </li>
            <li>
              <strong>View the report</strong> which includes:
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>Patient information (UHID, IPID, Patient Name, Department Name)</li>
                <li>All audit checklist items organized by department</li>
                <li>Responses, remarks, and responsibilities</li>
                <li>Submission dates and user information</li>
              </ul>
            </li>
            <li>
              <strong>Optional: Add Consultant Name</strong> before printing or exporting.
            </li>
            <li>
              <strong>Print or Export PDF:</strong>
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>Click "Print Report" to print the report</li>
                <li>Click "Export as PDF" to download a PDF version</li>
              </ul>
            </li>
          </ol>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p className="font-semibold text-blue-800 mb-2">💡 Tips:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Reports are organized by department, making it easy to see which departments have completed their audits</li>
              <li>You can see all submissions for a patient across multiple departments</li>
              <li>The report includes both active and discharged admissions</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Department Logs */}
      <section id="department-logs" className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>📊</span> 6. Department Logs
        </h2>
        <div className="space-y-4 text-slate-700">
          <p>Department Logs allow you to view all audit submissions for your department:</p>
          
          <ol className="list-decimal list-inside space-y-3 ml-2">
            <li>
              <strong>Click "Department Logs"</strong> in the navigation menu.
            </li>
            <li>
              <strong>View all submissions</strong> - You'll see a table listing all audit submissions for your department.
            </li>
            <li>
              <strong>Filter by UHID (optional):</strong>
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>Enter a UHID in the search field</li>
                <li>Click "Search" to filter submissions for that patient</li>
                <li>Click "Clear" to reset the filter</li>
              </ul>
            </li>
            <li>
              <strong>Preview a submission:</strong>
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>Click the "Preview" button next to any submission</li>
                <li>A modal will open showing all checklist items for that submission</li>
                <li>You can see responses, remarks, and responsibilities</li>
                <li>Click "Close" or outside the modal to return to the list</li>
              </ul>
            </li>
            <li>
              <strong>View submission details:</strong>
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>UHID and IPID</li>
                <li>Submission date and time</li>
                <li>Submitted by (user name)</li>
                <li>All checklist items with their responses</li>
              </ul>
            </li>
          </ol>

          <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
            <p className="font-semibold text-purple-800 mb-2">📈 Use Cases:</p>
            <ul className="list-disc list-inside space-y-1 text-purple-700">
              <li>Track which patients have completed audits</li>
              <li>Review submission history for quality assurance</li>
              <li>Find specific submissions quickly using UHID filter</li>
              <li>Verify compliance and completion status</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>❓</span> 7. Frequently Asked Questions
        </h2>
        <div className="space-y-6 text-slate-700">
          
          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-bold text-slate-800 mb-2">Q: Can I edit a submission after submitting it?</h3>
            <p className="text-slate-600">A: No, once a submission is made for a specific UHID, IPID, and Department combination, it cannot be edited. This ensures data integrity and audit trail accuracy.</p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-bold text-slate-800 mb-2">Q: What if I make a mistake in my submission?</h3>
            <p className="text-slate-600">A: If you need to correct a submission, please contact your system administrator who can help resolve the issue.</p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-bold text-slate-800 mb-2">Q: Why can't I see certain forms in my navigation menu?</h3>
            <p className="text-slate-600">A: Forms are assigned to specific departments. You'll only see forms that are assigned to your department. Some common forms (like ANAE and NUS) are visible to all users.</p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-bold text-slate-800 mb-2">Q: What's the difference between UHID and IPID?</h3>
            <p className="text-slate-600">A: UHID (Unique Hospital ID) is a permanent identifier for a patient. IPID (In-Patient ID) is a unique identifier for each admission. A patient can have multiple IPIDs if they are admitted multiple times.</p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-bold text-slate-800 mb-2">Q: Can I submit multiple forms for the same patient?</h3>
            <p className="text-slate-600">A: Yes, you can submit different forms (from different departments) for the same patient. However, you can only submit one form per department for each UHID-IPID combination.</p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-bold text-slate-800 mb-2">Q: How do I print a report?</h3>
            <p className="text-slate-600">A: After generating a patient report, click the "Print Report" button. The report will be formatted for printing. You can also use your browser's print function (Ctrl+P or Cmd+P).</p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-bold text-slate-800 mb-2">Q: What should I do if the system shows an error?</h3>
            <p className="text-slate-600">A: First, check your internet connection. If the error persists, note the error message and contact your system administrator with the details.</p>
          </div>

        </div>
      </section>

      {/* Support Section */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg shadow-md p-6 border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-3 flex items-center gap-2">
          <span>💬</span> Need More Help?
        </h2>
        <p className="text-slate-700 mb-4">
          If you have additional questions or need technical support, please contact your system administrator or the IT department.
        </p>
        <div className="bg-white p-4 rounded border border-slate-200">
          <p className="text-sm text-slate-600">
            <strong>System Version:</strong> Hospital Audit System v1.0<br />
            <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-GB', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </p>
        </div>
      </div>

      {/* Back to Top */}
      <div className="text-center py-4">
        <a 
          href="#getting-started" 
          className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-2"
        >
          <span>⬆️</span> Back to Top
        </a>
      </div>
    </div>
  )
}
