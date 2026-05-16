import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Upload, BarChart3, ArrowLeft, Trophy, AlertCircle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
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
import { listExams, createExam, uploadExamFile, getExamOverview } from '../api/analytics'
import { getClasses, getSections } from '../api/principal'
import type { AnalyticsExam, AnalyticsStatus, ExamOverviewResponse, SchoolClass, Section } from '../types'

function statusBadge(status: AnalyticsStatus) {
  const MAP: Record<AnalyticsStatus, 'default' | 'warning' | 'info' | 'success' | 'danger'> = {
    CREATED: 'default', PENDING: 'warning', RUNNING: 'info', DONE: 'success', FAILED: 'danger',
  }
  return <Badge variant={MAP[status]}>{status}</Badge>
}

const CHART_COLORS = ['#185FA5','#16825D','#C76A00','#9B59B6','#E74C3C']

export default function AnalyticsPage() {
  const [exams,   setExams  ] = useState<AnalyticsExam[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError  ] = useState('')

  // Create exam
  const [createModal,     setCreateModal    ] = useState(false)
  const [createForm,      setCreateForm     ] = useState({ exam_name: '', class_id: '', section_id: '' })
  const [createFormError, setCreateFormError] = useState('')
  const [createLoading,   setCreateLoading  ] = useState(false)

  // Upload
  const [uploadModal,   setUploadModal  ] = useState(false)
  const [uploadTarget,  setUploadTarget ] = useState<AnalyticsExam | null>(null)
  const [uploadFile,    setUploadFile   ] = useState<File | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadMsg,     setUploadMsg    ] = useState('')

  // Detail
  const [examDetail,        setExamDetail       ] = useState<ExamOverviewResponse | null>(null)
  const [examDetailLoading, setExamDetailLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [examRes, classRes, secRes] = await Promise.allSettled([
        listExams(),
        getClasses(),
        getSections(),
      ])
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
      await createExam({
        exam_name:  createForm.exam_name.trim(),
        class_id:   createForm.class_id   || undefined,
        section_id: createForm.section_id || undefined,
      })
      setCreateModal(false)
      setCreateForm({ exam_name: '', class_id: '', section_id: '' })
      fetchData()
    } catch (err) {
      setCreateFormError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setCreateLoading(false)
    }
  }

  const openUpload = (exam: AnalyticsExam) => {
    setUploadTarget(exam); setUploadFile(null); setUploadMsg(''); setUploadModal(true)
  }

  const handleUpload = async () => {
    if (!uploadFile || !uploadTarget) { setUploadMsg('Please select a CSV file'); return }
    setUploadLoading(true); setUploadMsg('')
    try {
      await uploadExamFile(uploadTarget.id, uploadFile)
      setUploadMsg('Upload successful! Processing in background…')
      setTimeout(() => { setUploadModal(false); fetchData() }, 1800)
    } catch (err) {
      setUploadMsg(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadLoading(false)
    }
  }

  const openExamDetail = async (exam: AnalyticsExam) => {
    if (exam.analytics_status !== 'DONE') return
    setExamDetailLoading(true)
    try {
      const data = await getExamOverview(exam.id)
      setExamDetail(data)
    } catch {
      setExamDetail(null)
    } finally {
      setExamDetailLoading(false)
    }
  }

  const columns: TableColumn<AnalyticsExam>[] = [
    {
      key: 'exam_name',
      header: 'Exam Name',
      render: (e) => (
        <button
          onClick={() => e.analytics_status === 'DONE' && openExamDetail(e)}
          className={`font-medium text-left ${e.analytics_status === 'DONE' ? 'text-[#185FA5] hover:underline' : 'text-[#101828]'}`}
        >
          {e.exam_name}
        </button>
      ),
    },
    {
      key: 'academic_class',
      header: 'Class',
      render: (e) => <span className="text-[#667085]">{e.academic_class?.name || '—'}</span>,
    },
    {
      key: 'exam_date',
      header: 'Date',
      render: (e) => (
        <span className="text-xs text-[#667085]">
          {e.exam_date ? new Date(e.exam_date).toLocaleDateString('en-IN') : '—'}
        </span>
      ),
    },
    {
      key: 'analytics_status',
      header: 'Status',
      render: (e) => statusBadge(e.analytics_status),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (e) => (
        <div className="flex items-center gap-2">
          {e.analytics_status === 'CREATED' && (
            <button
              onClick={() => openUpload(e)}
              className="p-1.5 rounded text-[#667085] hover:bg-blue-50 hover:text-[#185FA5]"
              title="Upload CSV"
            >
              <Upload size={15} />
            </button>
          )}
          {e.analytics_status === 'DONE' && (
            <button
              onClick={() => openExamDetail(e)}
              className="p-1.5 rounded text-[#667085] hover:bg-green-50 hover:text-[#16825D]"
              title="View Analytics"
            >
              <BarChart3 size={15} />
            </button>
          )}
        </div>
      ),
    },
  ]

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" className="text-[#185FA5]" /></div>
  if (examDetailLoading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" className="text-[#185FA5]" /></div>

  // ── Exam detail view ──────────────────────────────────────────────────────
  if (examDetail) {
    const avgs = examDetail.class_avgs ?? examDetail.subject_avgs ?? []
    const sections_list = examDetail.sections ?? []
    const top = examDetail.top_students ?? []

    const chartData = avgs.map(a => ({
      subject: a.subject_name,
      average: a.max_marks > 0 ? Math.round((a.avg / a.max_marks) * 100) : 0,
    }))

    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setExamDetail(null)} className="flex items-center gap-1.5 text-sm text-[#185FA5] hover:underline">
            <ArrowLeft size={16} />Back to exams
          </button>
          <span className="text-[#EAECF0]">|</span>
          <h2 className="text-sm font-semibold text-[#101828]">{examDetail.exam.exam_name}</h2>
          {statusBadge(examDetail.exam.analytics_status)}
        </div>

        {chartData.length > 0 && (
          <div className="bg-white border border-[#EAECF0] rounded-xl p-5 shadow-sm mb-5">
            <h3 className="text-sm font-semibold text-[#101828] mb-4">Subject-wise Class Averages</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAECF0" vertical={false} />
                <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#667085' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#667085' }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={{ border: 'none', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v}%`, 'Average']} />
                <Bar dataKey="average" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {sections_list.length > 0 && (
          <div className="bg-white border border-[#EAECF0] rounded-xl shadow-sm mb-5 overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EAECF0]">
              <h3 className="text-sm font-semibold text-[#101828]">Section Performance</h3>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Section','Average Score'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#667085] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECF0]">
                {sections_list.map(sec => (
                  <tr key={sec.section_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-[#101828]">Section {sec.section_name}</td>
                    <td className="px-4 py-3 text-sm text-[#101828]">{sec.avg !== undefined ? `${sec.avg.toFixed(1)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {top.length > 0 && (
          <div className="bg-white border border-[#EAECF0] rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EAECF0] flex items-center gap-2">
              <Trophy size={16} className="text-[#C76A00]" />
              <h3 className="text-sm font-semibold text-[#101828]">Top Students</h3>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Rank','Student','Ref ID','Total Marks'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#667085] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECF0]">
                {top.map((st, i) => (
                  <tr key={st.student_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-bold text-[#C76A00]">#{st.rank ?? i + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-[#101828]">{st.name}</td>
                    <td className="px-4 py-3 text-sm text-[#667085]">{st.student_ref_id}</td>
                    <td className="px-4 py-3 text-sm text-[#101828]">{st.total_marks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!chartData.length && !sections_list.length && !top.length && (
          <EmptyState icon={<BarChart3 size={48} />} title="No overview data" description="Exam overview data is not available." />
        )}
      </div>
    )
  }

  // ── Exam list view ────────────────────────────────────────────────────────
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
        <div className="mb-4 p-3 bg-[#FEE4E2] border border-[#D92D20]/20 rounded-lg text-sm text-[#D92D20]">
          {error}
        </div>
      )}

      <div className="bg-white border border-[#EAECF0] rounded-xl shadow-sm overflow-hidden">
        {exams.length === 0 ? (
          <EmptyState icon={<BarChart3 size={48} />} title="No exams yet"
            description="Create an exam and upload CSV results to see analytics."
            action={<Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setCreateModal(true)}>Create Exam</Button>}
          />
        ) : (
          <Table columns={columns} data={exams} keyExtractor={e => e.id} emptyMessage="No exams found" />
        )}
      </div>

      {/* ── Create exam modal ── */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create Exam"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateModal(false)}>Cancel</Button>
            <Button variant="primary" loading={createLoading} onClick={handleCreateExam}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          {createFormError && (
            <div className="flex items-center gap-2 p-2 bg-[#FEE4E2] rounded-lg">
              <AlertCircle size={14} className="text-[#D92D20]" />
              <p className="text-sm text-[#D92D20]">{createFormError}</p>
            </div>
          )}
          <Input label="Exam Name" placeholder="e.g. Mid-Term 2024" autoFocus
            value={createForm.exam_name}
            onChange={e => setCreateForm(f => ({ ...f, exam_name: e.target.value }))} />
          <Select label="Class (optional)" placeholder="Select class…"
            options={classes.map(c => ({ value: c.id, label: c.name }))}
            value={createForm.class_id}
            onChange={e => setCreateForm(f => ({ ...f, class_id: e.target.value, section_id: '' }))} />
          <Select label="Section (optional)" placeholder="Select section…"
            options={sections
              .filter(s => !createForm.class_id || s.academic_class.id === createForm.class_id)
              .map(s => ({ value: s.id, label: `${s.academic_class.name} — ${s.name}` }))}
            value={createForm.section_id}
            onChange={e => setCreateForm(f => ({ ...f, section_id: e.target.value }))} />
          <p className="text-xs text-[#667085]">Provide either a class or a section, not both.</p>
        </div>
      </Modal>

      {/* ── Upload modal ── */}
      <Modal open={uploadModal} onClose={() => setUploadModal(false)} size="sm"
        title={`Upload Results — ${uploadTarget?.exam_name || ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setUploadModal(false)}>Cancel</Button>
            <Button variant="primary" loading={uploadLoading} onClick={handleUpload}>Upload</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[#667085]">
            Upload a CSV file with exam results for <span className="font-semibold text-[#101828]">{uploadTarget?.exam_name}</span>.
          </p>
          <input type="file" accept=".csv"
            onChange={e => setUploadFile(e.target.files?.[0] || null)}
            className="text-sm text-[#667085] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#185FA5] file:text-white hover:file:bg-[#185FA5]/90" />
          {uploadMsg && (
            <p className={`text-sm ${uploadMsg.includes('successful') ? 'text-[#16825D]' : 'text-[#D92D20]'}`}>
              {uploadMsg}
            </p>
          )}
        </div>
      </Modal>
    </div>
  )
}
