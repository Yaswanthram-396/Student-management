import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Megaphone, Paperclip } from 'lucide-react'
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
import type { Announcement, CreateAnnouncementData } from '../types'

type Audience = 'SCHOOL' | 'CLASS' | 'SECTION'

const AUDIENCE_BADGE: Record<Audience, 'info' | 'success' | 'warning'> = {
  SCHOOL: 'info',
  CLASS:  'success',
  SECTION: 'warning',
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Draft'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError  ] = useState('')

  const [modal,     setModal    ] = useState(false)
  const [mode,      setMode     ] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<{
    title:      string
    body:       string
    audience:   Audience
    publish_now: boolean
  }>({ title: '', body: '', audience: 'SCHOOL', publish_now: true })
  const [formErrors,  setFormErrors ] = useState<Record<string, string>>({})
  const [formLoading, setFormLoading] = useState(false)

  const [deleteModal,   setDeleteModal  ] = useState(false)
  const [deleteTarget,  setDeleteTarget ] = useState<Announcement | null>(null)
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

  useEffect(() => { fetchAnnouncements() }, [fetchAnnouncements])

  const openCreate = () => {
    setMode('create')
    setForm({ title: '', body: '', audience: 'SCHOOL', publish_now: true })
    setFormErrors({})
    setEditingId(null)
    setModal(true)
  }

  const openEdit = (ann: Announcement) => {
    setMode('edit')
    setForm({
      title:       ann.title,
      body:        ann.body,
      audience:    ann.audience as Audience,
      publish_now: !!ann.published_at,  // already published → true
    })
    setFormErrors({})
    setEditingId(ann.id)
    setModal(true)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = 'Title is required'
    if (!form.body.trim())  e.body  = 'Body is required'
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setFormLoading(true)
    try {
      const payload: CreateAnnouncementData = {
        title:       form.title.trim(),
        body:        form.body.trim(),
        audience:    form.audience,
        publish_now: form.publish_now,
      }
      if (mode === 'create') {
        await createAnnouncement(payload)
      } else if (editingId) {
        await updateAnnouncement(editingId, payload)
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

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle="Manage school-wide and class announcements"
        action={
          <Button variant="primary" size="sm" leftIcon={<Plus size={16} />} onClick={openCreate}>
            New Announcement
          </Button>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-[#FEE4E2] rounded-lg text-sm text-[#D92D20] border border-[#D92D20]/20">
          {error}
          <button onClick={fetchAnnouncements} className="ml-2 underline font-medium">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64"><Spinner size="lg" className="text-[#185FA5]" /></div>
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={48} />}
          title="No announcements yet"
          description="Create an announcement to notify students, parents, and teachers."
          action={<Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>New Announcement</Button>}
        />
      ) : (
        <div className="space-y-3">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className="bg-white border border-[#EAECF0] rounded-xl p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Header row */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant={AUDIENCE_BADGE[ann.audience as Audience]}>
                      {ann.audience}
                    </Badge>
                    <span className="text-xs text-[#667085]">
                      {ann.published_at ? formatDate(ann.published_at) : 'Draft'}
                    </span>
                    {ann.author_role && (
                      <span className="text-xs text-[#667085]">· by {ann.author_role}</span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-[#101828] mb-1">{ann.title}</h3>
                  <p className="text-sm text-[#667085] line-clamp-2">{ann.body}</p>
                  {ann.attachments.length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <Paperclip size={12} className="text-[#667085]" />
                      <span className="text-xs text-[#667085]">
                        {ann.attachments.length} attachment{ann.attachments.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(ann)}
                    className="p-2 rounded-lg text-[#667085] hover:bg-gray-100 hover:text-[#185FA5] transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => { setDeleteTarget(ann); setDeleteModal(true) }}
                    className="p-2 rounded-lg text-[#667085] hover:bg-red-50 hover:text-[#D92D20] transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create / Edit modal ── */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={mode === 'create' ? 'New Announcement' : 'Edit Announcement'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button variant="primary" loading={formLoading} onClick={handleSubmit}>
              {mode === 'create' ? 'Publish' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formErrors.form && <p className="text-sm text-[#D92D20]">{formErrors.form}</p>}
          <Input label="Title" placeholder="Announcement title" value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} error={formErrors.title} autoFocus />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#101828]">Body</label>
            <textarea
              placeholder="Write your announcement..."
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              rows={5}
              className={`w-full px-3 py-2 text-sm text-[#101828] bg-white border rounded-lg resize-none placeholder:text-[#667085] focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent transition-colors ${formErrors.body ? 'border-[#D92D20]' : 'border-[#EAECF0]'}`}
            />
            {formErrors.body && <p className="text-xs text-[#D92D20]">{formErrors.body}</p>}
          </div>
          <Select
            label="Audience"
            options={[
              { value: 'SCHOOL',  label: 'Entire School' },
              { value: 'CLASS',   label: 'Specific Class(es)' },
              { value: 'SECTION', label: 'Specific Section(s)' },
            ]}
            value={form.audience}
            onChange={e => setForm(f => ({ ...f, audience: e.target.value as Audience }))}
          />
          {form.audience !== 'SCHOOL' && (
            <p className="text-xs text-[#C76A00] bg-[#FEF0C7] px-3 py-2 rounded-lg">
              Class/section targeting can be set after creation by editing the announcement with specific IDs via the API.
            </p>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.publish_now}
              onChange={e => setForm(f => ({ ...f, publish_now: e.target.checked }))}
              className="w-4 h-4 rounded border-[#EAECF0] text-[#185FA5] focus:ring-[#185FA5]"
            />
            <span className="text-sm text-[#101828]">Publish immediately</span>
          </label>
        </div>
      </Modal>

      {/* ── Delete modal ── */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Delete Announcement" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" loading={deleteLoading} onClick={handleDelete}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-[#667085]">
          Delete <span className="font-semibold text-[#101828]">"{deleteTarget?.title}"</span>?
          This will hide it from all users.
        </p>
      </Modal>
    </div>
  )
}
