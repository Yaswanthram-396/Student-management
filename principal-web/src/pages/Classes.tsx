import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, BookOpen, ChevronDown, ChevronRight, Users } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import {
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  getSections,
  createSection,
  updateSection,
  deleteSection,
} from '../api/principal'
import type { SchoolClass, Section } from '../types'

interface ClassWithSections extends SchoolClass {
  sections?: Section[]
  expanded?: boolean
  loadingSections?: boolean
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassWithSections[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Class modal
  const [classModal, setClassModal] = useState(false)
  const [classModalMode, setClassModalMode] = useState<'create' | 'edit'>('create')
  const [classForm, setClassForm] = useState({ name: '' })
  const [classFormError, setClassFormError] = useState('')
  const [classFormLoading, setClassFormLoading] = useState(false)
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null)

  // Section modal
  const [sectionModal, setSectionModal] = useState(false)
  const [sectionModalMode, setSectionModalMode] = useState<'create' | 'edit'>('create')
  const [sectionForm, setSectionForm] = useState({ name: '' })
  const [sectionFormError, setSectionFormError] = useState('')
  const [sectionFormLoading, setSectionFormLoading] = useState(false)
  const [sectionTargetClass, setSectionTargetClass] = useState<string | null>(null)
  const [editingSection, setEditingSection] = useState<Section | null>(null)

