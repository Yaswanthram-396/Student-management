import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Upload, BarChart3, ArrowLeft, Trophy, AlertCircle, Users, ChevronRight, Activity } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts'
import { PageHeader }    from '../components/ui/PageHeader'
import { Button }        from '../components/ui/Button'
import { Modal }         from '../components/ui/Modal'
import { Input }         from '../components/ui/Input'
import { Select }        from '../components/ui/Select'
import { Badge }         from '../components/ui/Badge'
import { Table, TableColumn } from '../components/ui/Table'
import { Spinner }       from '../components/ui/Spinner'
import { EmptyState }    from '../components/ui/EmptyState'
import {
  listExams, createExam, uploadExamFile,
  getExamOverview, getSectionDetail, getSectionStudents,
  getSectionHeatmap, getQuestionDetail,
  getStudentSummary, getStudentSubject,
} from '../api/analytics'
import { getClasses, getSections } from '../api/principal'
import type {
  AnalyticsExam, AnalyticsStatus,
  ExamOverviewResponse, SectionDetailResponse,
  SectionStudentsAnalyticsResponse, AnalyticsSectionStudent,
  SectionHeatmapResponse, HeatmapQuestion, QuestionDetailResponse,
  StudentSummaryAnalyticsResponse, StudentAnalyticsSubject,
  StudentSubjectAnalyticsResponse,
  SchoolClass, Section,
} from '../types'

// ── Design tokens ─────────────────────────────────────────────────────────────
const ACCENT  = '#185FA5'
const GREEN   = '#16825D'
const RED     = '#D92D20'
const AMBER   = '#C76A00'
const MUTED   = '#667085'
const INK     = '#101828'
const LINE    = '#EAECF0'
const BG      = '#F6F8FB'
const WHITE   = '#FFFFFF'
const CHART_COLORS = [ACCENT, GREEN, AMBER, '#9B59B6', '#E74C3C']

