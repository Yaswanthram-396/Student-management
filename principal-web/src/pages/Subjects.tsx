import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, FlaskConical, ToggleLeft, ToggleRight } from 'lucide-react'
import { PageHeader }  from '../components/ui/PageHeader'
import { Button }      from '../components/ui/Button'
import { Input }       from '../components/ui/Input'
import { Modal }       from '../components/ui/Modal'
import { Badge }       from '../components/ui/Badge'
import { Spinner }     from '../components/ui/Spinner'
import { EmptyState }  from '../components/ui/EmptyState'
import { getSubjects, createSubject, updateSubject, deleteSubject } from '../api/principal'
import type { Subject } from '../types'

export default function SubjectsPage() {
  const [subjects,      setSubjects     ] = useState<Subject[]>([])
  const [loading,       setLoading      ] = useState(true)
  const [error,         setError        ] = useState('')

  // Create / edit modal
  const [modal,        setModal       ] = useState(false)
  const [mode,         setMode        ] = useState<'create' | 'edit'>('create')
  const [editingId,    setEditingId   ] = useState<string | null>(null)
  const [form,         setForm        ] = useState({ name: '', code: '', is_active: true })
  const [formErrors,   setFormErrors  ] = useState<Record<string, string>>({})
  const [formLoading,  setFormLoading ] = useState(false)

  // Delete modal
  const [deleteModal,   setDeleteModal  ] = useState(false)
  const [deleteTarget,  setDeleteTarget ] = useState<Subject | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError,   setDeleteError  ] = useState('')

  const fetchSubjects = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setSubjects(await getSubjects())
    } catch {
      setError('Failed to load subjects')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSubjects() }, [fetchSubjects])

  const openCreate = () => {
    setMode('create')
    setEditingId(null)
    setForm({ name: '', code: '', is_active: true })
    setFormErrors({})
    setModal(true)
  }

  const openEdit = (s: Subject) => {
    setMode('edit')
    setEditingId(s.id)
    setForm({ name: s.name, code: s.code ?? '', is_active: s.is_active })
    setFormErrors({})
    setModal(true)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Subject name is required'
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setFormLoading(true)
    try {
      const payload = {
        name:      form.name.trim(),
        code:      form.code.trim() || undefined,
        is_active: form.is_active,
      }
      if (mode === 'create') {
        await createSubject(payload)
      } else if (editingId) {
        await updateSubject(editingId, payload)
      }
      setModal(false)
      fetchSubjects()
    } catch (err) {
      setFormErrors({ form: err instanceof Error ? err.message : 'Operation failed' })
    } finally {
      setFormLoading(false)
    }
  }

  // Quick toggle active without opening modal
  const toggleActive = async (s: Subject) => {
    try {
      await updateSubject(s.id, { is_active: !s.is_active })
      setSubjects(prev => prev.map(sub => sub.id === s.id ? { ...sub, is_active: !sub.is_active } : sub))
    } catch {
      // revert on failure — silently; user can try again
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await deleteSubject(deleteTarget.id)
      setDeleteModal(false)
      setDeleteTarget(null)
      fetchSubjects()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Cannot delete subject — it may be in use')
    } finally {
      setDeleteLoading(false)
    }
  }

  const active   = subjects.filter(s => s.is_active)
  const inactive = subjects.filter(s => !s.is_active)

  return (
    <div>
      <PageHeader
        title="Subjects"
        subtitle="Manage the subjects offered in your school"
        action={
          <Button variant="primary" size="sm" leftIcon={<Plus size={16} />} onClick={openCreate}>
            Add Subject
          </Button>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-[#FEE4E2] rounded-lg text-sm text-[#D92D20] border border-[#D92D20]/20">
          {error}
          <button onClick={fetchSubjects} className="ml-2 underline font-medium">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" className="text-[#185FA5]" />
        </div>
      ) : subjects.length === 0 ? (
        <EmptyState
          icon={<FlaskConical size={48} />}
          title="No subjects yet"
          description="Add the subjects your school teaches — teachers will be assigned to them."
          action={<Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>Add Subject</Button>}
        />
      ) : (
        <div className="space-y-5">
          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Subjects', value: subjects.length,  color: '#185FA5', bg: '#EBF2FB' },
              { label: 'Active',         value: active.length,    color: '#16825D', bg: '#EAF7F1' },
              { label: 'Inactive',       value: inactive.length,  color: '#667085', bg: '#F2F4F7' },
            ].map(item => (
              <div key={item.label} className="bg-white border border-[#EAECF0] rounded-xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: item.bg }}>
                  <FlaskConical size={18} style={{ color: item.color }} />
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</p>
                  <p className="text-xs text-[#667085] font-medium">{item.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Active subjects */}
          {active.length > 0 && (
            <div className="bg-white border border-[#EAECF0] rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-[#EAECF0]">
                <p className="text-sm font-semibold text-[#101828]">Active Subjects ({active.length})</p>
              </div>
              <div className="divide-y divide-[#EAECF0]">
                {active.map(s => <SubjectRow key={s.id} subject={s} onEdit={openEdit} onDelete={t => { setDeleteTarget(t); setDeleteError(''); setDeleteModal(true) }} onToggle={toggleActive} />)}
              </div>
            </div>
          )}

          {/* Inactive subjects */}
          {inactive.length > 0 && (
            <div className="bg-white border border-[#EAECF0] rounded-xl shadow-sm overflow-hidden opacity-75">
              <div className="px-5 py-3 border-b border-[#EAECF0]">
                <p className="text-sm font-semibold text-[#667085]">Inactive Subjects ({inactive.length})</p>
              </div>
              <div className="divide-y divide-[#EAECF0]">
                {inactive.map(s => <SubjectRow key={s.id} subject={s} onEdit={openEdit} onDelete={t => { setDeleteTarget(t); setDeleteError(''); setDeleteModal(true) }} onToggle={toggleActive} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Create / Edit modal ── */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={mode === 'create' ? 'Add Subject' : 'Edit Subject'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button variant="primary" loading={formLoading} onClick={handleSubmit}>
              {mode === 'create' ? 'Create' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formErrors.form && <p className="text-sm text-[#D92D20]">{formErrors.form}</p>}
          <Input
            label="Subject Name"
            placeholder="e.g. Mathematics"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            error={formErrors.name}
            autoFocus
          />
          <Input
            label="Code (optional)"
            placeholder="e.g. MATH"
            value={form.code}
            onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
            maxLength={10}
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              className="w-4 h-4 rounded border-[#EAECF0] text-[#185FA5] focus:ring-[#185FA5]"
            />
            <span className="text-sm text-[#101828]">Active (visible to teachers)</span>
          </label>
        </div>
      </Modal>

      {/* ── Delete modal ── */}
      <Modal
        open={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Delete Subject"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" loading={deleteLoading} onClick={handleDelete}>Delete</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[#667085]">
            Delete <span className="font-semibold text-[#101828]">"{deleteTarget?.name}"</span>?
            This will fail if the subject is assigned to any teacher.
          </p>
          {deleteError && (
            <p className="text-sm text-[#D92D20] bg-[#FEE4E2] px-3 py-2 rounded-lg">{deleteError}</p>
          )}
        </div>
      </Modal>
    </div>
  )
}

// ── Subject row ───────────────────────────────────────────────────────────────
function SubjectRow({
  subject, onEdit, onDelete, onToggle,
}: {
  subject: Subject
  onEdit:   (s: Subject) => void
  onDelete: (s: Subject) => void
  onToggle: (s: Subject) => void
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#EBF2FB] flex items-center justify-center flex-shrink-0">
          <FlaskConical size={16} className="text-[#185FA5]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-[#101828]">{subject.name}</p>
            {subject.code && (
              <span className="text-xs font-mono bg-[#F2F4F7] text-[#667085] px-1.5 py-0.5 rounded">
                {subject.code}
              </span>
            )}
            <Badge variant={subject.is_active ? 'success' : 'default'} size="sm">
              {subject.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {/* Toggle active */}
        <button
          onClick={() => onToggle(subject)}
          title={subject.is_active ? 'Deactivate' : 'Activate'}
          className="p-1.5 rounded text-[#667085] hover:bg-gray-100 hover:text-[#185FA5] transition-colors"
        >
          {subject.is_active ? <ToggleRight size={18} className="text-[#16825D]" /> : <ToggleLeft size={18} />}
        </button>
        <button
          onClick={() => onEdit(subject)}
          className="p-1.5 rounded text-[#667085] hover:bg-gray-100 hover:text-[#185FA5] transition-colors"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => onDelete(subject)}
          className="p-1.5 rounded text-[#667085] hover:bg-red-50 hover:text-[#D92D20] transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
