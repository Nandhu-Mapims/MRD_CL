import React, { useState, useMemo } from 'react'

export function UserManual() {
  const [searchQuery, setSearchQuery] = useState('')

  // All manual content organized by sections
  const sections = [
    {
      id: 'login',
      title: 'Login',
      icon: '🔐',
      content: [
        { type: 'text', value: 'Enter your email and password to login. Contact admin if you forgot your password.' },
        { type: 'steps', value: ['Go to login page', 'Enter email and password', 'Click "Login"'] }
      ],
      keywords: ['login', 'password', 'email', 'sign in', 'access', 'credentials']
    },
    {
      id: 'roles',
      title: 'User Roles',
      icon: '👥',
      content: [
        { type: 'roles', value: [
          { role: 'Admin', color: 'blue', desc: 'Full system access. Manage users, departments, forms.' },
          { role: 'Auditor', color: 'green', desc: 'Submit checklists. View reports and department logs.' },
          { role: 'Chief/HOD', color: 'purple', desc: 'Review submissions. Add corrective & preventive actions.' }
        ]}
      ],
      keywords: ['role', 'admin', 'auditor', 'chief', 'hod', 'permission', 'access']
    },
    {
      id: 'submit-checklist',
      title: 'Submit Checklist (Auditor)',
      icon: '📝',
      content: [
        { type: 'steps', value: [
          'Click form name in navigation (e.g., "Audit Checklist")',
          'Enter UHID (from OP Card) and IPID (Admission ID)',
          'Enter Patient Name, Ward, Unit No',
          'Select Unit Chief from dropdown',
          'Answer YES or NO for each item',
          'Add remarks if NO is selected (mandatory)',
          'Click "Submit Checklist"'
        ]},
        { type: 'tip', value: 'Audit date and time are set automatically by the system when you submit. Uniqueness is UHID + IPID + Department + Date + Time.' },
        { type: 'warning', value: 'One submission per UHID + IPID + Department + Date + Time. Submissions are locked after submit (cannot edit).' }
      ],
      keywords: ['submit', 'checklist', 'form', 'uhid', 'ipid', 'patient', 'ward', 'unit', 'yes', 'no', 'remarks', 'auditor']
    },
    {
      id: 'chief-review',
      title: 'Review & Add Actions (Chief)',
      icon: '👔',
      content: [
        { type: 'steps', value: [
          'Open "Chief Dashboard" from navigation',
          'Click on a patient to expand submissions',
          'View checklist responses (read-only)',
          'Enter Corrective Action in the text field',
          'Enter Preventive Action in the text field',
          'Click "Save" for that row',
          'Auditor receives notification automatically'
        ]},
        { type: 'tip', value: 'Use "Apply to All" to set same actions for all submissions of a patient.' }
      ],
      keywords: ['chief', 'hod', 'review', 'corrective', 'preventive', 'action', 'dashboard']
    },
    {
      id: 'patient-report',
      title: 'Patient Report',
      icon: '📋',
      content: [
        { type: 'steps', value: [
          'Click "Patient Report" in navigation',
          'Enter UHID and click "Search"',
          'Select one audit from the list – each row shows Date, Time, and IPID (grouped by audit session)',
          'View the complete audit report for that session',
          'Use "Export to PDF" or "Print" as needed',
          'Use "Back to List" to choose another audit for the same UHID'
        ]},
        { type: 'text', value: 'Results are grouped by Date + Time + IPID, so you can open a specific audit session (e.g. morning vs afternoon audit for the same admission).' },
        { type: 'table', value: {
          headers: ['Column', 'Description'],
          rows: [
            ['Checklist Item', 'The audit question'],
            ['YES / NO', 'Auditor response'],
            ['Remarks', 'Comments (if NO)'],
            ['Corrective Action', 'Added by Chief'],
            ['Preventive Action', 'Added by Chief']
          ]
        }}
      ],
      keywords: ['report', 'patient', 'uhid', 'ipid', 'date', 'time', 'print', 'pdf', 'export']
    },
    {
      id: 'department-logs',
      title: 'Department Logs',
      icon: '📊',
      content: [
        { type: 'text', value: 'View all audit submissions for your department. When you open a patient by UHID, audits are grouped by Date + Time + IPID.' },
        { type: 'steps', value: [
          'Click "Department Logs" in navigation',
          'Expand a department and click a UHID (e.g. "UHID: 12345") to open the preview modal',
          'Select one audit from the list – each row shows Date, Time, and IPID for that audit session',
          'View checklist responses, remarks, and corrective/preventive actions for that session',
          'Use "Back to List" to pick another audit, or "Close" to exit'
        ]}
      ],
      keywords: ['department', 'logs', 'view', 'submissions', 'filter', 'preview', 'uhid', 'date', 'time', 'ipid']
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: '🔔',
      content: [
        { type: 'text', value: 'Auditors receive notifications when Chiefs add actions to their submissions.' },
        { type: 'steps', value: [
          'Bell icon shows unread count',
          'Click bell to view notifications',
          'Click notification to mark as read',
          '"Mark all read" clears all'
        ]}
      ],
      keywords: ['notification', 'bell', 'alert', 'unread', 'message']
    },
    {
      id: 'admin-departments',
      title: 'Manage Departments (Admin)',
      icon: '🏢',
      content: [
        { type: 'text', value: 'Navigate to: Configure → Departments' },
        { type: 'list', value: [
          'Create departments with name and code',
          'Edit department details',
          'Activate or deactivate departments'
        ]}
      ],
      keywords: ['admin', 'department', 'create', 'manage', 'configure']
    },
    {
      id: 'admin-users',
      title: 'Manage Users (Admin)',
      icon: '👤',
      content: [
        { type: 'text', value: 'Navigate to: Configure → Users' },
        { type: 'list', value: [
          'Create users with name, email, password',
          'Assign role: Admin, Auditor, or Chief',
          'Assign to department',
          'Reset passwords or deactivate'
        ]}
      ],
      keywords: ['admin', 'user', 'create', 'password', 'role', 'manage']
    },
    {
      id: 'admin-forms',
      title: 'Create Forms (Admin)',
      icon: '📄',
      content: [
        { type: 'text', value: 'Navigate to: Create Forms → Forms' },
        { type: 'list', value: [
          'Create form templates with name',
          'Assign to departments',
          'Add checklist items via Form Builder'
        ]},
        { type: 'text', value: 'Navigate to: Create Forms → Form Builder' },
        { type: 'list', value: [
          'Select form template',
          'Add items with labels',
          'Choose type: YES/NO or TEXT',
          'Organize into sections'
        ]}
      ],
      keywords: ['admin', 'form', 'create', 'checklist', 'builder', 'item', 'template']
    },
    {
      id: 'admin-assign',
      title: 'Assign Forms to Users (Admin)',
      icon: '📋',
      content: [
        { type: 'text', value: 'Navigate to: Configure → Assign Forms' },
        { type: 'list', value: [
          'Select a form template',
          'Choose users to assign',
          'Users see assigned forms in navigation'
        ]}
      ],
      keywords: ['admin', 'assign', 'form', 'user', 'access']
    },
    {
      id: 'audit-flow',
      title: 'Audit Flow Overview',
      icon: '🔄',
      content: [
        { type: 'text', value: 'End-to-end flow: submit checklist → system sets date/time automatically and enforces one submission per UHID + IPID + Department + Date + Time → reports and logs show audits grouped by Date + Time + IPID.' },
        { type: 'steps', value: [
          'Submit: Auditor fills form and submits; system records date and time automatically.',
          'Uniqueness: Same UHID + IPID + Department + same Date + same Time = one submission. Submit at a different time to add another audit for the same admission.',
          'Patient Report: Enter UHID → list shows one row per audit (Date, Time, IPID) → select one to view that audit’s report.',
          'Department Logs: Click UHID in logs → list shows audits by Date, Time, IPID → select one to view that audit’s checklist.'
        ]}
      ],
      keywords: ['flow', 'audit', 'submit', 'report', 'logs', 'date', 'time', 'uhid', 'ipid']
    },
    {
      id: 'uhid-ipid',
      title: 'UHID vs IPID',
      icon: '🆔',
      content: [
        { type: 'definition', value: [
          { term: 'UHID', desc: 'Unique Hospital ID - Permanent patient identifier (e.g., UHID000001)' },
          { term: 'IPID', desc: 'In-Patient ID - Unique per admission (e.g., IPID000001)' }
        ]},
        { type: 'text', value: 'A patient can have multiple IPIDs if admitted multiple times. For the same admission (IPID), you can submit multiple audit checklists; the system records date and time automatically. Each submission is identified by UHID + IPID + Department + Date + Time.' }
      ],
      keywords: ['uhid', 'ipid', 'patient', 'id', 'identifier', 'admission', 'audit', 'date', 'time']
    },
    {
      id: 'rules',
      title: 'Important Rules',
      icon: '⚠️',
      content: [
        { type: 'rules', value: [
          'One submission per UHID + IPID + Department + Date + Time (date/time are set by the system on submit; submit again at a different time for another audit)',
          'Submissions are locked after submit (cannot edit)',
          'Remarks required when selecting NO',
          'Only Chiefs can add corrective/preventive actions',
          'Chiefs cannot edit original checklist responses'
        ]}
      ],
      keywords: ['rule', 'important', 'locked', 'edit', 'duplicate', 'remarks', 'date', 'time']
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: '🔧',
      content: [
        { type: 'faq', value: [
          { q: 'Duplicate - Cannot Submit', a: 'A submission already exists for this UHID + IPID + Department for the current date and time. Wait a moment and try again, or submit another audit later.' },
          { q: 'Form not visible in navigation', a: 'Ask admin to assign the form to you.' },
          { q: 'Cannot edit submitted checklist', a: 'Submissions are locked. Contact admin if needed.' },
          { q: 'Report or Logs: which audit do I open?', a: 'List is grouped by Date + Time + IPID. Pick the row with the date and time of the audit you want to view.' },
          { q: 'Page shows error', a: 'Refresh the page. Check internet connection. Contact admin if persists.' }
        ]}
      ],
      keywords: ['error', 'problem', 'duplicate', 'cannot', 'not working', 'help', 'troubleshoot', 'date', 'time']
    }
  ]

  // Filter sections based on search
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections
    
    const query = searchQuery.toLowerCase()
    return sections.filter(section => {
      // Check title
      if (section.title.toLowerCase().includes(query)) return true
      // Check keywords
      if (section.keywords.some(kw => kw.includes(query))) return true
      // Check content
      const contentStr = JSON.stringify(section.content).toLowerCase()
      if (contentStr.includes(query)) return true
      return false
    })
  }, [searchQuery])

  // Render content based on type
  const renderContent = (item) => {
    switch (item.type) {
      case 'text':
        return <p className="text-slate-700">{item.value}</p>
      
      case 'steps':
        return (
          <ol className="space-y-2">
            {item.value.map((step, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                <span className="text-slate-700">{step}</span>
              </li>
            ))}
          </ol>
        )
      
      case 'list':
        return (
          <ul className="space-y-1 ml-4">
            {item.value.map((li, i) => (
              <li key={i} className="text-slate-700 flex gap-2">
                <span className="text-blue-500">•</span>
                {li}
              </li>
            ))}
          </ul>
        )
      
      case 'warning':
        return (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r">
            <p className="text-amber-800 text-sm"><strong>⚠️ Warning:</strong> {item.value}</p>
          </div>
        )
      
      case 'tip':
        return (
          <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-r">
            <p className="text-green-800 text-sm"><strong>💡 Tip:</strong> {item.value}</p>
          </div>
        )
      
      case 'roles':
        return (
          <div className="grid gap-3">
            {item.value.map((r, i) => (
              <div key={i} className={`p-3 rounded-lg border ${
                r.color === 'blue' ? 'bg-blue-50 border-blue-200' :
                r.color === 'green' ? 'bg-green-50 border-green-200' :
                'bg-purple-50 border-purple-200'
              }`}>
                <span className={`font-bold ${
                  r.color === 'blue' ? 'text-blue-800' :
                  r.color === 'green' ? 'text-green-800' :
                  'text-purple-800'
                }`}>{r.role}:</span>
                <span className={`ml-2 ${
                  r.color === 'blue' ? 'text-blue-700' :
                  r.color === 'green' ? 'text-green-700' :
                  'text-purple-700'
                }`}>{r.desc}</span>
              </div>
            ))}
          </div>
        )
      
      case 'table':
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded">
              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-slate-700 border-b w-12">#</th>
                  {item.value.headers.map((h, i) => (
                    <th key={i} className="text-left px-3 py-2 font-semibold text-slate-700 border-b">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {item.value.rows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="px-3 py-2 text-slate-500 font-medium">{i + 1}</td>
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2 text-slate-600">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      
      case 'definition':
        return (
          <div className="space-y-2">
            {item.value.map((d, i) => (
              <div key={i} className="bg-slate-50 p-3 rounded border border-slate-200">
                <span className="font-bold text-slate-800">{d.term}:</span>
                <span className="text-slate-600 ml-2">{d.desc}</span>
              </div>
            ))}
          </div>
        )
      
      case 'rules':
        return (
          <div className="space-y-2">
            {item.value.map((rule, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-red-500">❗</span>
                <span className="text-slate-700">{rule}</span>
              </div>
            ))}
          </div>
        )
      
      case 'faq':
        return (
          <div className="space-y-3">
            {item.value.map((f, i) => (
              <div key={i} className="bg-slate-50 p-3 rounded border border-slate-200">
                <p className="font-semibold text-slate-800">Q: {f.q}</p>
                <p className="text-slate-600 mt-1">A: {f.a}</p>
              </div>
            ))}
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-5 py-4 sm:py-5">
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">User Manual</h1>
        <p className="mt-1 text-sm text-slate-600">Hospital Audit System - Quick Reference Guide</p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200 sticky top-0 z-10">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search manual... (e.g., submit, uhid, chief, report)"
            className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-slate-700"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xl"
            >
              ✕
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-sm text-slate-500 mt-2">
            Found {filteredSections.length} result{filteredSections.length !== 1 ? 's' : ''} for "{searchQuery}"
          </p>
        )}
      </div>

      {/* Quick Links (only when not searching) */}
      {!searchQuery && (
        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
          <h2 className="font-bold text-slate-700 mb-3">Quick Links</h2>
          <div className="flex flex-wrap gap-2">
            {sections.slice(0, 8).map(section => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 rounded text-sm text-slate-700 hover:text-indigo-700 transition-colors"
              >
                {section.icon} {section.title}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Sections */}
      {filteredSections.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 border border-slate-200 text-center">
          <p className="text-slate-500 text-lg">No results found for "{searchQuery}"</p>
          <p className="text-slate-400 text-sm mt-2">Try different keywords</p>
        </div>
      ) : (
        filteredSections.map(section => (
          <div
            key={section.id}
            id={section.id}
            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
          >
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">
                {section.title}
              </h2>
            </div>
            <div className="p-4 space-y-4">
              {section.content.map((item, i) => (
                <div key={i}>{renderContent(item)}</div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Footer */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-center text-sm text-slate-500">
        Hospital Audit System • Medical Records Department • Last Updated: {new Date().toLocaleDateString('en-GB')}
      </div>
    </div>
  )
}
