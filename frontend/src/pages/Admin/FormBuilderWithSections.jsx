import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

export function FormBuilderWithSections() {
  const [forms, setForms] = useState([])
  const [departments, setDepartments] = useState([])
  const [selectedForm, setSelectedForm] = useState(null)
  const [checklistItems, setChecklistItems] = useState([])
  const [showFormModal, setShowFormModal] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)
  const [showSectionModal, setShowSectionModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [editingForm, setEditingForm] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    departmentIds: [],
    isCommon: false,
    sections: [],
  })
  const [itemData, setItemData] = useState({
    label: '',
    section: '',
    departmentScope: 'SINGLE',
    departmentId: '',
    formTemplateId: '',
    isMandatory: false,
    order: 0,
  })
  const [sectionData, setSectionData] = useState({
    name: '',
    description: '',
    order: 0,
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedForm) {
      loadChecklistItems()
    }
  }, [selectedForm])

  const loadData = async () => {
    const [formsData, deptsData] = await Promise.all([
      apiClient.get('/form-templates'),
      apiClient.get('/departments'),
    ])
    setForms(formsData)
    setDepartments(deptsData)
  }

  const loadChecklistItems = async () => {
    if (!selectedForm) return
    try {
      const items = await apiClient.get(
        `/checklists/department/${selectedForm.departments[0]?._id || ''}?formTemplateId=${selectedForm._id}`
      )
      setChecklistItems(items)
    } catch (err) {
      console.error('Error loading checklist items', err)
      setChecklistItems([])
    }
  }

  const handleCreateForm = async (e) => {
    e.preventDefault()
    try {
      await apiClient.post('/form-templates', formData)
      setShowFormModal(false)
      setFormData({
        name: '',
        description: '',
        departmentIds: [],
        isCommon: false,
        sections: [],
      })
      loadData()
    } catch (err) {
      alert('Error creating form')
      console.error(err)
    }
  }

  const handleEdit = (form) => {
    setEditingForm(form)
    setFormData({
      name: form.name,
      description: form.description || '',
      departmentIds: form.departments?.map((d) => (typeof d === 'object' ? d._id : d)) || [],
      isCommon: form.isCommon || false,
      sections: form.sections || [],
    })
    setShowFormModal(true)
  }

  const handleUpdateForm = async (e) => {
    e.preventDefault()
    try {
      await apiClient.put(`/form-templates/${editingForm._id}`, formData)
      setShowFormModal(false)
      setEditingForm(null)
      setFormData({
        name: '',
        description: '',
        departmentIds: [],
        isCommon: false,
        sections: [],
      })
      loadData()
      if (selectedForm?._id === editingForm._id) {
        const updated = await apiClient.get(`/form-templates/${editingForm._id}`)
        setSelectedForm(updated)
      }
    } catch (err) {
      alert('Error updating form')
      console.error(err)
    }
  }

  const handleAddSection = async (e) => {
    e.preventDefault()
    if (!selectedForm) return
    try {
      const updatedSections = [...(selectedForm.sections || []), sectionData]
      await apiClient.put(`/form-templates/${selectedForm._id}`, {
        ...selectedForm,
        sections: updatedSections,
      })
      setShowSectionModal(false)
      setSectionData({ name: '', description: '', order: 0 })
      loadData()
      const updated = await apiClient.get(`/form-templates/${selectedForm._id}`)
      setSelectedForm(updated)
    } catch (err) {
      alert('Error adding section')
      console.error(err)
    }
  }

  const handleCreateItem = async (e) => {
    e.preventDefault()
    try {
      await apiClient.post('/checklists', {
        ...itemData,
        formTemplateId: selectedForm._id,
      })
      setShowItemModal(false)
      setItemData({
        label: '',
        section: '',
        departmentScope: 'SINGLE',
        departmentId: '',
        formTemplateId: '',
        isMandatory: false,
        order: 0,
      })
      loadChecklistItems()
    } catch (err) {
      alert('Error creating checklist item')
      console.error(err)
    }
  }

  const handleEditItem = (item) => {
    setEditingItem(item)
    setItemData({
      label: item.label,
      section: item.section || '',
      departmentScope: item.departmentScope,
      departmentId: item.department?._id || '',
      formTemplateId: item.formTemplate?._id || '',
      isMandatory: item.isMandatory,
      order: item.order,
    })
    setShowItemModal(true)
  }

  const handleUpdateItem = async (e) => {
    e.preventDefault()
    try {
      await apiClient.put(`/checklists/${editingItem._id}`, {
        ...itemData,
        formTemplateId: selectedForm._id,
      })
      setShowItemModal(false)
      setEditingItem(null)
      setItemData({
        label: '',
        section: '',
        departmentScope: 'SINGLE',
        departmentId: '',
        formTemplateId: '',
        isMandatory: false,
        order: 0,
      })
      loadChecklistItems()
    } catch (err) {
      alert('Error updating checklist item')
      console.error(err)
    }
  }

  const handleDeleteItem = async (id) => {
    if (!confirm('Delete this checklist item?')) return
    try {
      await apiClient.delete(`/checklists/${id}`)
      loadChecklistItems()
    } catch (err) {
      alert('Error deleting item')
    }
  }

  // Group items by section
  const itemsBySection = checklistItems.reduce((acc, item) => {
    const section = item.section || 'Other'
    if (!acc[section]) acc[section] = []
    acc[section].push(item)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Form Builder with Sections</h2>
          <p className="text-slate-600 mt-1">
            Create forms with sections and add checklist items to each section
          </p>
        </div>
        <button
          onClick={() => {
            setEditingForm(null)
            setFormData({
              name: '',
              description: '',
              departmentIds: [],
              isCommon: false,
              sections: [],
            })
            setShowFormModal(true)
            setSelectedForm(null)
          }}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-md transition-colors"
        >
          + Create New Form
        </button>
      </div>

      {/* Form Selection */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Select Form to Edit:
        </label>
        <select
          value={selectedForm?._id || ''}
          onChange={(e) => {
            const form = forms.find((f) => f._id === e.target.value)
            setSelectedForm(form)
          }}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500"
        >
          <option value="">-- Select a form --</option>
          {forms.map((form) => (
            <option key={form._id} value={form._id}>
              {form.name} {form.isCommon ? '(Common)' : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedForm && (
        <div className="space-y-4">
          {/* Form Info */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-1">{selectedForm.name}</h3>
                <p className="text-sm text-slate-600">{selectedForm.description}</p>
              </div>
              <button
                onClick={() => {
                  const form = forms.find((f) => f._id === selectedForm._id)
                  if (form) {
                    setEditingForm(form)
                    setFormData({
                      name: form.name,
                      description: form.description || '',
                      departmentIds: form.departments?.map((d) => (typeof d === 'object' ? d._id : d)) || [],
                      isCommon: form.isCommon || false,
                      sections: form.sections || [],
                    })
                    setShowFormModal(true)
                  }
                }}
                className="text-sm text-red-600 hover:text-red-700 px-3 py-1.5 rounded hover:bg-red-50"
              >
                Edit Form Details
              </button>
            </div>
            
            {/* Assigned Departments */}
            <div className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Assigned Departments:</span>
                <select
                  onChange={async (e) => {
                    if (e.target.value) {
                      const form = forms.find((f) => f._id === selectedForm._id)
                      if (!form) return
                      const currentDepts = form.departments?.map((d) => (typeof d === 'object' ? d._id : d)) || []
                      if (!currentDepts.includes(e.target.value)) {
                        await apiClient.put(`/form-templates/${selectedForm._id}`, {
                          ...form,
                          departmentIds: [...currentDepts, e.target.value],
                        })
                        loadData()
                        const updated = await apiClient.get(`/form-templates/${selectedForm._id}`)
                        setSelectedForm(updated)
                      }
                      e.target.value = ''
                    }
                  }}
                  className="text-xs border border-slate-300 rounded px-2 py-1"
                >
                  <option value="">+ Quick Assign Department</option>
                  {departments
                    .filter((d) => {
                      const formDepts = selectedForm.departments?.map((d) => (typeof d === 'object' ? d._id : d)) || []
                      return d.code !== 'ANAE' && d.code !== 'NUS' && !formDepts.includes(d._id)
                    })
                    .map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                </select>
              </div>
              {selectedForm.departments && selectedForm.departments.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedForm.departments.map((dept) => {
                    const deptObj = typeof dept === 'object' ? dept : departments.find((d) => d._id === dept)
                    if (!deptObj) return null
                    return (
                      <span
                        key={deptObj._id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium"
                      >
                        {deptObj.name} ({deptObj.code})
                        <button
                          onClick={async () => {
                            const form = forms.find((f) => f._id === selectedForm._id)
                            if (!form) return
                            const updatedDepts = form.departments
                              ?.map((d) => (typeof d === 'object' ? d._id : d))
                              .filter((id) => id !== deptObj._id) || []
                            await apiClient.put(`/form-templates/${selectedForm._id}`, {
                              ...form,
                              departmentIds: updatedDepts,
                            })
                            loadData()
                            const updated = await apiClient.get(`/form-templates/${selectedForm._id}`)
                            setSelectedForm(updated)
                          }}
                          className="ml-1 hover:text-red-600 transition-colors"
                          title="Remove from this department"
                        >
                          ×
                        </button>
                      </span>
                    )
                  })}
                </div>
              ) : (
                <span className="text-sm text-red-600 font-medium">⚠️ No departments assigned</span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowSectionModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm"
              >
                + Add Section
              </button>
            </div>
          </div>

          {/* Sections List */}
          {selectedForm.sections && selectedForm.sections.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-4">
              <h4 className="font-semibold text-slate-800 mb-3">Form Sections:</h4>
              <div className="space-y-2">
                {selectedForm.sections
                  .sort((a, b) => a.order - b.order)
                  .map((section, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-slate-50 rounded"
                    >
                      <div>
                        <span className="font-medium text-slate-800">{section.name}</span>
                        {section.description && (
                          <span className="text-sm text-slate-600 ml-2">- {section.description}</span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">Order: {section.order}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Checklist Items by Section */}
          <div className="space-y-4">
            {Object.keys(itemsBySection).length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center text-slate-500">
                No checklist items yet. Click "Add Checklist Item" to get started.
              </div>
            ) : (
              Object.keys(itemsBySection)
                .sort()
                .map((sectionName) => (
                  <div key={sectionName} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3">
                      <h4 className="font-semibold text-lg">{sectionName}</h4>
                    </div>
                    <div className="divide-y divide-slate-200">
                      {itemsBySection[sectionName]
                        .sort((a, b) => a.order - b.order)
                        .map((item) => (
                          <div key={item._id} className="p-4 hover:bg-slate-50">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-slate-800">{item.label}</span>
                                  {item.isMandatory && (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                                      Mandatory
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                  Scope: {item.departmentScope === 'ALL' ? 'All departments' : 'Single'}
                                  {item.departmentScope === 'SINGLE' && item.department && (
                                    <span> - {item.department.name}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditItem(item)}
                                  className="text-red-600 hover:text-red-700 text-sm px-2 py-1 rounded"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item._id)}
                                  className="text-red-600 hover:text-red-700 text-sm px-2 py-1 rounded"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))
            )}
          </div>

          {/* Add Item Button */}
          <button
            onClick={() => {
              setEditingItem(null)
              setItemData({
                label: '',
                section: '',
                departmentScope: 'SINGLE',
                departmentId: selectedForm.departments[0]?._id || '',
                formTemplateId: selectedForm._id,
                isMandatory: false,
                order: checklistItems.length + 1,
              })
              setShowItemModal(true)
            }}
            className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg shadow-md transition-colors"
          >
            + Add Checklist Item to Form
          </button>
        </div>
      )}

      {/* Create Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingForm ? 'Edit Form' : 'Create New Form'}
            </h3>
            <form onSubmit={editingForm ? handleUpdateForm : handleCreateForm} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Form Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="e.g., MAPIMS - Case Sheet Audit Checklist"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Assign to Departments
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-3">
                  {departments.map((dept) => (
                    <label key={dept._id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.departmentIds.includes(dept._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              departmentIds: [...formData.departmentIds, dept._id],
                            })
                          } else {
                            setFormData({
                              ...formData,
                              departmentIds: formData.departmentIds.filter((id) => id !== dept._id),
                            })
                          }
                        }}
                        className="w-4 h-4 text-red-600"
                      />
                      <span className="text-sm">{dept.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
                >
                  {editingForm ? 'Update' : 'Create'} Form
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowFormModal(false)
                    setEditingForm(null)
                    setFormData({
                      name: '',
                      description: '',
                      departmentIds: [],
                      isCommon: false,
                      sections: [],
                    })
                  }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Section Modal */}
      {showSectionModal && selectedForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Section to Form</h3>
            <form onSubmit={handleAddSection} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Section Name *</label>
                <input
                  type="text"
                  required
                  value={sectionData.name}
                  onChange={(e) => setSectionData({ ...sectionData, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="e.g., ADMISSION SLIP, CONSENT, OT"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={sectionData.description}
                  onChange={(e) => setSectionData({ ...sectionData, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Order</label>
                <input
                  type="number"
                  value={sectionData.order}
                  onChange={(e) =>
                    setSectionData({ ...sectionData, order: parseInt(e.target.value) || 0 })
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
                >
                  Add Section
                </button>
                <button
                  type="button"
                  onClick={() => setShowSectionModal(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Item Modal */}
      {showItemModal && selectedForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingItem ? 'Edit Checklist Item' : 'Add Checklist Item'}
            </h3>
            <form onSubmit={editingItem ? handleUpdateItem : handleCreateItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Item Label *</label>
                <input
                  type="text"
                  required
                  value={itemData.label}
                  onChange={(e) => setItemData({ ...itemData, label: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="e.g., PATIENT NAME, DATE OF ADMISSION"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Section * (Select from form sections)
                </label>
                <select
                  required
                  value={itemData.section}
                  onChange={(e) => setItemData({ ...itemData, section: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="">-- Select Section --</option>
                  {selectedForm.sections
                    ?.sort((a, b) => a.order - b.order)
                    .map((section, idx) => (
                      <option key={idx} value={section.name}>
                        {section.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department Scope</label>
                <select
                  value={itemData.departmentScope}
                  onChange={(e) => setItemData({ ...itemData, departmentScope: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="SINGLE">Single Department</option>
                  <option value="ALL">All Departments (Common)</option>
                </select>
              </div>
              {itemData.departmentScope === 'SINGLE' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  <select
                    value={itemData.departmentId}
                    onChange={(e) => setItemData({ ...itemData, departmentId: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isMandatory"
                  checked={itemData.isMandatory}
                  onChange={(e) => setItemData({ ...itemData, isMandatory: e.target.checked })}
                  className="w-4 h-4 text-red-600"
                />
                <label htmlFor="isMandatory" className="text-sm text-slate-700">
                  Mandatory
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Order</label>
                <input
                  type="number"
                  value={itemData.order}
                  onChange={(e) =>
                    setItemData({ ...itemData, order: parseInt(e.target.value) || 0 })
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
                >
                  {editingItem ? 'Update' : 'Create'} Item
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowItemModal(false)
                    setEditingItem(null)
                  }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

