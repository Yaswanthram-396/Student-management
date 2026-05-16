import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Users, Upload, CheckSquare, X } from 'lucide-react'
import { PageHeader }    from '../components/ui/PageHeader'
import { Button }        from '../components/ui/Button'
import { Input }         from '../components/ui/Input'
import { Select }        from '../components/ui/Select'
import { Modal }         from '../components/ui/Modal'
import { Table, TableColumn } from '../components/ui/Table'
import { SearchInput }   from '../components/ui/SearchInput'
import { EmptyState }    from '../components/ui/EmptyState'
import { Spinner }       from '../components/ui/Spinner'
import {
  getTeachers,
  createTeacher,
  updateTeacher,
  bulkUploadTeachers,
  getBulkUploadStatus,
  getSubjects,
  getSections,
  assignTeacherSections,
} from '../api/principal'
import type { Teacher, Subject, Section } from '../types'

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [loading,  setLoading ] = useState(true)
  const [error,    setError   ] = useState('')
  const [search,   setSearch  ] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [filterSection, setFilterSection] = useState('')

  // ── Create / edit modal ───────────────────────────────────────────────────
  const [teacherModal,     setTeacherModal    ] = useState(false)
  const [teacherModalMode, setTeacherModalMode] = useState<'create' | 'edit'>('create')
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null)
  const [teacherForm, setTeacherForm] = useState({
    name:               '',
    mobile_number:      '',
    username:           '',
    password:           '',
    primary_subject_id: '',
    assigned_section_ids: [] as string[],
  })
  const [teacherFormErrors,  setTeacherFormErrors ] = useState<Record<string, string>>({})
  const [teacherFormLoading, setTeacherFormLoading] = useState(false)

  // ── Assign sections modal ─────────────────────────────────────────────────
  const [assignModal,     setAssignModal    ] = useState(false)
  const [assignTeacher,   setAssignTeacher  ] = useState<Teacher | null>(null)
  const [assignSubjectId, setAssignSubjectId] = useState('')
  const [assignSectionIds,setAssignSectionIds] = useState<string[]>([])
  const [assignSaving,    setAssignSaving   ] = useState(false)
  const [assignError,     setAssignError    ] = useState('')

  // ── Bulk upload ───────────────────────────────────────────────────────────
  const [bulkModal,   setBulkModal  ] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkMsg,     setBulkMsg    ] = useState('')
  const [bulkStatus,  setBulkStatus ] = useState<string>('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [teacherRes, subjectRes, sectionRes] = await Promise.allSettled([
        getTeachers({ search: search || undefined, subject_id: filterSubject || undefined, section_id: filterSection || undefined }),
        getSubjects(),
        getSections(),
      ])
      if (teacherRes.status  === 'fulfilled') setTeachers(teacherRes.value)
      else setError('Failed to load teachers')
      if (subjectRes.status  === 'fulfilled') setSubjects(subjectRes.value)
      if (sectionRes.status  === 'fulfilled') setSections(sectionRes.value)
    } finally {
      setLoading(false)
    }
  }, [search, filterSubject, filterSection])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Create ────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setTeacherModalMode('create')
    setEditingTeacherId(null)
    setTeacherForm({ name: '', mobile_number: '', username: '', password: '', primary_subject_id: '', assigned_section_ids: [] })
    setTeacherFormErrors({})
    setTeacherModal(true)
  }

  // ── Edit ──────────────────────────────────────────────────────────────────
  const openEdit = (t: Teacher) => {
    setTeacherModalMode('edit')
    setEditingTeacherId(t.id)
    setTeacherForm({
      name:                 t.name,
      mobile_number:        t.mobile_number,
      username:             t.user.username,
      password:             '',
      primary_subject_id:   t.primary_subject?.id ?? '',
      assigned_section_ids: t.assigned_sections.map(s => s.id),
    })
    setTeacherFormErrors({})
    setTeacherModal(true)
  }

  const validateTeacherForm = () => {
    const e: Record<string, string> = {}
    if (!teacherForm.name.trim())           e.name          = 'Name is required'
    if (!teacherForm.mobile_number.trim())  e.mobile_number = 'Mobile number is required'
    if (teacherModalMode === 'create') {
      if (!teacherForm.username.trim())     e.username      = 'Username is required'
      if (!teacherForm.password.trim())     e.password      = 'Password is required'
    }
    setTeacherFormErrors(e)
    return Object.keys(e).length === 0
  }

  const handleTeacherSubmit = async () => {
    if (!validateTeacherForm()) return
    setTeacherFormLoading(true)
    try {
      if (teacherModalMode === 'create') {
        await createTeacher({
          name:               teacherForm.name.trim(),
          mobile_number:      teacherForm.mobile_number.trim(),
          username:           teacherForm.username.trim(),
          password:           teacherForm.password,
          primary_subject_id: teacherForm.primary_subject_id || undefined,
          assigned_section_ids: teacherForm.assigned_section_ids.length ? teacherForm.assigned_section_ids : undefined,
        })
      } else if (editingTeacherId) {
        await updateTeacher(editingTeacherId, {
          name:               teacherForm.name.trim(),
          mobile_number:      teacherForm.mobile_number.trim(),
          primary_subject_id: teacherForm.primary_subject_id || undefined,
          assigned_section_ids: teacherForm.assigned_section_ids,
        })
      }
      setTeacherModal(false)
      fetchData()
    } catch (err) {
      setTeacherFormErrors({ form: err instanceof Error ? err.message : 'Operation failed' })
    } finally {
      setTeacherFormLoading(false)
    }
  }

  // ── Assign sections ───────────────────────────────────────────────────────
  const openAssign = (t: Teacher) => {
    setAssignTeacher(t)
    setAssignSubjectId(t.primary_subject?.id ?? '')
    setAssignSectionIds(t.assigned_sections.map(s => s.id))
    setAssignError('')
    setAssignModal(true)
  }

  const toggleSection = (id: string) => {
    setAssignSectionIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const handleAssignSave = async () => {
    if (!assignTeacher || !assignSubjectId) { setAssignError('Subject is required'); return }
    setAssignSaving(true)
    setAssignError('')
    try {
      await assignTeacherSections(assignTeacher.id, { subject_id: assignSubjectId, section_ids: assignSectionIds })
      setAssignModal(false)
      fetchData()
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : 'Failed to assign')
    } finally {
      setAssignSaving(false)
    }
  }

  // ── Bulk upload ───────────────────────────────────────────────────────────
  const handleBulkUpload = async (file: File) => {
    setBulkLoading(true)
    setBulkMsg('')
    setBulkStatus('')
    try {
      const res = await bulkUploadTeachers(file)
      setBulkMsg(`Upload started. Batch ID: ${res.batch_id}`)
      setBulkStatus(res.status)
      // Poll for completion
      let attempts = 0
      const poll = async () => {
        const status = await getBulkUploadStatus(res.batch_id)
        setBulkStatus(status.status)
        if (status.status === 'COMPLETED' || status.status === 'FAILED') {
          setBulkMsg(`${status.status}: ${status.success_count} success, ${status.error_count} errors out of ${status.total_rows} rows.`)
          if (status.status === 'COMPLETED') fetchData()
        } else if (attempts < 10) {
          attempts++
          setTimeout(poll, 2000)
        }
      }
      setTimeout(poll, 1500)
    } catch (err) {
      setBulkMsg(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBulkLoading(false)
    }
  }

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns: TableColumn<Teacher>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (t) => (
        <div>
          <p className="text-sm font-medium text-[#101828]">{t.name}</p>
          <p className="text-xs text-[#667085]">@{t.user.username}</p>
        </div>
      ),
    },
    {
      key: 'mobile_number',
      header: 'Mobile',
      render: (t) => <span className="text-sm text-[#667085]">{t.mobile_number}</span>,
    },
    {
      key: 'primary_subject',
      header: 'Subject',
      render: (t) => (
        <span className="text-sm text-[#101828]">{t.primary_subject?.name ?? '—'}</span>
      ),
    },
    {
      key: 'assigned_sections',
      header: 'Sections',
      render: (t) => (
        <div className="flex flex-wrap gap-1">
          {t.assigned_sections.length === 0 ? (
            <span className="text-xs text-[#667085]">None</span>
          ) : (
            t.assigned_sections.slice(0, 3).map(s => (
              <span key={s.id} className="text-xs bg-[#EBF2FB] text-[#185FA5] px-2 py-0.5 rounded-full font-medium">
                {s.class_name} {s.section_name}
              </span>
            ))
          )}
          {t.assigned_sections.length > 3 && (
            <span className="text-xs text-[#667085]">+{t.assigned_sections.length - 3}</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (t) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(t)}
            className="p-1.5 rounded text-[#667085] hover:bg-gray-100 hover:text-[#185FA5]" title="Edit">
            <Pencil size={14} />
          </button>
          <button onClick={() => openAssign(t)}
            className="p-1.5 rounded text-[#667085] hover:bg-[#EBF2FB] hover:text-[#185FA5]" title="Assign Sections">
            <CheckSquare size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Teachers"
        subtitle="Manage teacher accounts and section assignments"
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" leftIcon={<Upload size={16} />} onClick={() => { setBulkMsg(''); setBulkStatus(''); setBulkModal(true) }}>
              Bulk Upload
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Plus size={16} />} onClick={openCreate}>
              Add Teacher
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-[#FEE4E2] rounded-lg text-sm text-[#D92D20] border border-[#D92D20]/20">
          {error}
          <button onClick={fetchData} className="ml-2 underline font-medium">Retry</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, mobile, username…"
          className="flex-1 min-w-[200px]"
        />
        <Select
          options={[{ value: '', label: 'All Subjects' }, ...subjects.map(s => ({ value: s.id, label: s.name }))]}
          value={filterSubject}
          onChange={e => setFilterSubject(e.target.value)}
          className="w-44"
        />
        <Select
          options={[{ value: '', label: 'All Sections' }, ...sections.map(s => ({ value: s.id, label: `${s.academic_class.name} ${s.name}` }))]}
          value={filterSection}
          onChange={e => setFilterSection(e.target.value)}
          className="w-44"
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64"><Spinner size="lg" className="text-[#185FA5]" /></div>
      ) : teachers.length === 0 ? (
        <EmptyState icon={<Users size={48} />} title="No teachers found"
          description="Add teachers to assign them to classes and sections."
          action={<Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>Add Teacher</Button>}
        />
      ) : (
        <div className="bg-white border border-[#EAECF0] rounded-xl shadow-sm overflow-hidden">
          <Table columns={columns} data={teachers} keyExtractor={t => t.id} emptyMessage="No teachers match your search" />
        </div>
      )}

      {/* ── Create / Edit modal ── */}
      <Modal open={teacherModal} onClose={() => setTeacherModal(false)}
        title={teacherModalMode === 'create' ? 'Add Teacher' : 'Edit Teacher'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTeacherModal(false)}>Cancel</Button>
            <Button variant="primary" loading={teacherFormLoading} onClick={handleTeacherSubmit}>
              {teacherModalMode === 'create' ? 'Create Teacher' : 'Save Changes'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {teacherFormErrors.form && <p className="text-sm text-[#D92D20]">{teacherFormErrors.form}</p>}
          <Input label="Full Name" placeholder="e.g. Anita Sharma" autoFocus
            value={teacherForm.name} onChange={e => setTeacherForm(f => ({ ...f, name: e.target.value }))}
            error={teacherFormErrors.name} />
          <Input label="Mobile Number" placeholder="10-digit number" type="tel" maxLength={10}
            value={teacherForm.mobile_number} onChange={e => setTeacherForm(f => ({ ...f, mobile_number: e.target.value }))}
            error={teacherFormErrors.mobile_number} />
          {teacherModalMode === 'create' && (
            <>
              <Input label="Username" placeholder="e.g. anita.sharma"
                value={teacherForm.username} onChange={e => setTeacherForm(f => ({ ...f, username: e.target.value }))}
                error={teacherFormErrors.username} />
              <Input label="Password" type="password" placeholder="Temporary password"
                value={teacherForm.password} onChange={e => setTeacherForm(f => ({ ...f, password: e.target.value }))}
                error={teacherFormErrors.password} />
            </>
          )}
          <Select label="Primary Subject (optional)"
            options={[{ value: '', label: 'None' }, ...subjects.map(s => ({ value: s.id, label: s.name }))]}
            value={teacherForm.primary_subject_id}
            onChange={e => setTeacherForm(f => ({ ...f, primary_subject_id: e.target.value }))} />
        </div>
      </Modal>

      {/* ── Assign sections modal ── */}
      <Modal open={assignModal} onClose={() => setAssignModal(false)}
        title={`Assign Sections — ${assignTeacher?.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignModal(false)}>Cancel</Button>
            <Button variant="primary" loading={assignSaving} onClick={handleAssignSave}>Save Assignment</Button>
          </>
        }
      >
        <div className="space-y-4">
          {assignError && <p className="text-sm text-[#D92D20]">{assignError}</p>}
          <Select label="Primary Subject *"
            options={[{ value: '', label: 'Select subject…' }, ...subjects.map(s => ({ value: s.id, label: s.name }))]}
            value={assignSubjectId}
            onChange={e => setAssignSubjectId(e.target.value)} />
          <div>
            <p className="text-sm font-medium text-[#101828] mb-2">Sections ({assignSectionIds.length} selected)</p>
            <div className="max-h-56 overflow-y-auto border border-[#EAECF0] rounded-lg divide-y divide-[#EAECF0]">
              {sections.map(sec => (
                <label key={sec.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" checked={assignSectionIds.includes(sec.id)}
                    onChange={() => toggleSection(sec.id)}
                    className="w-4 h-4 rounded border-[#EAECF0] text-[#185FA5] focus:ring-[#185FA5]" />
                  <span className="text-sm text-[#101828]">
                    {sec.academic_class.name} — Section {sec.name}
                  </span>
                </label>
              ))}
              {sections.length === 0 && (
                <p className="px-3 py-4 text-sm text-[#667085] text-center">No sections available</p>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Bulk upload modal ── */}
      <Modal open={bulkModal} onClose={() => setBulkModal(false)} title="Bulk Upload Teachers" size="sm"
        footer={<Button variant="secondary" onClick={() => setBulkModal(false)}>Close</Button>}
      >
        <div className="space-y-4">
          <div className="p-3 bg-[#F6F8FB] border border-[#EAECF0] rounded-lg text-xs text-[#667085] space-y-1">
            <p className="font-semibold text-[#101828]">Required CSV columns:</p>
            <p>name, phone_number, username</p>
            <p className="font-semibold text-[#101828] mt-2">Optional columns:</p>
            <p>primary_subject_id, assigned_section_ids (comma-separated UUIDs)</p>
            <p className="mt-2 text-[#C76A00]">Password is auto-generated as <strong>pass@{"phone_number"}</strong></p>
          </div>
          <div>
            <input type="file" accept=".csv"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleBulkUpload(f) }}
              className="text-sm text-[#667085] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#185FA5] file:text-white hover:file:bg-[#185FA5]/90" />
          </div>
          {bulkLoading && (
            <div className="flex items-center gap-2 text-sm text-[#667085]">
              <Spinner size="sm" className="text-[#185FA5]" /> Uploading…
            </div>
          )}
          {bulkMsg && (
            <div className={`p-3 rounded-lg text-sm ${bulkStatus === 'COMPLETED' ? 'bg-[#DCFAE6] text-[#16825D]' : bulkStatus === 'FAILED' ? 'bg-[#FEE4E2] text-[#D92D20]' : 'bg-[#EBF2FB] text-[#185FA5]'}`}>
              {bulkMsg}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