// ── Helpers ───────────────────────────────────────────────────────────────────
function riskColor(r: string) {
  if (r === 'ALERT') return RED
  if (r === 'WATCH') return AMBER
  return GREEN
}
function riskBg(r: string) {
  if (r === 'ALERT') return '#FEEDEB'
  if (r === 'WATCH') return '#FFF5E6'
  return '#EAF7F1'
}
function diffColor(tag: string) {
  if (tag === 'HARD')   return RED
  if (tag === 'MEDIUM') return AMBER
  return GREEN
}
function perfColor(label: string) {
  const map: Record<string, string> = {
    EXCEPTIONAL: '#6941C6', ABOVE_AVERAGE: GREEN, AVERAGE: AMBER,
    BELOW_AVERAGE: '#C05621', NEEDS_ATTENTION: RED,
  }
  return map[label] || MUTED
}
function perfLabel(label: string) {
  return label.replace(/_/g, ' ')
}
function statusBadge(status: AnalyticsStatus) {
  const MAP: Record<AnalyticsStatus, 'default' | 'warning' | 'info' | 'success' | 'danger'> = {
    CREATED: 'default', PENDING: 'warning', RUNNING: 'info', DONE: 'success', FAILED: 'danger',
  }
  return <Badge variant={MAP[status]}>{status}</Badge>
}
function formatDate(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── View state machine ────────────────────────────────────────────────────────
type View =
  | { kind: 'list' }
  | { kind: 'overview';         examId: string; examName: string }
  | { kind: 'section_students'; examId: string; examName: string; sectionId: string; sectionName: string }
  | { kind: 'section_detail';   examId: string; examName: string; sectionId: string; sectionName: string }
  | { kind: 'heatmap';          examId: string; examName: string; sectionId: string; sectionName: string; subjectId: string; subjectName: string }
  | { kind: 'question_detail';  examId: string; examName: string; sectionId: string; sectionName: string; subjectId: string; subjectName: string; qNo: number }
  | { kind: 'student_summary';  examId: string; examName: string; studentId: string; studentName: string }
  | { kind: 'student_subject';  examId: string; examName: string; studentId: string; studentName: string; subjectId: string; subjectName: string }

// ── Shared loading / error primitives ─────────────────────────────────────────
function CenteredSpinner() {
  return <div className="flex justify-center items-center h-64"><Spinner size="lg" className="text-[#185FA5]" /></div>
}
function ErrorBox({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16">
      <AlertCircle size={36} className="text-[#D92D20]" />
      <p className="text-sm text-[#667085]">{msg}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>Retry</Button>
    </div>
  )
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────
function Breadcrumb({ steps }: { steps: { label: string; onClick?: () => void }[] }) {
  return (
    <div className="flex items-center gap-1 flex-wrap mb-5">
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight size={14} className="text-[#EAECF0] flex-shrink-0" />}
          {s.onClick ? (
            <button onClick={s.onClick} className="text-sm text-[#185FA5] hover:underline font-medium">{s.label}</button>
          ) : (
            <span className="text-sm font-semibold text-[#101828]">{s.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: Exam Overview
// ─────────────────────────────────────────────────────────────────────────────
function ExamOverviewView({
  examId, examName,
  onBack, onSectionStudents, onSectionDetail,
}: {
  examId: string; examName: string
  onBack: () => void
  onSectionStudents: (sectionId: string, sectionName: string) => void
  onSectionDetail:   (sectionId: string, sectionName: string) => void
}) {
  const [data,    setData   ] = useState<ExamOverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError  ] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setData(await getExamOverview(examId)) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }, [examId])

  useEffect(() => { load() }, [load])

  if (loading) return <CenteredSpinner />
  if (error)   return <ErrorBox msg={error} onRetry={load} />
  if (!data)   return null

  const avgs = data.class_avgs ?? data.subject_avgs ?? []
  const sections = data.sections ?? []
  const top = data.top_students ?? []

  const chartData = avgs.map(a => ({
    subject: a.subject_name,
    avg: a.max_marks > 0 ? parseFloat(((a.avg / a.max_marks) * 100).toFixed(1)) : 0,
  }))

  return (
    <div>
      <Breadcrumb steps={[{ label: 'Exams', onClick: onBack }, { label: examName }]} />

      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-lg font-bold text-[#101828]">{examName}</h2>
        {statusBadge(data.exam.analytics_status)}
        <span className="text-sm text-[#667085]">· {formatDate(data.exam.exam_date)}</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
        {/* Subject averages chart */}
        {chartData.length > 0 && (
          <div className="bg-white border border-[#EAECF0] rounded-xl p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#101828] mb-4">Class Subject Averages</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke={LINE} vertical={false} />
                <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: MUTED }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: MUTED }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={{ border: 'none', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v}%`, 'Average']} />
                <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top students */}
        {top.length > 0 && (
          <div className="bg-white border border-[#EAECF0] rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EAECF0] flex items-center gap-2">
              <Trophy size={16} className="text-[#C76A00]" />
              <p className="text-sm font-semibold text-[#101828]">Top Students</p>
            </div>
            <div className="divide-y divide-[#EAECF0]">
              {top.slice(0, 5).map((st, i) => (
                <div key={st.student_id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-sm font-bold text-[#C76A00] w-6">#{st.rank ?? i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#101828] truncate">{st.name}</p>
                    <p className="text-xs text-[#667085]">{st.student_ref_id}</p>
                  </div>
                  <span className="text-sm font-bold text-[#185FA5]">{st.total_marks}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sections */}
      {sections.length > 0 && (
        <div className="bg-white border border-[#EAECF0] rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#EAECF0]">
            <p className="text-sm font-semibold text-[#101828]">Sections</p>
          </div>
          <div className="divide-y divide-[#EAECF0]">
            {sections.map(sec => (
              <div key={sec.section_id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-[#101828]">Section {sec.section_name}</p>
                  <p className="text-xs text-[#667085]">{sec.avg.toFixed(1)}% average</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm"
                    onClick={() => onSectionDetail(sec.section_id, sec.section_name)}>
                    Subjects
                  </Button>
                  <Button variant="secondary" size="sm" leftIcon={<Users size={13} />}
                    onClick={() => onSectionStudents(sec.section_id, sec.section_name)}>
                    Students
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!chartData.length && !sections.length && !top.length && (
        <EmptyState icon={<BarChart3 size={48} />} title="No analytics data" description="Overview data is not available for this exam." />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: Section Detail (subjects comparison)
// ─────────────────────────────────────────────────────────────────────────────
function SectionDetailView({
  examId, examName, sectionId, sectionName,
  onBack, onHeatmap,
}: {
  examId: string; examName: string; sectionId: string; sectionName: string
  onBack: () => void
  onHeatmap: (subjectId: string, subjectName: string) => void
}) {
  const [data,    setData   ] = useState<SectionDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError  ] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setData(await getSectionDetail(examId, sectionId)) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }, [examId, sectionId])

  useEffect(() => { load() }, [load])

  if (loading) return <CenteredSpinner />
  if (error)   return <ErrorBox msg={error} onRetry={load} />
  if (!data)   return null

  const chartData = data.subjects.map(s => ({
    subject:     s.subject_name,
    section_avg: parseFloat(s.section_avg.toFixed(1)),
    class_avg:   parseFloat(s.class_avg.toFixed(1)),
  }))

  return (
    <div>
      <Breadcrumb steps={[
        { label: 'Exams', onClick: onBack },
        { label: `Section ${sectionName} — Subjects` },
      ]} />

      <div className="mb-6">
        <h2 className="text-lg font-bold text-[#101828]">Section {sectionName}</h2>
        <p className="text-sm text-[#667085]">{examName} · Subject comparison</p>
      </div>

      {/* Chart */}
      <div className="bg-white border border-[#EAECF0] rounded-xl p-5 shadow-sm mb-5">
        <p className="text-sm font-semibold text-[#101828] mb-4">Section vs Class Average</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke={LINE} vertical={false} />
            <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: MUTED }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: MUTED }} tickFormatter={v => `${v}%`} />
            <Tooltip contentStyle={{ border: 'none', borderRadius: 8, fontSize: 12 }} />
            <Legend />
            <Bar dataKey="section_avg" name="Section Avg" fill={ACCENT} radius={[4, 4, 0, 0]} />
            <Bar dataKey="class_avg"   name="Class Avg"   fill={GREEN}  radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Subject list */}
      <div className="bg-white border border-[#EAECF0] rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EAECF0]">
          <p className="text-sm font-semibold text-[#101828]">Subjects — click to see question heatmap</p>
        </div>
        <div className="divide-y divide-[#EAECF0]">
          {data.subjects.map(s => {
            const positive = s.delta >= 0
            return (
              <div key={s.subject_id}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 cursor-pointer"
                onClick={() => onHeatmap(s.subject_id, s.subject_name)}
              >
                <div>
                  <p className="text-sm font-medium text-[#101828]">{s.subject_name}</p>
                  <p className="text-xs text-[#667085]">
                    Section {s.section_avg.toFixed(1)}% · Class {s.class_avg.toFixed(1)}%
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold px-2.5 py-1 rounded-full"
                    style={{ color: positive ? GREEN : RED, backgroundColor: positive ? '#EAF7F1' : '#FEEDEB' }}>
                    {positive ? '+' : ''}{s.delta.toFixed(1)}%
                  </span>
                  <ChevronRight size={16} className="text-[#EAECF0]" />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: Section Students
// ─────────────────────────────────────────────────────────────────────────────
function SectionStudentsView({
  examId, examName, sectionId, sectionName,
  onBack, onStudent,
}: {
  examId: string; examName: string; sectionId: string; sectionName: string
  onBack: () => void
  onStudent: (studentId: string, studentName: string) => void
}) {
  const [data,    setData   ] = useState<SectionStudentsAnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError  ] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setData(await getSectionStudents(sectionId, examId)) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }, [sectionId, examId])

  useEffect(() => { load() }, [load])

  if (loading) return <CenteredSpinner />
  if (error)   return <ErrorBox msg={error} onRetry={load} />
  if (!data)   return null

  const columns: TableColumn<AnalyticsSectionStudent>[] = [
    {
      key: 'student_ref_id', header: 'ID',
      render: s => <span className="font-mono text-xs text-[#667085]">{s.student_ref_id}</span>,
    },
    {
      key: 'name', header: 'Name',
      render: s => (
        <button onClick={() => onStudent(s.student_id, s.name)}
          className="text-sm font-medium text-[#185FA5] hover:underline text-left">
          {s.name}
        </button>
      ),
    },
    {
      key: 'total_pct', header: 'Total %',
      render: s => <span className="font-bold text-sm text-[#101828]">{s.total_pct.toFixed(1)}%</span>,
    },
    {
      key: 'overall_risk', header: 'Risk',
      render: s => (
        <span className="text-xs font-bold px-2 py-1 rounded-full"
          style={{ color: riskColor(s.overall_risk), backgroundColor: riskBg(s.overall_risk) }}>
          {s.overall_risk}
        </span>
      ),
    },
    {
      key: 'subject_details', header: 'Subjects',
      render: s => (
        <div className="flex flex-wrap gap-1">
          {s.subject_details.map(sub => (
            <span key={sub.subject_id} className="text-xs bg-gray-100 text-[#667085] px-1.5 py-0.5 rounded">
              {sub.subject_name}: {sub.subject_percentage.toFixed(0)}%
            </span>
          ))}
        </div>
      ),
    },
  ]

  return (
    <div>
      <Breadcrumb steps={[
        { label: 'Exams', onClick: onBack },
        { label: `Section ${sectionName} — Students` },
      ]} />

      <div className="mb-4">
        <h2 className="text-lg font-bold text-[#101828]">Section {sectionName} Students</h2>
        <p className="text-sm text-[#667085]">{examName} · {data.students.length} students · Click a name to view details</p>
      </div>

      <div className="bg-white border border-[#EAECF0] rounded-xl shadow-sm overflow-hidden">
        <Table columns={columns} data={data.students} keyExtractor={s => s.student_id}
          emptyMessage="No students found" />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: Question Heatmap
// ─────────────────────────────────────────────────────────────────────────────
function HeatmapView({
  examId, examName, sectionId, sectionName, subjectId, subjectName,
  onBack, onQuestion,
}: {
  examId: string; examName: string; sectionId: string; sectionName: string
  subjectId: string; subjectName: string
  onBack: () => void
  onQuestion: (qNo: number) => void
}) {
  const [data,    setData   ] = useState<SectionHeatmapResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError  ] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setData(await getSectionHeatmap(sectionId, subjectId, examId)) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }, [sectionId, subjectId, examId])

  useEffect(() => { load() }, [load])

  if (loading) return <CenteredSpinner />
  if (error)   return <ErrorBox msg={error} onRetry={load} />
  if (!data)   return null

  return (
    <div>
      <Breadcrumb steps={[
        { label: 'Exams', onClick: onBack },
        { label: `Section ${sectionName} — ${subjectName} Heatmap` },
      ]} />

      <div className="mb-4">
        <h2 className="text-lg font-bold text-[#101828]">{subjectName} — Question Heatmap</h2>
        <p className="text-sm text-[#667085]">
          Section {sectionName} · {examName} · {data.total_questions} questions · Click a question for detail
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        {[{ label: 'Easy (>70%)', color: GREEN }, { label: 'Medium (30–70%)', color: AMBER }, { label: 'Hard (<30%)', color: RED }].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
            <span className="text-xs text-[#667085]">{l.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full border-2 border-[#D92D20] bg-white" />
          <span className="text-xs text-[#667085]">Key error</span>
        </div>
      </div>

      {/* Question grid */}
      <div className="bg-white border border-[#EAECF0] rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {data.questions.map(q => (
            <button
              key={q.q_no}
              onClick={() => onQuestion(q.q_no)}
              title={`Q${q.q_no}: ${q.difficulty_tag} (${q.difficulty_index.toFixed(1)}%)${q.has_key_error ? ' ⚠ Key Error' : ''}`}
              className="w-11 h-11 rounded-lg text-xs font-bold text-white transition-transform hover:scale-110 shadow-sm relative"
              style={{ backgroundColor: diffColor(q.difficulty_tag) }}
            >
              {q.q_no}
              {q.has_key_error && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-white border border-[#D92D20] rounded-full text-[#D92D20] text-[8px] flex items-center justify-center font-black">!</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Summary table */}
      <div className="mt-4 bg-white border border-[#EAECF0] rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-[#EAECF0]">
          <p className="text-sm font-semibold text-[#101828]">Difficulty Breakdown</p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-[#EAECF0]">
          {(['EASY', 'MEDIUM', 'HARD'] as const).map(tag => {
            const qs = data.questions.filter(q => q.difficulty_tag === tag)
            return (
              <div key={tag} className="p-4 text-center">
                <p className="text-2xl font-bold" style={{ color: diffColor(tag) }}>{qs.length}</p>
                <p className="text-xs text-[#667085] font-medium mt-1">{tag}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: Question Detail
// ─────────────────────────────────────────────────────────────────────────────
function QuestionDetailView({
  examId, examName, sectionId, sectionName, subjectId, subjectName, qNo,
  onBack,
}: {
  examId: string; examName: string; sectionId: string; sectionName: string
  subjectId: string; subjectName: string; qNo: number
  onBack: () => void
}) {
  const [data,    setData   ] = useState<QuestionDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError  ] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setData(await getQuestionDetail(sectionId, subjectId, qNo, examId)) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }, [sectionId, subjectId, qNo, examId])

  useEffect(() => { load() }, [load])

  if (loading) return <CenteredSpinner />
  if (error)   return <ErrorBox msg={error} onRetry={load} />
  if (!data)   return null

  const q = data.question
  const total = q.correct_count + q.wrong_count + q.skip_count
  const barData = [
    { name: 'Correct',     value: q.correct_count, fill: GREEN },
    { name: 'Wrong',       value: q.wrong_count,   fill: RED   },
    { name: 'Unattempted', value: q.skip_count,     fill: MUTED },
  ]

  return (
    <div>
      <Breadcrumb steps={[
        { label: 'Exams', onClick: onBack },
        { label: `Q${qNo} — ${subjectName}` },
      ]} />

      <div className="mb-4">
        <h2 className="text-lg font-bold text-[#101828]">Question {qNo} Detail</h2>
        <p className="text-sm text-[#667085]">
          Section {sectionName} · {subjectName} · {examName}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {[
          { label: 'Difficulty',       value: q.difficulty_tag,   color: diffColor(q.difficulty_tag) },
          { label: 'Difficulty Index', value: `${q.difficulty_index.toFixed(1)}%`, color: ACCENT },
          { label: 'Discrimination',   value: q.discrimination_index.toFixed(3), color: q.discrimination_index >= 0 ? GREEN : RED },
          { label: 'Key Error',        value: q.has_key_error ? 'Yes ⚠' : 'No', color: q.has_key_error ? RED : GREEN },
        ].map(item => (
          <div key={item.label} className="bg-white border border-[#EAECF0] rounded-xl p-4 shadow-sm">
            <p className="text-xs text-[#667085] uppercase font-semibold tracking-wide mb-1">{item.label}</p>
            <p className="text-xl font-bold" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#EAECF0] rounded-xl p-5 shadow-sm">
        <p className="text-sm font-semibold text-[#101828] mb-4">Response Distribution ({total} students)</p>
        <div className="flex gap-4 mb-3">
          {barData.map(b => (
            <div key={b.name} className="flex-1 text-center p-3 rounded-lg"
              style={{ backgroundColor: b.fill + '18' }}>
              <p className="text-2xl font-bold" style={{ color: b.fill }}>{b.value}</p>
              <p className="text-xs font-medium mt-1" style={{ color: b.fill }}>{b.name}</p>
              <p className="text-xs text-[#667085]">{total > 0 ? ((b.value / total) * 100).toFixed(0) : 0}%</p>
            </div>
          ))}
        </div>
        <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
          {barData.map(b => (
            total > 0
              ? <div key={b.name} style={{ width: `${(b.value / total) * 100}%`, backgroundColor: b.fill }} />
              : null
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: Student Summary
// ─────────────────────────────────────────────────────────────────────────────
function StudentSummaryView({
  examId, examName, studentId, studentName,
  onBack, onSubject,
}: {
  examId: string; examName: string; studentId: string; studentName: string
  onBack: () => void
  onSubject: (subjectId: string, subjectName: string) => void
}) {
  const [data,    setData   ] = useState<StudentSummaryAnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError  ] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setData(await getStudentSummary(studentId, examId)) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }, [studentId, examId])

  useEffect(() => { load() }, [load])

  if (loading) return <CenteredSpinner />
  if (error)   return <ErrorBox msg={error} onRetry={load} />
  if (!data)   return null

  return (
    <div>
      <Breadcrumb steps={[
        { label: 'Exams', onClick: onBack },
        { label: data.student.name },
      ]} />

      {/* Hero */}
      <div className="rounded-xl p-5 mb-5 text-white" style={{ backgroundColor: ACCENT }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">Student</p>
            <h2 className="text-xl font-bold">{data.student.name}</h2>
            <p className="text-sm opacity-80">{data.student.class_name} · Section {data.student.section_name} · {data.student.student_ref_id}</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full"
            style={{ color: riskColor(data.overall_risk), backgroundColor: riskBg(data.overall_risk) }}>
            {data.overall_risk}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-3 bg-white/10 rounded-xl p-3">
          {[
            { label: 'Marks',        value: `${data.total_marks}/${data.max_marks}` },
            { label: 'Percentage',   value: `${data.percentage.toFixed(1)}%` },
            { label: 'Class Rank',   value: `#${data.class_rank}` },
            { label: 'Section Rank', value: `#${data.section_rank}` },
          ].map(item => (
            <div key={item.label} className="text-center">
              <p className="text-base font-bold">{item.value}</p>
              <p className="text-xs opacity-70 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Subject breakdown */}
      <div className="bg-white border border-[#EAECF0] rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EAECF0]">
          <p className="text-sm font-semibold text-[#101828]">Subjects — click to see question breakdown</p>
        </div>
        <div className="divide-y divide-[#EAECF0]">
          {data.subjects.map((sub: StudentAnalyticsSubject) => (
            <div key={sub.subject_id}
              className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 cursor-pointer"
              onClick={() => onSubject(sub.subject_id, sub.subject_name)}
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-[#101828]">{sub.subject_name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <p className="text-xs text-[#667085]">{sub.total_marks}/{sub.max_marks} · {sub.percentage.toFixed(1)}% · Rank #{sub.exam_rank}</p>
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded"
                    style={{ color: perfColor(sub.performance_label), backgroundColor: perfColor(sub.performance_label) + '18' }}>
                    {perfLabel(sub.performance_label)}
                  </span>
                </div>
                <div className="mt-1.5 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div className="h-1.5 rounded-full"
                    style={{ width: `${Math.min(sub.percentage, 100)}%`, backgroundColor: riskColor(sub.risk_label) }} />
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <span className="text-xs font-bold px-2 py-1 rounded-full"
                  style={{ color: riskColor(sub.risk_label), backgroundColor: riskBg(sub.risk_label) }}>
                  {sub.risk_label}
                </span>
                <ChevronRight size={16} className="text-[#EAECF0]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: Student Subject Drill-down
// ─────────────────────────────────────────────────────────────────────────────
const Q_COLORS = { C: { bg: GREEN, text: WHITE }, W: { bg: RED, text: WHITE }, U: { bg: '#D0D5DD', text: MUTED } }

function StudentSubjectView({
  examId, examName, studentId, studentName, subjectId, subjectName,
  onBack,
}: {
  examId: string; examName: string; studentId: string; studentName: string
  subjectId: string; subjectName: string
  onBack: () => void
}) {
  const [data,    setData   ] = useState<StudentSubjectAnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError  ] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setData(await getStudentSubject(studentId, subjectId, examId)) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }, [studentId, subjectId, examId])

  useEffect(() => { load() }, [load])

  if (loading) return <CenteredSpinner />
  if (error)   return <ErrorBox msg={error} onRetry={load} />
  if (!data)   return null

  const r = data.result
  const cCount = data.questions.filter(q => q.status === 'C').length
  const wCount = data.questions.filter(q => q.status === 'W').length
  const uCount = data.questions.filter(q => q.status === 'U').length

  return (
    <div>
      <Breadcrumb steps={[
        { label: 'Exams', onClick: onBack },
        { label: `${studentName} — ${subjectName}` },
      ]} />

      {/* Hero */}
      <div className="rounded-xl p-5 mb-5 text-white" style={{ backgroundColor: ACCENT }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs opacity-70 uppercase tracking-wide mb-1">Subject Analysis</p>
            <h2 className="text-xl font-bold">{subjectName}</h2>
            <p className="text-sm opacity-80">{studentName} · {examName}</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full"
            style={{ color: riskColor(r.risk_label), backgroundColor: riskBg(r.risk_label) }}>
            {r.risk_label}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 bg-white/10 rounded-xl p-3">
          {[
            { label: 'Marks',      value: `${r.total_marks}/${r.max_marks}` },
            { label: 'Score',      value: `${r.percentage.toFixed(1)}%` },
            { label: 'Rank',       value: `#${r.exam_rank}` },
          ].map(item => (
            <div key={item.label} className="text-center">
              <p className="text-base font-bold">{item.value}</p>
              <p className="text-xs opacity-70 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 bg-white/20 rounded-full h-2 overflow-hidden">
          <div className="h-2 rounded-full bg-white" style={{ width: `${Math.min(r.percentage, 100)}%` }} />
        </div>
      </div>

      {/* Score breakdown */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { count: cCount, label: 'Correct',     bg: '#EAF7F1', color: GREEN },
          { count: wCount, label: 'Wrong',       bg: '#FEEDEB', color: RED   },
          { count: uCount, label: 'Skipped',     bg: '#F2F4F7', color: MUTED },
        ].map(item => (
          <div key={item.label} className="rounded-xl p-4 text-center" style={{ backgroundColor: item.bg }}>
            <p className="text-2xl font-bold" style={{ color: item.color }}>{item.count}</p>
            <p className="text-xs font-semibold mt-1" style={{ color: item.color }}>{item.label}</p>
          </div>
        ))}
      </div>

      {/* Performance */}
      <div className="bg-white border border-[#EAECF0] rounded-xl p-4 shadow-sm mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-[#667085] uppercase font-semibold tracking-wide mb-1">Performance</p>
          <p className="text-base font-bold" style={{ color: perfColor(r.performance_label) }}>{perfLabel(r.performance_label)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#667085] mb-1">z-score</p>
          <p className="text-xl font-bold" style={{ color: r.z_score >= 0 ? GREEN : RED }}>
            {r.z_score >= 0 ? '+' : ''}{r.z_score.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Question grid */}
      {data.questions.length > 0 && (
        <div className="bg-white border border-[#EAECF0] rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-4 mb-3">
            <p className="text-sm font-semibold text-[#101828]">Question Responses ({data.questions.length} total)</p>
            <div className="flex items-center gap-3 ml-auto">
              {([['C','Correct',GREEN], ['W','Wrong',RED], ['U','Skipped',MUTED]] as const).map(([s,l,c]) => (
                <div key={s} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: s === 'U' ? '#D0D5DD' : c }} />
                  <span className="text-xs text-[#667085]">{l}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.questions.map(q => {
              const c = Q_COLORS[q.status]
              return (
                <div key={q.q_no}
                  className="w-9 h-9 rounded-lg text-xs font-bold flex items-center justify-center"
                  style={{ backgroundColor: c.bg, color: c.text }}
                  title={`Q${q.q_no}: ${q.status === 'C' ? 'Correct' : q.status === 'W' ? 'Wrong' : 'Skipped'}`}
                >
                  {q.q_no}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN: Analytics Page
// ─────────────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // ── Derive current view from URL search params ─────────────────────────────
  const view = useMemo((): View => {
    const v = searchParams.get('v') ?? 'list'
    const g = (k: string) => searchParams.get(k) ?? ''
    switch (v) {
      case 'overview':
        return { kind: 'overview', examId: g('eid'), examName: g('en') }
      case 'section_detail':
        return { kind: 'section_detail', examId: g('eid'), examName: g('en'), sectionId: g('sid'), sectionName: g('sn') }
      case 'section_students':
        return { kind: 'section_students', examId: g('eid'), examName: g('en'), sectionId: g('sid'), sectionName: g('sn') }
      case 'heatmap':
        return { kind: 'heatmap', examId: g('eid'), examName: g('en'), sectionId: g('sid'), sectionName: g('sn'), subjectId: g('subid'), subjectName: g('subn') }
      case 'question_detail':
        return { kind: 'question_detail', examId: g('eid'), examName: g('en'), sectionId: g('sid'), sectionName: g('sn'), subjectId: g('subid'), subjectName: g('subn'), qNo: parseInt(g('qno')) || 1 }
      case 'student_summary':
        return { kind: 'student_summary', examId: g('eid'), examName: g('en'), studentId: g('stid'), studentName: g('stn') }
      case 'student_subject':
        return { kind: 'student_subject', examId: g('eid'), examName: g('en'), studentId: g('stid'), studentName: g('stn'), subjectId: g('subid'), subjectName: g('subn') }
      default:
        return { kind: 'list' }
    }
  }, [searchParams])

  // ── Navigation helpers ─────────────────────────────────────────────────────
  /** Push a new drill-down level — creates a browser history entry */
  function navTo(params: Record<string, string | number>) {
    const sp = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => sp.set(k, String(v)))
    navigate(`?${sp.toString()}`)
  }
  /** Go one step back in browser history */
  const navBack = () => navigate(-1)

  // Exam list state
  const [exams,   setExams  ] = useState<AnalyticsExam[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [sections,setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError  ] = useState('')

  // Create exam modal
  const [createModal,     setCreateModal    ] = useState(false)
  const [createForm,      setCreateForm     ] = useState({ exam_name: '', class_id: '', section_id: '' })
  const [createFormError, setCreateFormError] = useState('')
  const [createLoading,   setCreateLoading  ] = useState(false)

  // Upload modal
  const [uploadModal,   setUploadModal  ] = useState(false)
  const [uploadTarget,  setUploadTarget ] = useState<AnalyticsExam | null>(null)
  const [uploadFile,    setUploadFile   ] = useState<File | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadMsg,     setUploadMsg    ] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [examRes, classRes, secRes] = await Promise.allSettled([listExams(), getClasses(), getSections()])
      if (examRes.status  === 'fulfilled') setExams(examRes.value)
      else setError('Failed to load exams')
      if (classRes.status === 'fulfilled') setClasses(classRes.value)
      if (secRes.status   === 'fulfilled') setSections(secRes.value)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreateExam = async () => {
    if (!createForm.exam_name.trim()) { setCreateFormError('Exam name is required'); return }
    setCreateLoading(true)
    try {
      await createExam({ exam_name: createForm.exam_name.trim(), class_id: createForm.class_id || undefined, section_id: createForm.section_id || undefined })
      setCreateModal(false)
      setCreateForm({ exam_name: '', class_id: '', section_id: '' })
      fetchData()
    } catch (e: unknown) {
      setCreateFormError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleUpload = async () => {
    if (!uploadFile || !uploadTarget) { setUploadMsg('Select a file'); return }
    setUploadLoading(true); setUploadMsg('')
    try {
      await uploadExamFile(uploadTarget.id, uploadFile)
      setUploadMsg('Upload successful! Processing in background…')
      setTimeout(() => { setUploadModal(false); fetchData() }, 1800)
    } catch (e: unknown) {
      setUploadMsg(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploadLoading(false)
    }
  }

  const examColumns: TableColumn<AnalyticsExam>[] = [
    {
      key: 'exam_name', header: 'Exam Name',
      render: e => (
        <button onClick={() => e.analytics_status === 'DONE' && navTo({ v: 'overview', eid: e.id, en: e.exam_name })}
          className={`font-medium text-left ${e.analytics_status === 'DONE' ? 'text-[#185FA5] hover:underline' : 'text-[#101828]'}`}>
          {e.exam_name}
        </button>
      ),
    },
    { key: 'academic_class', header: 'Class', render: e => <span className="text-sm text-[#667085]">{e.academic_class?.name || '—'}</span> },
    { key: 'exam_date', header: 'Date', render: e => <span className="text-xs text-[#667085]">{formatDate(e.exam_date)}</span> },
    { key: 'analytics_status', header: 'Status', render: e => statusBadge(e.analytics_status) },
    {
      key: 'actions', header: 'Actions',
      render: e => (
        <div className="flex items-center gap-1">
          {e.analytics_status === 'CREATED' && (
            <button onClick={() => { setUploadTarget(e); setUploadFile(null); setUploadMsg(''); setUploadModal(true) }}
              className="p-1.5 rounded text-[#667085] hover:bg-blue-50 hover:text-[#185FA5]" title="Upload CSV">
              <Upload size={15} />
            </button>
          )}
          {e.analytics_status === 'DONE' && (
            <button onClick={() => navTo({ v: 'overview', eid: e.id, en: e.exam_name })}
              className="p-1.5 rounded text-[#667085] hover:bg-green-50 hover:text-[#16825D]" title="View Analytics">
              <Activity size={15} />
            </button>
          )}
        </div>
      ),
    },
  ]

  // ── Render drill-down screens ──────────────────────────────────────────────
  if (view.kind === 'overview') {
    return (
      <ExamOverviewView
        examId={view.examId} examName={view.examName}
        onBack={navBack}
        onSectionStudents={(sectionId, sectionName) =>
          navTo({ v: 'section_students', eid: view.examId, en: view.examName, sid: sectionId, sn: sectionName })}
        onSectionDetail={(sectionId, sectionName) =>
          navTo({ v: 'section_detail', eid: view.examId, en: view.examName, sid: sectionId, sn: sectionName })}
      />
    )
  }

  if (view.kind === 'section_detail') {
    return (
      <SectionDetailView
        examId={view.examId} examName={view.examName}
        sectionId={view.sectionId} sectionName={view.sectionName}
        onBack={navBack}
        onHeatmap={(subjectId, subjectName) =>
          navTo({ v: 'heatmap', eid: view.examId, en: view.examName, sid: view.sectionId, sn: view.sectionName, subid: subjectId, subn: subjectName })}
      />
    )
  }

  if (view.kind === 'section_students') {
    return (
      <SectionStudentsView
        examId={view.examId} examName={view.examName}
        sectionId={view.sectionId} sectionName={view.sectionName}
        onBack={navBack}
        onStudent={(studentId, studentName) =>
          navTo({ v: 'student_summary', eid: view.examId, en: view.examName, stid: studentId, stn: studentName })}
      />
    )
  }

  if (view.kind === 'heatmap') {
    return (
      <HeatmapView
        examId={view.examId} examName={view.examName}
        sectionId={view.sectionId} sectionName={view.sectionName}
        subjectId={view.subjectId} subjectName={view.subjectName}
        onBack={navBack}
        onQuestion={qNo =>
          navTo({ v: 'question_detail', eid: view.examId, en: view.examName, sid: view.sectionId, sn: view.sectionName, subid: view.subjectId, subn: view.subjectName, qno: qNo })}
      />
    )
  }

  if (view.kind === 'question_detail') {
    return (
      <QuestionDetailView
        examId={view.examId} examName={view.examName}
        sectionId={view.sectionId} sectionName={view.sectionName}
        subjectId={view.subjectId} subjectName={view.subjectName}
        qNo={view.qNo}
        onBack={navBack}
      />
    )
  }

  if (view.kind === 'student_summary') {
    return (
      <StudentSummaryView
        examId={view.examId} examName={view.examName}
        studentId={view.studentId} studentName={view.studentName}
        onBack={navBack}
        onSubject={(subjectId, subjectName) =>
          navTo({ v: 'student_subject', eid: view.examId, en: view.examName, stid: view.studentId, stn: view.studentName, subid: subjectId, subn: subjectName })}
      />
    )
  }

  if (view.kind === 'student_subject') {
    return (
      <StudentSubjectView
        examId={view.examId} examName={view.examName}
        studentId={view.studentId} studentName={view.studentName}
        subjectId={view.subjectId} subjectName={view.subjectName}
        onBack={navBack}
      />
    )
  }

  // ── Exam list (default) ────────────────────────────────────────────────────
  if (loading) return <CenteredSpinner />

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Exam results and academic performance"
        action={
          <Button variant="primary" size="sm" leftIcon={<Plus size={16} />}
            onClick={() => { setCreateForm({ exam_name: '', class_id: '', section_id: '' }); setCreateFormError(''); setCreateModal(true) }}>
            Create Exam
          </Button>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-[#FEE4E2] rounded-lg text-sm text-[#D92D20] border border-[#D92D20]/20">{error}</div>
      )}

      <div className="bg-white border border-[#EAECF0] rounded-xl shadow-sm overflow-hidden">
        {exams.length === 0 ? (
          <EmptyState icon={<BarChart3 size={48} />} title="No exams yet"
            description="Create an exam and upload CSV results to see analytics."
            action={<Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setCreateModal(true)}>Create Exam</Button>}
          />
        ) : (
          <Table columns={examColumns} data={exams} keyExtractor={e => e.id} emptyMessage="No exams found" />
        )}
      </div>

      {/* Create exam modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create Exam"
        footer={<>
          <Button variant="secondary" onClick={() => setCreateModal(false)}>Cancel</Button>
          <Button variant="primary" loading={createLoading} onClick={handleCreateExam}>Create</Button>
        </>}
      >
        <div className="space-y-4">
          {createFormError && (
            <div className="flex items-center gap-2 p-2 bg-[#FEE4E2] rounded-lg">
              <AlertCircle size={14} className="text-[#D92D20]" />
              <p className="text-sm text-[#D92D20]">{createFormError}</p>
            </div>
          )}
          <Input label="Exam Name" placeholder="e.g. Mid-Term 2024" autoFocus
            value={createForm.exam_name} onChange={e => setCreateForm(f => ({ ...f, exam_name: e.target.value }))} />
          <Select label="Class (optional)" placeholder="Select class…"
            options={[{ value: '', label: '— None —' }, ...classes.map(c => ({ value: c.id, label: c.name }))]}
            value={createForm.class_id}
            onChange={e => setCreateForm(f => ({ ...f, class_id: e.target.value, section_id: '' }))} />
          <Select label="Section (optional)" placeholder="Select section…"
            options={[{ value: '', label: '— None —' }, ...sections.filter(s => !createForm.class_id || s.academic_class.id === createForm.class_id).map(s => ({ value: s.id, label: `${s.academic_class.name} — ${s.name}` }))]}
            value={createForm.section_id}
            onChange={e => setCreateForm(f => ({ ...f, section_id: e.target.value }))} />
          <p className="text-xs text-[#667085]">Provide class for a class-level exam, or section for a section-level exam.</p>
        </div>
      </Modal>

      {/* Upload modal */}
      <Modal open={uploadModal} onClose={() => setUploadModal(false)} size="sm"
        title={`Upload Results — ${uploadTarget?.exam_name || ''}`}
        footer={<>
          <Button variant="secondary" onClick={() => setUploadModal(false)}>Cancel</Button>
          <Button variant="primary" loading={uploadLoading} onClick={handleUpload}>Upload</Button>
        </>}
      >
        <div className="space-y-3">
          <p className="text-sm text-[#667085]">
            Upload a CSV for <span className="font-semibold text-[#101828]">{uploadTarget?.exam_name}</span>.
          </p>
          <input type="file" accept=".csv"
            onChange={e => setUploadFile(e.target.files?.[0] || null)}
            className="text-sm text-[#667085] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#185FA5] file:text-white hover:file:bg-[#185FA5]/90" />
          {uploadMsg && (
            <p className={`text-sm ${uploadMsg.includes('successful') ? 'text-[#16825D]' : 'text-[#D92D20]'}`}>{uploadMsg}</p>
          )}
        </div>
      </Modal>
    </div>
  )
}
