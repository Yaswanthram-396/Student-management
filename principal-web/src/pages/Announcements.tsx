import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Megaphone } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../api/principal'
import type { Announcement } from '../types'

type Audience = 'SCHOOL' | 'CLASS' | 'SECTION'

const audienceColors: Record<Audience, 'info' | 'success' | 'warning'> = {
  SCHOOL: 'info',
  CLASS: 'success',
  SECTION: 'warning',
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal
  const [modal, setModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [form, setForm] = useState<{
    title: string
    body: string
    audience: Audience
    publish_now: boolean
  }>({
    title: '',
    body: '',
    audience: 'SCHOOL',
    publish_now: true,
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [formLoading, setFormLoading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  // Delete
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getAnnouncements()
      setAnnouncements(data)
    } catch {
      setError('Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  const openCreate = () => {
    setModalMode('create')
    setForm({ title: '', body: '', audience: 'SCHOOL', publish_now: true })
    setFormErrors({})
    setEditingId(null)
    setModal(true)
  }

  const openEdit = (ann: Announcement) => {
    setModalMode('edit')
    setForm({
      title: ann.title,
      body: ann.body,
      audience: ann.audience as Audience,
      publish_now: ann.publish_now,
    })
    setFormErrors({})
    setEditingId(ann.id)
    setModal(true)
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!form.title.trim()) errors.title = 'Title is required'
    if (!form.body.trim()) errors.body = 'Body is required'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    setFormLoading(true)
    try {
      if (modalMode === 'create') {
        await createAnnouncement(form)
      } else if (editingId) {
        await updateAnnouncement(editingId, form)
      }
      setModal(false)
      fetchAnnouncements()
    } catch (err) {
      setFormErrors({ form: err instanceof Error ? err.message : 'Operation failed' })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await deleteAnnouncement(deleteTarget.id)
      setDeleteModal(false)
      setDeleteTarget(null)
      fetchAnnouncements()
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
        title="Announcements"
        subtitle="Communicate with teachers, students, and parents"
        action={
          <Button variant="primary" size="sm" leftIcon={<Plus size={16} />} onClick={openCreate}>
            New Announcement
          </Button>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-[#FEE4E2] border border-[#D92D20]/20 rounded-lg text-sm text-[#D92D20]">
          {error}
        </div>
      )}

      {announcements.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={48} />}
          title="No announcements yet"
          description="Create your first announcement to communicate with your school community."
          action={
            <Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>
              New Announcement
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className="bg-white border border-[#EAECF0] rounded-xl p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-2 rounded-lg bg-blue-50 text-[#185FA5] flex-shrink-0 mt-0.5">
                    <Megaphone size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-sm font-semibold text-[#101828]">{ann.title}</h3>
                      <Badge variant={audienceColors[ann.audience as Audience] || 'default'}>
                        {ann.audience}
                      </Badge>
                      {ann.publish_now && (
                        <Badge variant="success">Published</Badge>
                      )}
                    </div>
                    <p className="text-sm text-[#667085] line-clamp-2">{ann.body}</p>
                    <p className="text-xs text-[#667085] mt-2">
                      {new Date(ann.created_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(ann)}
                    className="p-1.5 rounded-md text-[#667085] hover:bg-gray-100 hover:text-[#185FA5] transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => { setDeleteTarget(ann); setDeleteModal(true) }}
                    className="p-1.5 rounded-md text-[#667085] hover:bg-red-50 hover:text-[#D92D20] transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={modalMode === 'create' ? 'New Announcement' : 'Edit Announcement'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={formLoading} onClick={handleSubmit}>
              {modalMode === 'create' ? 'Publish' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formErrors.form && (
            <p className="text-sm text-[#D92D20]">{formErrors.form}</p>
          )}
          <Input
            label="Title"
            placeholder="Announcement title..."
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            error={formErrors.title}
            autoFocus
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#101828]">Body</label>
            <textarea
              placeholder="Write your announcement here..."
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              rows={4}
              className={`w-full px-3 py-2 text-sm text-[#101828] bg-white border rounded-lg resize-none
                placeholder:text-[#667085] focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent
                ${formErrors.body ? 'border-[#D92D20]' : 'border-[#EAECF0]'}`}
            />
            {formErrors.body && <p className="text-xs text-[#D92D20]">{formErrors.body}</p>}
          </div>
          <Select
            label="Audience"
            options={[
              { value: 'SCHOOL', label: 'Entire School' },
              { value: 'CLASS', label: 'Specific Class' },
              { value: 'SECTION', label: 'Specific Section' },
            ]}
            value={form.audience}
            onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value as Audience }))}
          />
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={form.publish_now}
                onChange={(e) => setForm((f) => ({ ...f, publish_now: e.target.checked }))}
              />
              <div
                className={`w-10 h-6 rounded-full transition-colors ${
                  form.publish_now ? 'bg-[#185FA5]' : 'bg-gray-200'
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    form.publish_now ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>
            <span className="text-sm font-medium text-[#101828]">Publish immediately</span>
          </label>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Delete Announcement"
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
          <span className="font-semibold text-[#101828]">"{deleteTarget?.title}"</span>? This
          cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