  // Delete confirmation
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'class' | 'section'; id: string; name: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchClasses = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getClasses()
      setClasses(data.map((c) => ({ ...c, expanded: false })))
    } catch (err) {
      setError('Failed to load classes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  const toggleExpand = async (classItem: ClassWithSections) => {
    const isExpanded = !classItem.expanded
    setClasses((prev) =>
      prev.map((c) =>
        c.id === classItem.id ? { ...c, expanded: isExpanded, loadingSections: isExpanded && !c.sections } : c
      )
    )
    if (isExpanded && !classItem.sections) {
      try {
        const sections = await getSections(classItem.id)
        setClasses((prev) =>
          prev.map((c) =>
            c.id === classItem.id ? { ...c, sections, loadingSections: false } : c
          )
        )
      } catch {
        setClasses((prev) =>
          prev.map((c) =>
            c.id === classItem.id ? { ...c, loadingSections: false, sections: [] } : c
          )
        )
      }
    }
  }

  const openCreateClass = () => {
    setClassModalMode('create')
    setClassForm({ name: '' })
    setClassFormError('')
    setEditingClass(null)
    setClassModal(true)
  }

  const openEditClass = (cls: SchoolClass) => {
    setClassModalMode('edit')
    setClassForm({ name: cls.name })
    setClassFormError('')
    setEditingClass(cls)
    setClassModal(true)
  }

  const handleClassSubmit = async () => {
    if (!classForm.name.trim()) {
      setClassFormError('Class name is required')
      return
    }
    setClassFormLoading(true)
    try {
      if (classModalMode === 'create') {
        await createClass({ name: classForm.name.trim() })
      } else if (editingClass) {
        await updateClass(editingClass.id, { name: classForm.name.trim() })
      }
      setClassModal(false)
      fetchClasses()
    } catch (err) {
      setClassFormError(err instanceof Error ? err.message : 'Operation failed')
    } finally {
      setClassFormLoading(false)
    }
  }

  const openCreateSection = (classId: string) => {
    setSectionModalMode('create')
    setSectionForm({ name: '' })
    setSectionFormError('')
    setSectionTargetClass(classId)
    setEditingSection(null)
    setSectionModal(true)
  }

  const openEditSection = (section: Section) => {
    setSectionModalMode('edit')
    setSectionForm({ name: section.name })
    setSectionFormError('')
    setEditingSection(section)
    setSectionTargetClass(section.academic_class.id)
    setSectionModal(true)
  }

  const handleSectionSubmit = async () => {
    if (!sectionForm.name.trim()) {
      setSectionFormError('Section name is required')
      return
    }
    setSectionFormLoading(true)
    try {
      if (sectionModalMode === 'create' && sectionTargetClass) {
        await createSection({ name: sectionForm.name.trim(), class_id: sectionTargetClass })
      } else if (editingSection) {
        await updateSection(editingSection.id, { name: sectionForm.name.trim() })
      }
      setSectionModal(false)
      // Refresh sections for the relevant class
      const targetClassId = sectionTargetClass || editingSection?.academic_class.id
      if (targetClassId) {
        const sections = await getSections(targetClassId)
        setClasses((prev) =>
          prev.map((c) => (c.id === targetClassId ? { ...c, sections } : c))
        )
      }
    } catch (err) {
      setSectionFormError(err instanceof Error ? err.message : 'Operation failed')
    } finally {
      setSectionFormLoading(false)
    }
  }

  const confirmDelete = (type: 'class' | 'section', id: string, name: string) => {
    setDeleteTarget({ type, id, name })
    setDeleteModal(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      if (deleteTarget.type === 'class') {
        await deleteClass(deleteTarget.id)
        fetchClasses()
      } else {
        await deleteSection(deleteTarget.id)
        // Find which class has this section and refresh
        const cls = classes.find((c) => c.sections?.some((s) => s.id === deleteTarget.id))
        if (cls) {
          const sections = await getSections(cls.id)
          setClasses((prev) =>
            prev.map((c) => (c.id === cls.id ? { ...c, sections } : c))
          )
        }
      }
      setDeleteModal(false)
      setDeleteTarget(null)
    } catch (err) {
      // error shown elsewhere
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" className="text-[#185FA5]" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Classes"
        subtitle="Manage your school classes and sections"
        action={
          <Button variant="primary" size="sm" leftIcon={<Plus size={16} />} onClick={openCreateClass}>
            Add Class
          </Button>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-[#FEE4E2] border border-[#D92D20]/20 rounded-lg text-sm text-[#D92D20]">
          {error}
        </div>
      )}

      {classes.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={48} />}
          title="No classes yet"
          description="Add your first class to get started managing sections and students."
          action={
            <Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreateClass}>
              Add Class
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {classes.map((cls) => (
            <div key={cls.id} className="bg-white border border-[#EAECF0] rounded-xl shadow-sm overflow-hidden">
              {/* Class header */}
              <div className="flex items-center justify-between px-5 py-4">
                <button
                  className="flex items-center gap-3 flex-1 text-left group"
                  onClick={() => toggleExpand(cls)}
                >
                  <div className="p-2 rounded-lg bg-blue-50 text-[#185FA5]">
                    <BookOpen size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#101828] group-hover:text-[#185FA5] transition-colors">
                      {cls.name}
                    </p>
                    <p className="text-xs text-[#667085]">
                      {cls.sections ? cls.sections.length : 0} section{cls.sections && cls.sections.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {cls.expanded ? (
                    <ChevronDown size={16} className="ml-2 text-[#667085]" />
                  ) : (
                    <ChevronRight size={16} className="ml-2 text-[#667085]" />
                  )}
                </button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Pencil size={14} />}
                    onClick={() => openEditClass(cls)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Trash2 size={14} />}
                    className="text-[#D92D20] hover:bg-red-50"
                    onClick={() => confirmDelete('class', cls.id, cls.name)}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {/* Sections panel */}
              {cls.expanded && (
                <div className="border-t border-[#EAECF0] bg-gray-50 px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-[#667085] uppercase tracking-wide">
                      Sections
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Plus size={14} />}
                      onClick={() => openCreateSection(cls.id)}
                    >
                      Add Section
                    </Button>
                  </div>
                  {cls.loadingSections ? (
                    <div className="flex justify-center py-6">
                      <Spinner size="sm" className="text-[#185FA5]" />
                    </div>
                  ) : cls.sections && cls.sections.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {cls.sections.map((sec) => (
                        <div
                          key={sec.id}
                          className="bg-white border border-[#EAECF0] rounded-lg p-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-[#185FA5]/10 text-[#185FA5]">
                              <Users size={14} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#101828]">{sec.name}</p>
                              {sec.class_teacher && (
                                <p className="text-xs text-[#667085]">CT: {sec.class_teacher.name}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditSection(sec)}
                              className="p-1.5 rounded-md text-[#667085] hover:bg-gray-100 hover:text-[#185FA5] transition-colors"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => confirmDelete('section', sec.id, sec.name)}
                              className="p-1.5 rounded-md text-[#667085] hover:bg-red-50 hover:text-[#D92D20] transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#667085] text-center py-4">
                      No sections yet. Add one above.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Class Modal */}
      <Modal
        open={classModal}
        onClose={() => setClassModal(false)}
        title={classModalMode === 'create' ? 'Add Class' : 'Edit Class'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setClassModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={classFormLoading} onClick={handleClassSubmit}>
              {classModalMode === 'create' ? 'Create' : 'Save'}
            </Button>
          </>
        }
      >
        <Input
          label="Class Name"
          placeholder="e.g. Class 10"
          value={classForm.name}
          onChange={(e) => setClassForm({ name: e.target.value })}
          error={classFormError}
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleClassSubmit()}
        />
      </Modal>

      {/* Section Modal */}
      <Modal
        open={sectionModal}
        onClose={() => setSectionModal(false)}
        title={sectionModalMode === 'create' ? 'Add Section' : 'Edit Section'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSectionModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={sectionFormLoading} onClick={handleSectionSubmit}>
              {sectionModalMode === 'create' ? 'Create' : 'Save'}
            </Button>
          </>
        }
      >
        <Input
          label="Section Name"
          placeholder="e.g. Section A"
          value={sectionForm.name}
          onChange={(e) => setSectionForm({ name: e.target.value })}
          error={sectionFormError}
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleSectionSubmit()}
        />
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={deleteModal}
        onClose={() => setDeleteModal(false)}
        title={`Delete ${deleteTarget?.type === 'class' ? 'Class' : 'Section'}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleteLoading} onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-[#667085]">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-[#101828]">{deleteTarget?.name}</span>? This action
          cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
