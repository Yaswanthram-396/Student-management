import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '../api/principal'
import type { CalendarEvent } from '../types'

type EventType = 'HOLIDAY' | 'EXAM' | 'EVENT'

const eventTypeConfig: Record<EventType, { color: string; badge: 'danger' | 'info' | 'success'; label: string }> = {
  HOLIDAY: { color: 'bg-red-100 text-red-700 border-red-200', badge: 'danger', label: 'Holiday' },
  EXAM: { color: 'bg-blue-100 text-blue-700 border-blue-200', badge: 'info', label: 'Exam' },
  EVENT: { color: 'bg-green-100 text-green-700 border-green-200', badge: 'success', label: 'Event' },
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  // Modal
  const [modal, setModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [form, setForm] = useState({
    title: '',
    date: '',
    event_type: 'EVENT' as EventType,
    description: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [formLoading, setFormLoading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  // Delete
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getCalendarEvents()
      setEvents(data)
    } catch {
      setError('Failed to load calendar events')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const eventsOnDate = (dateStr: string) =>
    events.filter((e) => e.date === dateStr)

  const eventsThisMonth = events
    .filter((e) => {
      const d = new Date(e.date)
      return d.getFullYear() === year && d.getMonth() === month
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  const upcomingEvents = events
    .filter((e) => e.date >= now.toISOString().split('T')[0])
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8)

  const openCreate = (date?: string) => {
    setModalMode('create')
    setForm({
      title: '',
      date: date || now.toISOString().split('T')[0],
      event_type: 'EVENT',
      description: '',
    })
    setFormErrors({})
    setEditingId(null)
    setModal(true)
  }

  const openEdit = (event: CalendarEvent) => {
    setModalMode('edit')
    setForm({
      title: event.title,
      date: event.date,
      event_type: event.event_type as EventType,
      description: event.description || '',
    })
    setFormErrors({})
    setEditingId(event.id)
    setModal(true)
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!form.title.trim()) errors.title = 'Title is required'
    if (!form.date) errors.date = 'Date is required'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    setFormLoading(true)
    try {
      const payload = {
        title: form.title.trim(),
        date: form.date,
        event_type: form.event_type,
        description: form.description || undefined,
      }
      if (modalMode === 'create') {
        await createCalendarEvent(payload)
      } else if (editingId) {
        await updateCalendarEvent(editingId, payload)
      }
      setModal(false)
      fetchEvents()
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
      await deleteCalendarEvent(deleteTarget.id)
      setDeleteModal(false)
      setDeleteTarget(null)
      fetchEvents()
    } finally {
      setDeleteLoading(false)
    }
  }

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const todayStr = now.toISOString().split('T')[0]

  const calendarDays: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  // Pad to complete weeks
  while (calendarDays.length % 7 !== 0) calendarDays.push(null)

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
        title="Calendar"
        subtitle="School events, holidays, and exams"
        action={
          <Button variant="primary" size="sm" leftIcon={<Plus size={16} />} onClick={() => openCreate()}>
            Add Event
          </Button>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-[#FEE4E2] border border-[#D92D20]/20 rounded-lg text-sm text-[#D92D20]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Calendar Grid */}
        <div className="xl:col-span-2">
          <div className="bg-white border border-[#EAECF0] rounded-xl shadow-sm overflow-hidden">
            {/* Month header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAECF0]">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-[#667085]">
                <ChevronLeft size={18} />
              </button>
              <h2 className="text-base font-semibold text-[#101828]">
                {MONTHS[month]} {year}
              </h2>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-[#667085]">
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 border-b border-[#EAECF0]">
              {DAYS.map((d) => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-[#667085] uppercase">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} className="h-20 border-r border-b border-[#EAECF0] bg-gray-50/50" />
                }
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const dayEvents = eventsOnDate(dateStr)
                const isToday = dateStr === todayStr
                return (
                  <div
                    key={dateStr}
                    className={`h-20 border-r border-b border-[#EAECF0] p-1.5 cursor-pointer hover:bg-gray-50 transition-colors ${
                      isToday ? 'bg-[#185FA5]/5' : ''
                    }`}
                    onClick={() => openCreate(dateStr)}
                  >
                    <div
                      className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday ? 'bg-[#185FA5] text-white' : 'text-[#101828]'
                      }`}
                    >
                      {day}
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      {dayEvents.slice(0, 2).map((ev) => {
                        const cfg = eventTypeConfig[ev.event_type as EventType]
                        return (
                          <div
                            key={ev.id}
                            onClick={(e) => { e.stopPropagation(); openEdit(ev) }}
                            className={`text-xs px-1 py-0.5 rounded truncate border ${cfg.color}`}
                            title={ev.title}
                          >
                            {ev.title}
                          </div>
                        )
                      })}
                      {dayEvents.length > 2 && (
                        <p className="text-xs text-[#667085]">+{dayEvents.length - 2} more</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* This month events list */}
          {eventsThisMonth.length > 0 && (
            <div className="mt-4 bg-white border border-[#EAECF0] rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-[#EAECF0]">
                <p className="text-sm font-semibold text-[#101828]">Events in {MONTHS[month]}</p>
              </div>
              <div className="divide-y divide-[#EAECF0]">
                {eventsThisMonth.map((ev) => {
                  const cfg = eventTypeConfig[ev.event_type as EventType]
                  return (
                    <div key={ev.id} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-[#667085] w-8">
                          {new Date(ev.date).getDate()}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-[#101828]">{ev.title}</p>
                          {ev.description && (
                            <p className="text-xs text-[#667085] truncate max-w-xs">{ev.description}</p>
                          )}
                        </div>
                        <Badge variant={cfg.badge}>{ev.event_type}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(ev)} className="p-1.5 rounded-md text-[#667085] hover:bg-gray-100 hover:text-[#185FA5] transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => { setDeleteTarget(ev); setDeleteModal(true) }} className="p-1.5 rounded-md text-[#667085] hover:bg-red-50 hover:text-[#D92D20] transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Upcoming events sidebar */}
        <div>
          <div className="bg-white border border-[#EAECF0] rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EAECF0]">
              <h3 className="text-sm font-semibold text-[#101828]">Upcoming Events</h3>
            </div>
            {upcomingEvents.length === 0 ? (
              <EmptyState
                icon={<Calendar size={32} />}
                title="No upcoming events"
                description="Add events to your calendar."
              />
            ) : (
              <div className="divide-y divide-[#EAECF0]">
                {upcomingEvents.map((ev) => {
                  const cfg = eventTypeConfig[ev.event_type as EventType]
                  const d = new Date(ev.date)
                  return (
                    <div key={ev.id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50">
                      <div className="text-center min-w-[36px]">
                        <p className="text-lg font-bold text-[#101828] leading-tight">{d.getDate()}</p>
                        <p className="text-xs text-[#667085] uppercase">{MONTHS[d.getMonth()].slice(0, 3)}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#101828] truncate">{ev.title}</p>
                        <Badge variant={cfg.badge} size="sm" className="mt-0.5">{ev.event_type}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(ev)} className="p-1 rounded text-[#667085] hover:text-[#185FA5]">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => { setDeleteTarget(ev); setDeleteModal(true) }} className="p-1 rounded text-[#667085] hover:text-[#D92D20]">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Event Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={modalMode === 'create' ? 'Add Event' : 'Edit Event'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={formLoading} onClick={handleSubmit}>
              {modalMode === 'create' ? 'Add' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formErrors.form && <p className="text-sm text-[#D92D20]">{formErrors.form}</p>}
          <Input
            label="Event Title"
            placeholder="e.g. Annual Sports Day"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            error={formErrors.title}
            autoFocus
          />
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            error={formErrors.date}
          />
          <Select
            label="Event Type"
            options={[
              { value: 'HOLIDAY', label: 'Holiday' },
              { value: 'EXAM', label: 'Exam' },
              { value: 'EVENT', label: 'School Event' },
            ]}
            value={form.event_type}
            onChange={(e) => setForm((f) => ({ ...f, event_type: e.target.value as EventType }))}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#101828]">Description (optional)</label>
            <textarea
              placeholder="Event details..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 text-sm text-[#101828] bg-white border border-[#EAECF0] rounded-lg resize-none placeholder:text-[#667085] focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
            />
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Delete Event"
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
          Delete{' '}
          <span className="font-semibold text-[#101828]">"{deleteTarget?.title}"</span>? This
          cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
