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
import type { CalendarEvent, CalendarEventType, CalendarVisibleTo } from '../types'

type EventType = CalendarEventType

const EVENT_CFG: Record<EventType, { color: string; badge: 'danger' | 'info' | 'success' }> = {
  HOLIDAY: { color: 'bg-red-100 text-red-700 border-red-200',   badge: 'danger'  },
  EXAM:    { color: 'bg-blue-100 text-blue-700 border-blue-200', badge: 'info'    },
  EVENT:   { color: 'bg-green-100 text-green-700 border-green-200', badge: 'success' },
}

const ALL_ROLES: CalendarVisibleTo[] = ['TEACHER', 'STUDENT', 'PARENT']

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function firstDay(y: number, m: number)    { return new Date(y, m, 1).getDay() }

function eventFallsOnDate(ev: CalendarEvent, dateStr: string): boolean {
  return ev.start_date <= dateStr && ev.end_date >= dateStr
}

function eventInMonth(ev: CalendarEvent, year: number, month: number): boolean {
  const mStr = `${year}-${String(month + 1).padStart(2, '0')}`
  return ev.start_date.startsWith(mStr) || ev.end_date.startsWith(mStr)
}

export default function CalendarPage() {
  const [events, setEvents]   = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const now = new Date()
  const [year,  setYear ] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  // Modal state
  const [modal,    setModal   ] = useState(false)
  const [mode,     setMode    ] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    title:       '',
    start_date:  '',
    end_date:    '',
    event_type:  'EVENT' as EventType,
    description: '',
    visible_to:  [...ALL_ROLES] as CalendarVisibleTo[],
  })
  const [formErrors,  setFormErrors ] = useState<Record<string, string>>({})
  const [formLoading, setFormLoading] = useState(false)

  // Delete
  const [deleteModal,   setDeleteModal  ] = useState(false)
  const [deleteTarget,  setDeleteTarget ] = useState<CalendarEvent | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getCalendarEvents()
      setEvents(res.results || [])
    } catch {
      setError('Failed to load calendar events')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  // Derived lists
  const todayStr = now.toISOString().split('T')[0]

  const eventsOnDate = (dateStr: string) =>
    events.filter((e) => eventFallsOnDate(e, dateStr))

  const monthEvents = events
    .filter((e) => eventInMonth(e, year, month))
    .sort((a, b) => a.start_date.localeCompare(b.start_date))

  const upcomingEvents = events
    .filter((e) => e.end_date >= todayStr)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 8)

  // Calendar grid
  const totalDays = daysInMonth(year, month)
  const startDay  = firstDay(year, month)
  const calDays: (number | null)[] = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]
  while (calDays.length % 7 !== 0) calDays.push(null)

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0);  setYear(y => y + 1) } else setMonth(m => m + 1) }

  // Form helpers
  const openCreate = (date?: string) => {
    const d = date || todayStr
    setMode('create')
    setForm({ title: '', start_date: d, end_date: d, event_type: 'EVENT', description: '', visible_to: [...ALL_ROLES] })
    setFormErrors({})
    setEditingId(null)
    setModal(true)
  }

  const openEdit = (ev: CalendarEvent) => {
    setMode('edit')
    setForm({
      title:       ev.title,
      start_date:  ev.start_date,
      end_date:    ev.end_date,
      event_type:  ev.event_type,
      description: ev.description || '',
      visible_to:  ev.visible_to || [...ALL_ROLES],
    })
    setFormErrors({})
    setEditingId(ev.id)
    setModal(true)
  }

  const toggleRole = (role: CalendarVisibleTo) => {
    setForm(f => ({
      ...f,
      visible_to: f.visible_to.includes(role)
        ? f.visible_to.filter(r => r !== role)
        : [...f.visible_to, role],
    }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.title.trim())    e.title      = 'Title is required'
    if (!form.start_date)      e.start_date = 'Start date is required'
    if (!form.end_date)        e.end_date   = 'End date is required'
    if (form.end_date < form.start_date) e.end_date = 'End date must be on or after start date'
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setFormLoading(true)
    try {
      const payload = {
        title:       form.title.trim(),
        event_type:  form.event_type,
        start_date:  form.start_date,
        end_date:    form.end_date,
        description: form.description || undefined,
        visible_to:  form.visible_to,
      }
      if (mode === 'create') {
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

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" className="text-[#185FA5]" /></div>

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
        <div className="mb-4 p-3 bg-[#FEE4E2] rounded-lg text-sm text-[#D92D20] border border-[#D92D20]/20">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* ── Calendar grid ── */}
        <div className="xl:col-span-2">
          <div className="bg-white border border-[#EAECF0] rounded-xl shadow-sm overflow-hidden">
            {/* Month header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAECF0]">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-[#667085]">
                <ChevronLeft size={18} />
              </button>
              <h2 className="text-base font-semibold text-[#101828]">{MONTHS[month]} {year}</h2>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-[#667085]">
                <ChevronRight size={18} />
              </button>
            </div>
            {/* Day labels */}
            <div className="grid grid-cols-7 border-b border-[#EAECF0]">
              {DAYS.map(d => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-[#667085] uppercase">{d}</div>
              ))}
            </div>
            {/* Cells */}
            <div className="grid grid-cols-7">
              {calDays.map((day, idx) => {
                if (!day) return <div key={`e-${idx}`} className="h-20 border-r border-b border-[#EAECF0] bg-gray-50/40" />
                const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                const dayEvs  = eventsOnDate(dateStr)
                const isToday = dateStr === todayStr
                return (
                  <div
                    key={dateStr}
                    className={`h-20 border-r border-b border-[#EAECF0] p-1.5 cursor-pointer hover:bg-gray-50 ${isToday ? 'bg-[#185FA5]/5' : ''}`}
                    onClick={() => openCreate(dateStr)}
                  >
                    <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[#185FA5] text-white' : 'text-[#101828]'}`}>
                      {day}
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      {dayEvs.slice(0, 2).map(ev => (
                        <div
                          key={ev.id}
                          onClick={e => { e.stopPropagation(); openEdit(ev) }}
                          className={`text-xs px-1 py-0.5 rounded truncate border cursor-pointer ${EVENT_CFG[ev.event_type].color}`}
                          title={ev.title}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {dayEvs.length > 2 && <p className="text-xs text-[#667085]">+{dayEvs.length - 2}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* This month list */}
          {monthEvents.length > 0 && (
            <div className="mt-4 bg-white border border-[#EAECF0] rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-[#EAECF0]">
                <p className="text-sm font-semibold text-[#101828]">Events in {MONTHS[month]}</p>
              </div>
              <div className="divide-y divide-[#EAECF0]">
                {monthEvents.map(ev => (
                  <div key={ev.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-medium text-[#667085] w-16 shrink-0">
                        {new Date(ev.start_date).getDate()} {ev.start_date !== ev.end_date ? `– ${new Date(ev.end_date).getDate()}` : ''}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#101828] truncate">{ev.title}</p>
                        {ev.description && <p className="text-xs text-[#667085] truncate">{ev.description}</p>}
                      </div>
                      <Badge variant={EVENT_CFG[ev.event_type].badge}>{ev.event_type}</Badge>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button onClick={() => openEdit(ev)} className="p-1.5 rounded text-[#667085] hover:bg-gray-100 hover:text-[#185FA5]"><Pencil size={14} /></button>
                      <button onClick={() => { setDeleteTarget(ev); setDeleteModal(true) }} className="p-1.5 rounded text-[#667085] hover:bg-red-50 hover:text-[#D92D20]"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Upcoming sidebar ── */}
        <div>
          <div className="bg-white border border-[#EAECF0] rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EAECF0]">
              <h3 className="text-sm font-semibold text-[#101828]">Upcoming Events</h3>
            </div>
            {upcomingEvents.length === 0 ? (
              <EmptyState icon={<Calendar size={32} />} title="No upcoming events" description="Add events to the calendar." />
            ) : (
              <div className="divide-y divide-[#EAECF0]">
                {upcomingEvents.map(ev => {
                  const d = new Date(ev.start_date)
                  return (
                    <div key={ev.id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50">
                      <div className="text-center min-w-[36px]">
                        <p className="text-lg font-bold text-[#101828] leading-tight">{d.getDate()}</p>
                        <p className="text-xs text-[#667085] uppercase">{MONTHS[d.getMonth()].slice(0, 3)}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#101828] truncate">{ev.title}</p>
                        <Badge variant={EVENT_CFG[ev.event_type].badge} size="sm" className="mt-0.5">{ev.event_type}</Badge>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEdit(ev)} className="p-1 rounded text-[#667085] hover:text-[#185FA5]"><Pencil size={13} /></button>
                        <button onClick={() => { setDeleteTarget(ev); setDeleteModal(true) }} className="p-1 rounded text-[#667085] hover:text-[#D92D20]"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Event modal ── */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={mode === 'create' ? 'Add Calendar Event' : 'Edit Event'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button variant="primary" loading={formLoading} onClick={handleSubmit}>
              {mode === 'create' ? 'Add Event' : 'Save Changes'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formErrors.form && <p className="text-sm text-[#D92D20]">{formErrors.form}</p>}
          <Input label="Event Title" placeholder="e.g. Annual Sports Day" value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} error={formErrors.title} autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={form.start_date}
              onChange={e => setForm(f => ({ ...f, start_date: e.target.value, end_date: e.target.value > f.end_date ? e.target.value : f.end_date }))}
              error={formErrors.start_date} />
            <Input label="End Date" type="date" value={form.end_date} min={form.start_date}
              onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} error={formErrors.end_date} />
          </div>
          <Select label="Event Type"
            options={[{ value: 'HOLIDAY', label: 'Holiday' }, { value: 'EXAM', label: 'Exam' }, { value: 'EVENT', label: 'School Event' }]}
            value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value as EventType }))} />
          <div>
            <p className="text-sm font-medium text-[#101828] mb-2">Visible to</p>
            <div className="flex gap-3">
              {ALL_ROLES.map(role => (
                <label key={role} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={form.visible_to.includes(role)}
                    onChange={() => toggleRole(role)}
                    className="w-4 h-4 rounded border-[#EAECF0] text-[#185FA5] focus:ring-[#185FA5]" />
                  <span className="text-sm text-[#101828]">{role}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#101828]">Description (optional)</label>
            <textarea placeholder="Event details..." value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
              className="w-full px-3 py-2 text-sm text-[#101828] bg-white border border-[#EAECF0] rounded-lg resize-none placeholder:text-[#667085] focus:outline-none focus:ring-2 focus:ring-[#185FA5]" />
          </div>
        </div>
      </Modal>

      {/* ── Delete modal ── */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Delete Event" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" loading={deleteLoading} onClick={handleDelete}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-[#667085]">
          Delete <span className="font-semibold text-[#101828]">"{deleteTarget?.title}"</span>? This cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
