import React, { useEffect, useState, useCallback } from 'react'
import { CalendarCheck, ChevronLeft, ChevronRight, ArrowLeft, Users } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { getAttendanceDailySummary, getAttendanceClassDetail } from '../api/principal'
import type {
  AttendanceClassSummary,
  AttendanceSectionDetail,
  AttendanceClassDetail,
} from '../types'

function today(): string {
  return new Date().toISOString().split('T')[0]
}
function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}
function offsetDate(d: string, days: number): string {
  const date = new Date(d)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}
function pctColor(pct: number) {
  if (pct >= 85) return '#16825D'
  if (pct >= 65) return '#C76A00'
  return '#D92D20'
}
function pctBg(pct: number) {
  if (pct >= 85) return '#DCFAE6'
  if (pct >= 65) return '#FEF0C7'
  return '#FEE4E2'
}

// ── Class summary card ────────────────────────────────────────────────────────
function ClassCard({
  cls,
  onDrillDown,
  loading,
}: {
  cls: AttendanceClassSummary
  onDrillDown: (cls: AttendanceClassSummary) => void
  loading: boolean
}) {
  const pct = cls.attendance_percentage
  const color = pctColor(pct)
  const bg = pctBg(pct)

  return (
    <div
      className="bg-white border border-[#EAECF0] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
      onClick={() => onDrillDown(cls)}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-bold text-[#101828] group-hover:text-[#185FA5] transition-colors">
          {cls.class_name}
        </h3>
        <span
          className="text-sm font-bold px-2.5 py-1 rounded-full"
          style={{ color, backgroundColor: bg }}
        >
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-xs">
        <span style={{ color: '#16825D' }} className="font-medium">✓ {cls.present_count} present</span>
        <span style={{ color: '#D92D20' }} className="font-medium">✗ {cls.absent_count} absent</span>
        <span className="text-[#667085]">{cls.total_students} total</span>
      </div>
      <div className="mt-3 text-right">
        {loading ? (
          <Spinner size="sm" className="text-[#185FA5] ml-auto" />
        ) : (
          <span className="text-xs text-[#185FA5] group-hover:underline">View sections →</span>
        )}
      </div>
    </div>
  )
}

// ── Section detail card ───────────────────────────────────────────────────────
function SectionCard({ sec }: { sec: AttendanceSectionDetail }) {
  const pct = sec.attendance_percentage
  const color = pctColor(pct)
  const bg = pctBg(pct)
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white border border-[#EAECF0] rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-bold text-[#101828]">Section {sec.section_name}</h4>
        <span
          className="text-sm font-bold px-2.5 py-1 rounded-full"
          style={{ color, backgroundColor: bg }}
        >
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
        <div
          className="h-1.5 rounded-full"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-xs mb-3">
        <span style={{ color: '#16825D' }} className="font-medium">✓ {sec.present_count}</span>
        <span style={{ color: '#D92D20' }} className="font-medium">✗ {sec.absent_count}</span>
        <span className="text-[#667085]">{sec.total_students} total</span>
      </div>
      {(sec.absent_students.length > 0 || sec.present_students.length > 0) && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-[#185FA5] hover:underline"
        >
          {expanded ? 'Hide student list' : 'Show student list'}
        </button>
      )}
      {expanded && (
        <div className="mt-3 space-y-2">
          {sec.absent_students.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#D92D20] mb-1">Absent</p>
              <div className="flex flex-wrap gap-1">
                {sec.absent_students.map((s) => (
                  <span key={s.id} className="text-xs bg-[#FEE4E2] text-[#D92D20] px-2 py-0.5 rounded-full">
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {sec.present_students.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#16825D] mb-1">Present</p>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {sec.present_students.map((s) => (
                  <span key={s.id} className="text-xs bg-[#DCFAE6] text-[#16825D] px-2 py-0.5 rounded-full">
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const [date, setDate] = useState(today())
  const [classes, setClasses] = useState<AttendanceClassSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [classDetail, setClassDetail] = useState<AttendanceClassDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchSummary = useCallback(async (d: string) => {
    setLoading(true)
    setError('')
    setClassDetail(null)
    try {
      const data = await getAttendanceDailySummary(d)
      setClasses(data.classes || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load attendance data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSummary(date) }, [date, fetchSummary])

  const openClassDetail = async (cls: AttendanceClassSummary) => {
    setDetailLoading(true)
    try {
      const detail = await getAttendanceClassDetail(cls.class_id, date)
      setClassDetail(detail)
    } catch {
      setClassDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const totalPresent = classes.reduce((s, c) => s + c.present_count, 0)
  const totalAbsent  = classes.reduce((s, c) => s + c.absent_count, 0)
  const totalStudents = classes.reduce((s, c) => s + c.total_students, 0)
  const overallPct = totalStudents > 0 ? (totalPresent / totalStudents) * 100 : 0

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Daily attendance overview and class details" />

      {/* Date navigation */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button
          onClick={() => setDate((d) => offsetDate(d, -1))}
          className="p-2 rounded-lg border border-[#EAECF0] hover:bg-gray-50 text-[#667085]"
        >
          <ChevronLeft size={18} />
        </button>
        <input
          type="date"
          value={date}
          max={today()}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 text-sm border border-[#EAECF0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#185FA5]"
        />
        <button
          onClick={() => setDate((d) => offsetDate(d, 1))}
          disabled={date >= today()}
          className="p-2 rounded-lg border border-[#EAECF0] hover:bg-gray-50 text-[#667085] disabled:opacity-40"
        >
          <ChevronRight size={18} />
        </button>
        <span className="text-sm text-[#667085]">{formatDate(date)}</span>
        {date !== today() && (
          <button onClick={() => setDate(today())} className="text-xs text-[#185FA5] hover:underline">
            Today
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" className="text-[#185FA5]" />
        </div>
      ) : error ? (
        <div className="p-4 bg-[#FEE4E2] rounded-xl text-sm text-[#D92D20] border border-[#D92D20]/20">
          {error}
          <button onClick={() => fetchSummary(date)} className="ml-3 underline font-medium">Retry</button>
        </div>
      ) : classDetail ? (
        /* ── Class drill-down ── */
        <div>
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => setClassDetail(null)}
              className="flex items-center gap-1.5 text-sm text-[#185FA5] hover:underline"
            >
              <ArrowLeft size={16} />
              Back to overview
            </button>
            <span className="text-[#EAECF0]">|</span>
            <h2 className="text-sm font-semibold text-[#101828]">
              {classDetail.class_name} — {formatDate(date)}
            </h2>
          </div>

          {/* Class-level stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Present',    val: classDetail.present_count,     color: '#16825D' },
              { label: 'Absent',     val: classDetail.absent_count,      color: '#D92D20' },
              { label: 'Total',      val: classDetail.total_students,    color: '#185FA5' },
              { label: 'Attendance', val: `${classDetail.attendance_percentage.toFixed(1)}%`,
                color: pctColor(classDetail.attendance_percentage) },
            ].map((item) => (
              <div key={item.label} className="bg-white border border-[#EAECF0] rounded-xl p-4 shadow-sm">
                <p className="text-xs text-[#667085] uppercase font-semibold tracking-wide mb-1">{item.label}</p>
                <p className="text-2xl font-bold" style={{ color: item.color }}>{item.val}</p>
              </div>
            ))}
          </div>

          {/* Section cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classDetail.sections.map((sec) => (
              <SectionCard key={sec.section_id} sec={sec} />
            ))}
            {classDetail.sections.length === 0 && (
              <div className="col-span-3">
                <EmptyState
                  icon={<CalendarCheck size={40} />}
                  title="No data"
                  description="No attendance records for this class on this date."
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Daily overview ── */
        <div>
          {/* Summary strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Overall',  val: `${overallPct.toFixed(1)}%`, color: pctColor(overallPct) },
              { label: 'Present',  val: totalPresent,   color: '#16825D' },
              { label: 'Absent',   val: totalAbsent,    color: '#D92D20' },
              { label: 'Classes',  val: classes.length, color: '#185FA5' },
            ].map((item) => (
              <div key={item.label} className="bg-white border border-[#EAECF0] rounded-xl p-4 shadow-sm">
                <p className="text-xs text-[#667085] uppercase font-semibold tracking-wide mb-1">{item.label}</p>
                <p className="text-2xl font-bold" style={{ color: item.color }}>{item.val}</p>
              </div>
            ))}
          </div>

          {classes.length === 0 ? (
            <EmptyState
              icon={<Users size={48} />}
              title="No attendance data"
              description="No attendance has been recorded for this date."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((cls) => (
                <ClassCard
                  key={cls.class_id}
                  cls={cls}
                  onDrillDown={openClassDetail}
                  loading={detailLoading}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
