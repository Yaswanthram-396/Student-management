import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Users, Upload, CheckSquare } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Modal } from '../components/ui/Modal'
import { Table, TableColumn } from '../components/ui/Table'
import { Badge } from '../components/ui/Badge'
import { SearchInput } from '../components/ui/SearchInput'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'
import {
  getTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  bulkUploadTeachers,
  getSubjects,
  getAllSections,
  getTeacherAssignedSections,
  assignTeacherSections,
  CreateTeacherData,
} from '../api/principal'
import type { Teacher, Subject, Section } from '../types'

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [filterSection, setFilterSection] = useState('')

  // Teacher modal
  const [teacherModal, setTeacherModal] = useState(false)
  const [teacherModalMode, setTeacherModalMode] = useState<'create' | 'edit'>('create')
  const [teacherForm, setTeacherForm] = useState<CreateTeacherData & { id?: number }>({
    name: '',
    email: '',
    phone: '',
    password: '',
  })
  const [teacherFormErrors, setTeacherFormErrors] = useState<Record<string, string>>({})
  const [teacherFormLoading, setTeacherFormLoading] = useState(false)

  // Assign sections modal
  const [assignModal, setAssignModal] = useState(false)
  const [assignTeacher, setAssignTeacher] = useState<Teacher | null>(null)
  const [assignedSectionIds, setAssignedSectionIds] = useState<number[]>([])
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignSaving, setAssignSaving] = useState(false)

  // Delete modal
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Bulk upload
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false)
  const [bulkUploadMsg, setBulkUploadMsg] = useState('')

  const fetchTeachers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [teacherData, subjectData, sectionData] = await Promise.allSettled([
        getTeachers({
          search: search || undefined,
          subject_id: filterSubject ? Number(filterSubject) : undefined,
          section_id: filterSection ? Number(filterSection) : undefined,
        }),
        getSubjects(),
        getAllSections(),
      ])
      if (teacherData.status === 'fulfilled') setTeachers(teacherData.value)
      if (subjectData.status === 'fulfilled') setSubjects(subjectData.value)
      if (sectionData.status === 'fulfilled') setSections(sectionData.value)
      if (teacherData.status === 'rejected') setError('Failed to load teachers')
    } finally {
      setLoading(false)
    }
  }, [search, filterSubject, filterSection])

  useEffect(() => {
    const timer = setTimeout(fetchTeachers, 300)
    return () => clearTimeout(timer)
  }, [fetchTeachers])

  const openCreateTeacher = () => {
    setTeacherModalMode('create')
    setTeacherForm({ name: '', email: '', phone: '', password: '' })
    setTeacherFormErrors({})
    setTeacherModal(true)
  }

  const openEditTeacher = (t: Teacher) => {
    setTeacherModalMode('edit')
    setTeacherForm({
      id: t.id,
      name: t.name,
      email: t.user?.email || t.email || '',
      phone: t.phone || '',
    })
    setTeacherFormErrors({})
    setTeacherModal(true)
  }

  const validateTeacherForm = () => {
    const errors: Record<string, string> = {}
    if (!teacherForm.name.trim()) errors.name = 'Name is required'
    if (teacherModalMode === 'create' && !teacherForm.password)
      errors.password = 'Password is required for new teacher'
    setTeacherFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleTeacherSubmit = async () => {
    if (!validateTeacherForm()) return
    setTeacherFormLoading(true)
    try {
      const payload: CreateTeacherData = {
        name: teacherForm.name.trim(),
        email: teacherForm.email || undefined,
        phone: teacherForm.phone || undefined,
        password: teacherForm.password || undefined,
      }
      if (teacherModalMode === 'create') {
        await createTeacher(payload)
      } else if (teacherForm.id) {
        await updateTeacher(teacherForm.id, payload)
      }
      setTeacherModal(false)
      fetchTeachers()
    } catch (err) {
      setTeacherFormErrors({ form: err instanceof Error ? err.message : 'Operation failed' })
    } finally {
      setTeacherFormLoading(false)
    }
  }

  const openAssignSections = async (teacher: Teacher) => {
    setAssignTeacher(teacher)
    setAssignLoading(true)
    setAssignModal(true)
    try {
      const data = await getTeacherAssignedSections(teacher.id)
      setAssignedSectionIds(data.sections?.map((s) => s.id) || [])
    } catch {
      setAssignedSectionIds([])
    } finally {
      setAssignLoading(false)
    }
  }

  const handleAssignSave = async () => {
    if (!assignTeacher) return
    setAssignSaving(true)
    try {
      await assignTeacherSections(assignTeacher.id, { section_ids: assignedSectionIds })
      setAssignModal(false)
      fetchTeachers()
    } catch (err) {
      // stay open
    } finally {
      setAssignSaving(false)
    }
  }

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBulkUploadLoading(true)
    setBulkUploadMsg('')
    try {
      await bulkUploadTeachers(file)
      setBulkUploadMsg('Bulk upload successful!')
      fetchTeachers()
    } catch (err) {
      setBulkUploadMsg(err instanceof Error ? err.message : 'Bulk upload failed')
    } finally {
      setBulkUploadLoading(false)
      e.target.value = ''
    }
  }

  const confirmDelete = (teacher: Teacher) => {
    setDeleteTarget(teacher)
    setDeleteModal(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await deleteTeacher(deleteTarget.id)
      setDeleteModal(false)
      setDeleteTarget(null)
      fetchTeachers()
    } finally {
      setDeleteLoading(false)
    }
  }

  const columns: TableColumn<Teacher>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (t) => (
        <div>
          <p className="font-medium text-[#101828]">{t.name}</p>
          {t.user?.email && <p className="text-xs text-[#667085]">{t.user.email}</p>}
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (t) => <span className="text-[#667085]">{t.phone || '—'}</span>,
    },
    {
      key: 'subjects',
      header: 'Subjects',
      render: (t) =>
        t.subjects && t.subjects.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {t.subjects.map((s) => (
              <Badge key={s.id} variant="info" size="sm">
                {s.name}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-[#667085]">—</span>
        ),
    },
    {
      key: 'sections',
      header: 'Sections',
      render: (t) =>
        t.sections && t.sections.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {t.sections.map((s) => (
              <Badge key={s.id} variant="success" size="sm">
                {s.class_name ? `${s.class_name} - ${s.name}` : s.name}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-[#667085]">—</span>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (t) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openAssignSections(t)}
            className="p-1.5 rounded-md text-[#667085] hover:bg-blue-50 hover:text-[#185FA5] transition-colors"
            title="Assign Sections"
          >
            <CheckSquare size={15} />
          </button>
          <button
            onClick={() => openEditTeacher(t)}
            className="p-1.5 rounded-md text-[#667085] hover:bg-gray-100 hover:text-[#185FA5] transition-colors"
            title="Edit"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => confirmDelete(t)}
            className="p-1.5 rounded-md text-[#667085] hover:bg-red-50 hover:text-[#D92D20] transition-colors"
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Teachers"
        subtitle="Manage your school's teaching staff"
        action={
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <input type="file" accept=".csv,.xlsx" className="hidden" onChange={handleBulkUpload} />
              <div className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-white text-[#101828] border border-[#EAECF0] hover:bg-gray-50 cursor-pointer transition-colors">
                {bulkUploadLoading ? <Spinner size="sm" /> : <Upload size={16} />}
                Bulk Upload
              </div>
            </label>
            <Button variant="primary" size="sm" leftIcon={<Plus size={16} />} onClick={openCreateTeacher}>
              Add Teacher
            </Button>
          </div>
        }
      />

      {bulkUploadMsg && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm border ${
            bulkUploadMsg.includes('success')
              ? 'bg-[#DCFAE6] border-[#16825D]/20 text-[#16825D]'
              : 'bg-[#FEE4E2] border-[#D92D20]/20 text-[#D92D20]'
          }`}
        >
          {bulkUploadMsg}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-[#FEE4E2] border border-[#D92D20]/20 rounded-lg text-sm text-[#D92D20]">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <SearchInput
          placeholder="Search teachers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select
          options={[{ value: '', label: 'All Subjects' }, ...subjects.map((s) => ({ value: s.id, label: s.name }))]}
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="w-44"
        />
        <Select
          options={[{ value: '', label: 'All Sections' }, ...sections.map((s) => ({ value: s.id, label: s.class_name ? `${s.class_name} - ${s.name}` : s.name }))]}
          value={filterSection}
          onChange={(e) => setFilterSection(e.target.value)}
          className="w-48"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-[#EAECF0] rounded-xl shadow-sm overflow-hidden">
        {teachers.length === 0 && !loading ? (
          <EmptyState
            icon={<Users size={48} />}
            title="No teachers found"
            description="Add teachers to your school or adjust your filters."
            action={
              <Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreateTeacher}>
                Add Teacher
              </Button>
            }
          />
        ) : (
          <Table
            columns={columns}
            data={teachers}
            loading={loading}
            keyExtractor={(t) => t.id}
            emptyMessage="No teachers found"
          />
        )}
      </div>

      {/* Teacher Modal */}
      <Modal
        open={teacherModal}
        onClose={() => setTeacherModal(false)}
        title={teacherModalMode === 'create' ? 'Add Teacher' : 'Edit Teacher'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTeacherModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={teacherFormLoading} onClick={handleTeacherSubmit}>
              {teacherModalMode === 'create' ? 'Create' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {teacherFormErrors.form && (
            <p className="text-sm text-[#D92D20]">{teacherFormErrors.form}</p>
          )}
          <Input
            label="Full Name"
            placeholder="John Smith"
            value={teacherForm.name}
            onChange={(e) => setTeacherForm((f) => ({ ...f, name: e.target.value }))}
            error={teacherFormErrors.name}
          />
          <Input
            label="Email"
            type="email"
            placeholder="teacher@school.com"
            value={teacherForm.email || ''}
            onChange={(e) => setTeacherForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input
            label="Phone"
            type="tel"
            placeholder="+91 9876543210"
            value={teacherForm.phone || ''}
            onChange={(e) => setTeacherForm((f) => ({ ...f, phone: e.target.value }))}
          />
          {teacherModalMode === 'create' && (
            <Input
              label="Password"
              type="password"
              placeholder="Set initial password"
              value={teacherForm.password || ''}
              onChange={(e) => setTeacherForm((f) => ({ ...f, password: e.target.value }))}
              error={teacherFormErrors.password}
            />
          )}
        </div>
      </Modal>

      {/* Assign Sections Modal */}
      <Modal
        open={assignModal}
        onClose={() => setAssignModal(false)}
        title={`Assign Sections — ${assignTeacher?.name || ''}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={assignSaving} onClick={handleAssignSave}>
              Save Assignments
            </Button>
          </>
        }
      >
        {assignLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="md" className="text-[#185FA5]" />
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
            {sections.length === 0 ? (
              <p className="text-sm text-[#667085] text-center py-6">No sections available</p>
            ) : (
              sections.map((sec) => (
                <label
                  key={sec.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-[#EAECF0] hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-[#185FA5] focus:ring-[#185FA5]"
                    checked={assignedSectionIds.includes(sec.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAssignedSectionIds((ids) => [...ids, sec.id])
                      } else {
                        setAssignedSectionIds((ids) => ids.filter((id) => id !== sec.id))
                      }
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium text-[#101828]">
                      {sec.class_name ? `${sec.class_name} — ${sec.name}` : sec.name}
                    </p>
                    {sec.student_count !== undefined && (
                      <p className="text-xs text-[#667085]">{sec.student_count} students</p>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Delete Teacher"
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
