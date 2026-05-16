import React, { useEffect, useState, useCallback } from 'react'
import { CalendarCheck, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import { getAttendanceDailySummary, getAttendanceClassDetail, getClasses } from '../api/principal'
import type { AttendanceSectionSummary, SchoolClass } from '../types'

function today(): string {
  return new Date().toISOString().split('T')[0]
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function getPctColor(pct: number): string {
  if (pct >= 85) return '#16825D'
  if (pct >= 65) return '#C76A00'
  return '#D92D20'
}

function getPctBg(pct: number): string {
  if (pct >= 85) return 'bg-[#DCFAE6]'
  if (pct >= 65) return 'bg-[#FEF0C7]'
  return 'bg-[#FEE4E2]'
}

interface ClassDetail {
  classId: number
  className: string
  sections: AttendanceSectionSummary[]
}

export default function AttendancePage() {
  const [date, setDate] = useState(today())
  const [sections, setSections] = useState<AttendanceSectionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [classes, setClasses] = useState<SchoolClass[]>([])

  // Class detail view
  const [classDetail, setClassDetail] = useState<ClassDetail | null>(null)
  const [classDetailLoading, setClassDetailLoading] = useState(false)

  const fetchDailySummary = useCallback(async (d: string) => {
    setLoading(true)
    setError('')
    try {
      const [summary, classData] = await Promise.allSettled([
        getAttendanceDailySummary(d),
        getClasses(),
      ])
      if (summary.status === 'fulfilled') setSections(summary.value.sections || [])
      else setError('Failed to load attendance data')
      if (classData.status === 'fulfilled') setClasses(classData.value)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDailySummary(date)
    setClassDetail(null)
  }, [date, fetchDailySummary])

  const openClassDetail = async (classId: number, className: string) => {
    setClassDetailLoading(true)
    try {
      const data = await getAttendanceClassDetail(classId, date)
      setClassDetail({
        classId,
        className,
        sections: data.sections || [],
      })
    } catch {
      // fallback: use sections from daily summary filtered by class name
      const classSections = sections.filter((s) => s.class_name === className)
      setClassDetail({ classId, className, sections: classSections })
    } finally {
      setClassDetailLoading(false)
    }
  }

  // Group sections by class
  const sectionsByClass = sections.reduce<Record<string, AttendanceSectionSummary[]>>(
    (acc, sec) => {
      const key = sec.class_name || 'Unknown'
      if (!acc[key]) acc[key] = []
      acc[key].push(sec)
      return acc
    },
    {}
  )

  const overallPct =
    sections.length > 0
      ? Math.round(sections.reduce((sum, s) => sum + s.attendance_pct, 0) / sections.length)
      : 0

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle="Daily attendance overview and class details"
      />

      {/* Date navigation */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setDate((d) => offsetDate(d, -1))}
          className="p-2 rounded-lg border border-[#EAECF0] hover:bg-gray-100 text-[#667085] transition-colors"
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
          className="p-2 rounded-lg border border-[#EAECF0] hover:bg-gray-100 text-[#667085] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight size={18} />
        </button>
        <span className="text-sm text-[#667085]">{formatDate(date)}</span>
        {date !== today() && (
          <button
            onClick={() => setDate(today())}
            className="text-xs text-[#185FA5] hover:underline"
          >
            Go to today
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" className="text-[#185FA5]" />
        </div>
      ) : error ? (
        <div className="p-3 bg-[#FEE4E2] border border-[#D92D20]/20 rounded-lg text-sm text-[#D92D20]">
          {error}
        </div>
      ) : classDetail ? (
        // Class detail view
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
            <h2 className="text-sm font-semibold text-[#101828]">{classDetail.className} — Section Breakdown</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classDetail.sections.map((sec) => (
              <SectionCard key={sec.section_id} sec={sec} />
            ))}
            {classDetail.sections.length === 0 && (
              <div className="col-span-3">
                <EmptyState
                  icon={<CalendarCheck size={40} />}
                  title="No attendance data"
                  description="No attendance records found for this class on this date."
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        // Daily overview
        <div>
          {/* Overall summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-[#EAECF0] rounded-xl p-4 shadow-sm">
              <p className="text-xs text-[#667085] uppercase font-semibold tracking-wide mb-1">Overall Attendance</p>
              <p className="text-3xl font-bold" style={{ color: getPctColor(overallPct) }}>
                {overallPct}%
              </p>
            </div>
            <div className="bg-white border border-[#EAECF0] rounded-xl p-4 shadow-sm">
              <p className="text-xs text-[#667085] uppercase font-semibold tracking-wide mb-1">Total Present</p>
              <p className="text-3xl font-bold text-[#16825D]">
                {sections.reduce((sum, s) => sum + s.present_count, 0)}
              </p>
            </div>
            <div className="bg-white border border-[#EAECF0] rounded-xl p-4 shadow-sm">
              <p className="text-xs text-[#667085] uppercase font-semibold tracking-wide mb-1">Total Absent</p>
              <p className="text-3xl font-bold text-[#D92D20]">
                {sections.reduce((sum, s) => sum + s.absent_count, 0)}
              </p>
            </div>
          </div>

          {sections.length === 0 ? (
            <EmptyState
              icon={<CalendarCheck size={48} />}
              title="No attendance data"
              description="No attendance has been recorded for this date."
            />
          ) : (
            <div>
              {Object.entries(sectionsByClass).map(([className, classSections]) => {
                const classObj = classes.find((c) => c.name === className)
                const classAvg = Math.round(
                  classSections.reduce((sum, s) => sum + s.attendance_pct, 0) / classSections.length
                )
                return (
                  <div key={className} className="mb-6">
                    <div
                      className="flex items-center justify-between mb-3 cursor-pointer group"
                      onClick={() => classObj && openClassDetail(classObj.id, className)}
                    >
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-[#101828] group-hover:text-[#185FA5] transition-colors">
                          {className}
                        </h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPctBg(classAvg)}`}
                          style={{ color: getPctColor(classAvg) }}
                        >
                          {classAvg}% avg
                        </span>
                      </div>
                      {classDetailLoading ? (
                        <Spinner size="sm" className="text-[#185FA5]" />
                      ) : (
                        <span className="text-xs text-[#185FA5] group-hover:underline">View detail →</span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {classSections.map((sec) => (
                        <SectionCard key={sec.section_id} sec={sec} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SectionCard({ sec }: { sec: AttendanceSectionSummary }) {
  const pct = sec.attendance_pct
  const color = getPctColor(pct)
  const bg = getPctBg(pct)

  return (
    <div className="bg-white border border-[#EAECF0] rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-[#101828]">{sec.section_name}</p>
          {sec.class_name && <p className="text-xs text-[#667085]">{sec.class_name}</p>}
        </div>
        <span
          className={`text-sm font-bold px-2.5 py-1 rounded-full ${bg}`}
          style={{ color }}
        >
          {pct}%
        </span>
      </div>
      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
        <div
          className="h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#16825D] font-medium">✓ {sec.present_count} present</span>
        <span className="text-[#D92D20] font-medium">✗ {sec.absent_count} absent</span>
        <span className="text-[#667085]">{sec.total_students} total</span>
      </div>
    </div>
  )
}
