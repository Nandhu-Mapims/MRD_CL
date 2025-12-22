import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

export function SimpleFormBuilder() {
  const [departments, setDepartments] = useState([])
  const [forms, setForms] = useState([])
  const [selectedForm, setSelectedForm] = useState(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [selectedDepartments, setSelectedDepartments] = useState([])
  const [isCommon, setIsCommon] = useState(false)
  const [sections, setSections] = useState([
    { name: '', description: '', order: 1, items: [] },
  ])
  const [editingFormId, setEditingFormId] = useState(null)
  const [activeSection, setActiveSection] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [deptsData, formsData] = await Promise.all([
        apiClient.get('/departments'),
        apiClient.get('/form-templates'),
      ])
      // Show all active departments (isActive is true or undefined for new departments)
      // ANAE and NUS are now included - they can be used for common forms
      const activeDepts = deptsData.filter(
        (d) => d.isActive === true || d.isActive === undefined
      )
      console.log('Form Builder - Loaded departments:', {
        total: deptsData.length,
        active: activeDepts.length,
        filtered: deptsData.length - activeDepts.length,
        departments: deptsData.map(d => ({ name: d.name, code: d.code, isActive: d.isActive }))
      })
      setDepartments(activeDepts)
      setForms(formsData)
    } catch (err) {
      console.error('Error loading data:', err)
      alert('Error loading departments and forms. Please refresh the page.')
    }
  }

  const handleAddSection = () => {
    setSections([
      ...sections,
      { name: '', description: '', order: sections.length + 1, items: [] },
    ])
    setActiveSection(sections.length)
  }

  const handleRemoveSection = (index) => {
    if (sections.length > 1) {
      const newSections = sections.filter((_, i) => i !== index)
      newSections.forEach((sec, i) => {
        sec.order = i + 1
      })
      setSections(newSections)
      if (activeSection >= newSections.length) {
        setActiveSection(newSections.length - 1)
      }
    }
  }

  const handleUpdateSection = (index, field, value) => {
    const newSections = [...sections]
    newSections[index][field] = value
    setSections(newSections)
  }

  const handleAddItem = (sectionIndex) => {
    const newSections = [...sections]
    newSections[sectionIndex].items.push({
      label: '',
      responseType: 'YES_NO_NA',
      responseOptions: '',
      isMandatory: false,
      order: newSections[sectionIndex].items.length + 1,
    })
    setSections(newSections)
  }

  const handleRemoveItem = (sectionIndex, itemIndex) => {
    const newSections = [...sections]
    newSections[sectionIndex].items = newSections[sectionIndex].items.filter(
      (_, i) => i !== itemIndex
    )
    newSections[sectionIndex].items.forEach((item, i) => {
      item.order = i + 1
    })
    setSections(newSections)
  }

  const handleUpdateItem = (sectionIndex, itemIndex, field, value) => {
    const newSections = [...sections]
    newSections[sectionIndex].items[itemIndex][field] = value
    setSections(newSections)
  }

  const handleLoadForm = async (formId) => {
    const form = forms.find((f) => f._id === formId)
    if (!form) return

    setEditingFormId(formId)
    setFormName(form.name)
    setFormDescription(form.description || '')
    setSelectedDepartments(
      form.departments?.map((d) => (typeof d === 'object' ? d._id : d)) || []
    )
    setIsCommon(form.isCommon || false)

    const items = await apiClient.get(
      `/checklists/department/${form.departments[0]?._id || ''}?formTemplateId=${formId}`
    )

    const itemsBySection = {}
    items.forEach((item) => {
      const sectionName = item.section || 'Other'
      if (!itemsBySection[sectionName]) {
        itemsBySection[sectionName] = []
      }
      itemsBySection[sectionName].push(item)
    })

    const loadedSections = []
    if (form.sections && form.sections.length > 0) {
      form.sections
        .sort((a, b) => a.order - b.order)
        .forEach((section) => {
          loadedSections.push({
            name: section.name,
            description: section.description || '',
            order: section.order,
            items: (itemsBySection[section.name] || []).map((item) => ({
              id: item._id,
              label: item.label,
              responseType: item.responseType || 'YES_NO_NA',
              responseOptions: item.responseOptions || '',
              isMandatory: item.isMandatory,
              order: item.order,
            })),
          })
        })
    } else {
      Object.keys(itemsBySection).forEach((sectionName, idx) => {
        loadedSections.push({
          name: sectionName,
          description: '',
          order: idx + 1,
          items: itemsBySection[sectionName].map((item) => ({
            id: item._id,
            label: item.label,
            responseType: item.responseType || 'YES_NO_NA',
            responseOptions: item.responseOptions || '',
            isMandatory: item.isMandatory,
            order: item.order,
          })),
        })
      })
    }

    if (loadedSections.length === 0) {
      setSections([{ name: '', description: '', order: 1, items: [] }])
    } else {
      setSections(loadedSections)
    }
    setActiveSection(0)
  }

  const handleSaveForm = async () => {
    if (!formName.trim()) {
      alert('Please enter a form name')
      return
    }

    if (selectedDepartments.length === 0) {
      alert('Please select at least one department')
      return
    }

    for (const section of sections) {
      if (!section.name.trim()) {
        alert(`Please enter a name for section ${section.order}`)
        return
      }
      for (const item of section.items) {
        if (!item.label.trim()) {
          alert(`Please enter a label for all items in section "${section.name}"`)
          return
        }
      }
    }

    try {
      const sectionsData = sections.map((sec) => ({
        name: sec.name,
        description: sec.description,
        order: sec.order,
      }))

      let formTemplateId

      // Check if ANAE or NUS is selected - auto-suggest common form
      const selectedDeptCodes = departments
        .filter((d) => selectedDepartments.includes(d._id))
        .map((d) => d.code)
      const hasANAEorNUS = selectedDeptCodes.includes('ANAE') || selectedDeptCodes.includes('NUS')
      const shouldBeCommon = isCommon || hasANAEorNUS

      if (editingFormId) {
        await apiClient.put(`/form-templates/${editingFormId}`, {
          name: formName,
          description: formDescription,
          departmentIds: selectedDepartments,
          sections: sectionsData,
          isCommon: shouldBeCommon,
          isActive: true,
        })
        formTemplateId = editingFormId

        const oldItems = await apiClient.get(
          `/checklists/department/${selectedDepartments[0]}?formTemplateId=${editingFormId}`
        )
        for (const item of oldItems) {
          await apiClient.delete(`/checklists/${item._id}`)
        }
      } else {
        const newForm = await apiClient.post('/form-templates', {
          name: formName,
          description: formDescription,
          departmentIds: selectedDepartments,
          sections: sectionsData,
          isCommon: shouldBeCommon,
          isActive: true,
        })
        formTemplateId = newForm._id
      }

      for (const deptId of selectedDepartments) {
        for (const section of sections) {
          for (const item of section.items) {
            if (!item.id) {
              await apiClient.post('/checklists', {
                label: item.label,
                section: section.name,
                departmentScope: 'SINGLE',
                departmentId: deptId,
                formTemplateId: formTemplateId,
                responseType: item.responseType || 'YES_NO_NA',
                responseOptions: item.responseOptions || undefined,
                isActive: true,
                order: item.order,
                isMandatory: item.isMandatory,
              })
            }
          }
        }
      }

      alert(editingFormId ? 'Form updated successfully!' : 'Form created successfully!')

      setFormName('')
      setFormDescription('')
      setSelectedDepartments([])
      setIsCommon(false)
      setSections([{ name: '', description: '', order: 1, items: [] }])
      setEditingFormId(null)
      setSelectedForm(null)
      setActiveSection(0)

      loadData()
    } catch (err) {
      alert('Error saving form: ' + (err.response?.data?.message || err.message))
      console.error(err)
    }
  }

  const handleNewForm = () => {
    setFormName('')
    setFormDescription('')
    setSelectedDepartments([])
    setIsCommon(false)
    setSections([{ name: '', description: '', order: 1, items: [] }])
    setEditingFormId(null)
    setSelectedForm(null)
    setActiveSection(0)
  }

  // Auto-detect if ANAE or NUS is selected
  const selectedDeptCodes = departments
    .filter((d) => selectedDepartments.includes(d._id))
    .map((d) => d.code)
  const hasANAEorNUS = selectedDeptCodes.includes('ANAE') || selectedDeptCodes.includes('NUS')

  const totalItems = sections.reduce((sum, sec) => sum + sec.items.length, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-white">
      <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 md:space-y-6">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-white to-red-50 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 border-2 border-red-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-red-700 to-red-600 bg-clip-text text-transparent mb-1 sm:mb-2">
                Form Builder
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-slate-600 font-medium">Create and manage audit forms with sections and items</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <select
                value={selectedForm?._id || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const form = forms.find((f) => f._id === e.target.value)
                    setSelectedForm(form)
                    handleLoadForm(e.target.value)
                  } else {
                    handleNewForm()
                  }
                }}
                className="px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 border-2 border-red-300 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-slate-800 shadow-sm hover:border-red-400 transition-all"
              >
                <option value="">📝 Create New Form</option>
                {forms.map((form) => (
                  <option key={form._id} value={form._id}>
                    {form.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleNewForm}
                className="px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 bg-white border-2 border-red-300 hover:border-red-400 text-red-700 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm hover:shadow-md hover:bg-red-50"
              >
                ✨ New Form
              </button>
            </div>
          </div>

          {/* Form Info - Compact Card Layout */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 border border-red-100">
            <div className="flex items-center gap-2 mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-red-100">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="text-white text-xs sm:text-sm">📋</span>
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-800 text-xs sm:text-sm">Form Information</h3>
                <p className="text-[10px] sm:text-xs text-slate-500 hidden sm:block">Basic details and department assignment</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Form Name */}
              <div className="lg:col-span-1">
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1 sm:mb-1.5 flex items-center gap-1">
                  <span className="text-red-600">*</span>
                  Form Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all bg-white font-medium text-slate-800 hover:border-red-300"
                  placeholder="Enter form name..."
                  required
                />
              </div>

              {/* Departments */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <span className="text-red-600">*</span>
                    Assign to Departments
                  </label>
                  <button
                    type="button"
                    onClick={loadData}
                    className="text-[10px] sm:text-xs text-red-600 hover:text-red-700 font-medium underline"
                    title="Refresh departments list"
                  >
                    🔄 Refresh
                  </button>
                </div>
                {departments.length === 0 ? (
                  <div className="w-full border-2 border-dashed border-red-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-red-50 text-red-700">
                    No active departments found. Please create departments in Department Management.
                  </div>
                ) : (
                  <select
                    multiple
                    value={selectedDepartments}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, (opt) => opt.value)
                      setSelectedDepartments(values)
                    }}
                    className="w-full border border-slate-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm h-16 sm:h-20 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white hover:border-red-300 transition-all"
                    required
                  >
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                )}
                <div className="mt-1 sm:mt-1.5 flex flex-wrap items-center gap-1 sm:gap-2">
                  <span className="text-[10px] sm:text-xs text-slate-500">
                    {departments.length > 0 ? 'Hold Ctrl/Cmd to select multiple' : 'Create departments in Department Management page'}
                  </span>
                  {selectedDepartments.length > 0 && (
                    <span className="text-[10px] sm:text-xs font-semibold text-red-600 bg-red-50 px-1.5 sm:px-2 py-0.5 rounded">
                      {selectedDepartments.length} selected
                    </span>
                  )}
                  {departments.length > 0 && (
                    <span className="text-[10px] sm:text-xs text-slate-600 font-medium">
                      {departments.length} department{departments.length !== 1 ? 's' : ''} available
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mt-3 sm:mt-4">
              <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1 sm:mb-1.5 flex items-center gap-1">
                Description <span className="text-[10px] sm:text-xs font-normal text-slate-400">(Optional)</span>
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all bg-white hover:border-red-300 resize-none"
                rows="2"
                placeholder="Add a brief description..."
              />
            </div>

            {/* Common Form Option */}
            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="flex items-start gap-2 sm:gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCommon || hasANAEorNUS}
                  onChange={(e) => setIsCommon(e.target.checked)}
                  disabled={hasANAEorNUS}
                  className="mt-0.5 w-4 h-4 sm:w-5 sm:h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="text-xs sm:text-sm font-semibold text-slate-800">
                    Common Form (Accessible by All Departments)
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-600 mt-1">
                    {hasANAEorNUS ? (
                      <span className="text-blue-700 font-medium">
                        ✓ ANAE/NUS forms are automatically marked as common forms
                      </span>
                    ) : (
                      'Check this to make this form available to all departments (e.g., ANAE, NUS forms)'
                    )}
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Sections Sidebar + Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
          {/* Sections Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-xl p-3 sm:p-4 md:p-6 border border-red-100 lg:sticky lg:top-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">Sections</h3>
                <button
                  onClick={handleAddSection}
                  className="w-7 h-7 sm:w-8 sm:h-8 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center text-base sm:text-lg font-bold transition-all shadow-md hover:shadow-lg"
                >
                  +
                </button>
              </div>
              <div className="space-y-1.5 sm:space-y-2 max-h-[400px] sm:max-h-[500px] md:max-h-[600px] overflow-y-auto">
                {sections.map((section, index) => (
                  <div
                    key={index}
                    onClick={() => setActiveSection(index)}
                    className={`p-2 sm:p-3 rounded-lg sm:rounded-xl cursor-pointer transition-all ${
                      activeSection === index
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-slate-50 hover:bg-red-50 text-slate-700 border-2 border-transparent hover:border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-xs sm:text-sm truncate">
                          {section.name || `Section ${index + 1}`}
                        </div>
                        <div
                          className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 ${
                            activeSection === index ? 'text-red-100' : 'text-slate-500'
                          }`}
                        >
                          {section.items.length} item{section.items.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      {sections.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveSection(index)
                          }}
                          className="ml-2 text-red-500 hover:text-red-700 text-base sm:text-lg flex-shrink-0"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-200">
                <div className="text-[10px] sm:text-xs text-slate-600 space-y-0.5 sm:space-y-1">
                  <div className="flex justify-between">
                    <span>Total Sections:</span>
                    <span className="font-semibold">{sections.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Items:</span>
                    <span className="font-semibold">{totalItems}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {sections.length > 0 && sections[activeSection] && (
              <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 border border-red-100">
                {/* Section Header */}
                <div className="mb-4 sm:mb-5 md:mb-6 pb-3 sm:pb-4 border-b-2 border-red-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">
                        Section Name *
                      </label>
                      <input
                        type="text"
                        value={sections[activeSection].name}
                        onChange={(e) =>
                          handleUpdateSection(activeSection, 'name', e.target.value)
                        }
                        className="w-full border-2 border-slate-300 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all bg-white font-medium"
                        placeholder="e.g., ADMISSION SLIP, CONSENT"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">
                        Description
                      </label>
                      <input
                        type="text"
                        value={sections[activeSection].description}
                        onChange={(e) =>
                          handleUpdateSection(activeSection, 'description', e.target.value)
                        }
                        className="w-full border-2 border-slate-300 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all bg-white"
                        placeholder="Optional description"
                      />
                    </div>
                  </div>
                </div>

                {/* Items Section */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800">Checklist Items</h3>
                    <button
                      onClick={() => handleAddItem(activeSection)}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    >
                      <span className="text-base sm:text-lg">+</span> Add Item
                    </button>
                  </div>

                  {sections[activeSection].items.length === 0 ? (
                    <div className="text-center py-8 sm:py-10 md:py-12 bg-slate-50 rounded-lg sm:rounded-xl border-2 border-dashed border-slate-300">
                      <div className="text-2xl sm:text-3xl md:text-4xl mb-2 sm:mb-3">📝</div>
                      <p className="text-xs sm:text-sm md:text-base text-slate-600 font-medium">No items yet</p>
                      <p className="text-[10px] sm:text-xs md:text-sm text-slate-500 mt-1">
                        Click "Add Item" to create checklist items
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {sections[activeSection].items.map((item, itemIndex) => (
                        <div
                          key={itemIndex}
                          className="p-3 sm:p-4 bg-gradient-to-r from-slate-50 to-white rounded-lg sm:rounded-xl border-2 border-slate-200 hover:border-red-300 transition-all shadow-sm hover:shadow-md"
                        >
                          <div className="space-y-2 sm:space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
                              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-red-100 text-red-700 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm">
                                  {itemIndex + 1}
                                </div>
                                <input
                                  type="text"
                                  value={item.label}
                                  onChange={(e) =>
                                    handleUpdateItem(activeSection, itemIndex, 'label', e.target.value)
                                  }
                                  className="flex-1 min-w-0 border-2 border-slate-300 rounded-lg sm:rounded-xl px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all bg-white font-medium text-slate-800"
                                  placeholder="Enter checklist item label..."
                                  required
                                />
                              </div>
                              <div className="flex items-center gap-2 sm:gap-3 justify-end sm:justify-start">
                                <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={item.isMandatory}
                                    onChange={(e) =>
                                      handleUpdateItem(
                                        activeSection,
                                        itemIndex,
                                        'isMandatory',
                                        e.target.checked
                                      )
                                    }
                                    className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 border-slate-300 rounded focus:ring-red-500"
                                  />
                                  <span className="text-xs sm:text-sm font-medium text-slate-700">
                                    Mandatory
                                  </span>
                                </label>
                                <button
                                  onClick={() => handleRemoveItem(activeSection, itemIndex)}
                                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all text-lg sm:text-xl"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                            {/* Response Type Selection */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                              <div>
                                <label className="block text-[10px] sm:text-xs font-medium text-slate-700 mb-1">
                                  Response Type
                                </label>
                                <select
                                  value={item.responseType || 'YES_NO_NA'}
                                  onChange={(e) =>
                                    handleUpdateItem(activeSection, itemIndex, 'responseType', e.target.value)
                                  }
                                  className="w-full border border-slate-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                                >
                                  <option value="YES_NO">Yes/No</option>
                                  <option value="YES_NO_NA">Yes/No/NA</option>
                                  <option value="CHECKBOX">Checkbox</option>
                                  <option value="TEXT">Text Box</option>
                                  <option value="NUMBER">Number</option>
                                  <option value="DATE">Date</option>
                                  <option value="TIME">Time</option>
                                  <option value="DROPDOWN">Dropdown</option>
                                </select>
                              </div>
                              {(item.responseType === 'DROPDOWN') && (
                                <div>
                                  <label className="block text-[10px] sm:text-xs font-medium text-slate-700 mb-1">
                                    Options (comma-separated)
                                  </label>
                                  <input
                                    type="text"
                                    value={item.responseOptions || ''}
                                    onChange={(e) =>
                                      handleUpdateItem(activeSection, itemIndex, 'responseOptions', e.target.value)
                                    }
                                    className="w-full border border-slate-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                                    placeholder="Option1, Option2, Option3"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-xl p-4 sm:p-5 md:p-6 border border-red-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="text-xs sm:text-sm text-slate-600">
              <span className="font-semibold text-slate-800">{sections.length}</span> sections •{' '}
              <span className="font-semibold text-slate-800">{totalItems}</span> items
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={handleNewForm}
                className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all shadow-sm"
              >
                Clear All
              </button>
              <button
                onClick={handleSaveForm}
                className="px-6 sm:px-7 md:px-8 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-red-600 via-red-700 to-red-800 hover:from-red-700 hover:via-red-800 hover:to-red-900 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm md:text-base font-bold transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {editingFormId ? '💾 Update Form' : '✨ Create Form'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
