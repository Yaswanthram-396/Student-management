import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Upload, BarChart3, ArrowLeft, Trophy, AlertCircle } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Badge } from '../components/ui/Badge'
import { Table, TableColumn } from '../components/ui/Table'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { listExams, createExam, uploadExam, getExamOverview } from '../api/analytics'
import { getClasses, getAllSections } from '../api/principal'
import type { Exam, ExamOverview, SchoolClass, Section } from '../types'

type ExamStatus = 'CREATED' | 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED'

function statusBadge(status: ExamStatus) {
  const map: Record<ExamStatus, 'default' | 'warning' | 'info' | 'success' | 'danger'> = {
    CREATED: 'default',
    PENDING: 'warning',
    RUNNING: 'info',
    DONE: 'success',
    FAILED: 'danger',
  }
  return <Badge variant={map[status]}>{status}</Badge>
}

export default function AnalyticsPage() {
  const [exams, setExams] = useState<Exam[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Create exam modal
  const [createModal, setCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', class_id: '', section_id: '' })
  const [createFormError, setCreateFormError] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  // Upload modal
  const [uploadModal, setUploadModal] = useState(false)
  const [uploadTarget, setUploadTarget] = useState<Exam | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')

  // Exam detail
  const [examDetail, setExamDetail] = useState<ExamOverview | null>(null)
  const [examDetailLoading, setExamDetailLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [examData, classData, sectionData] = await Promise.allSettled([
        listExams(),
        getClasses(),
        getAllSections(),
      ])
      if (examData.status === 'fulfilled') setExams(examData.value)
      else setError('Failed to load exams')
      if (classData.status === 'fulfilled') setClasses(classData.value)
      if (sectionData.status === 'fulfilled') setSections(sectionData.value)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreateExam = async () => {
    if (!createForm.name.trim()) {
      setCreateFormError('Exam name is required')
      return
    }
    setCreateLoading(true)
    try {
      await createExam({
        name: createForm.name.trim(),
        class_id: createForm.class_id ? Number(createForm.class_id) : undefined,
        section_id: createForm.section_id ? Number(createForm.section_id) : undefined,
      })
      setCreateModal(false)
      setCreateForm({ name: '', class_id: '', section_id: '' })
      fetchData()
    } catch (err) {
      setCreateFormError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setCreateLoading(false)
    }
  }

  const openUpload = (exam: Exam) => {
    setUploadTarget(exam)
    setUploadFile(null)
    setUploadMsg('')
    setUploadModal(true)
  }

  const handleUpload = async () => {
    if (!uploadFile || !uploadTarget) {
      setUploadMsg('Please select a file')
      return
    }
    setUploadLoading(true)
    setUploadMsg('')
    try {
      await uploadExam(uploadTarget.id, uploadFile)
      setUploadMsg('Upload successful! Processing...')
      setTimeout(() => {
        setUploadModal(false)
        fetchData()
      }, 1500)
    } catch (err) {
      setUploadMsg(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadLoading(false)
    }
  }

  const openExamDetail = async (exam: Exam) => {
    if (exam.status !== 'DONE') return
    setExamDetailLoading(true)
    try {
      const data = await getExamOverview(exam.id)
      setExamDetail(data)
    } catch {
      setExamDetail({ id: exam.id, name: exam.name, status: exam.status })
    } finally {
      setExamDetailLoading(false)
    }
  }

  const columns: TableColumn<Exam>[] = [
    {
      key: 'name',
      header: 'Exam Name',
      render: (e) => (
        <button
          onClick={() => e.status === 'DONE' && openExamDetail(e)}
          className={`font-medium text-left ${e.status === 'DONE' ? 'text-[#185FA5] hover:underline' : 'text-[#101828]'}`}
        >
          {e.name}
        </button>
      ),
    },
    {
      key: 'class_name',
      header: 'Class',
      render: (e) => <span className="text-[#667085]">{e.class_name || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (e) => statusBadge(e.status as ExamStatus),
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (e) => (
        <span className="text-[#667085] text-xs">
          {e.created_at ? new Date(e.created_at).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (e) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openUpload(e)}
            className="p-1.5 rounded-md text-[#667085] hover:bg-blue-50 hover:text-[#185FA5] transition-colors"
            title="Upload Results"
          >
            <Upload size={15} />
          </button>
          {e.status === 'DONE' && (
            <button
              onClick={() => openExamDetail(e)}
              className="p-1.5 rounded-md text-[#667085] hover:bg-green-50 hover:text-[#16825D] transition-colors"
              title="View Overview"
            >
              <BarChart3 size={15} />
            </button>
          )}
        </div>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" className="text-[#185FA5]" />
      </div>
    )
  }

  // Exam overview detail page
  if (examDetailLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" className="text-[#185FA5]" />
      </div>
    )
  }

  if (examDetail) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => setExamDetail(null)}
            className="flex items-center gap-1.5 text-sm text-[#185FA5] hover:underline"
          >
            <ArrowLeft size={16} />
            Back to exams
          </button>
          <span className="text-[#EAECF0]">|</span>
          <h2 className="text-sm font-semibold text-[#101828]">{examDetail.name}</h2>
          {statusBadge(examDetail.status as ExamStatus)}
        </div>

        {/* Class averages chart */}
        {examDetail.class_averages && examDetail.class_averages.length > 0 && (
          <div className="bg-white border border-[#EAECF0] rounded-xl p-5 shadow-sm mb-5">
            <h3 className="text-sm font-semibold text-[#101828] mb-4">Subject-wise Class Averages</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={examDetail.class_averages} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAECF0" vertical={false} />
                <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#667085' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#667085' }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ border: 'none', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`${v}%`, 'Average']}
                />
                <Bar dataKey="average" radius={[4, 4, 0, 0]}>
                  {examDetail.class_averages!.map((_, i) => (
                    <Cell key={i} fill={['#185FA5', '#16825D', '#C76A00', '#9B59B6', '#E74C3C'][i % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Section performance */}
        {examDetail.sections && examDetail.sections.length > 0 && (
          <div className="bg-white border border-[#EAECF0] rounded-xl shadow-sm mb-5 overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EAECF0]">
              <h3 className="text-sm font-semibold text-[#101828]">Section Performance</h3>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#667085] uppercase">Section</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#667085] uppercase">Average</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#667085] uppercase">Pass</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#667085] uppercase">Fail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECF0]">
                {examDetail.sections.map((sec) => (
                  <tr key={sec.section_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-[#101828]">
                      {sec.class_name ? `${sec.class_name} — ${sec.section_name}` : sec.section_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#101828]">
                      {sec.average !== undefined ? `${sec.average}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#16825D] font-medium">{sec.pass_count ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-[#D92D20] font-medium">{sec.fail_count ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Top students */}
        {examDetail.top_students && examDetail.top_students.length > 0 && (
          <div className="bg-white border border-[#EAECF0] rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EAECF0] flex items-center gap-2">
              <Trophy size={16} className="text-[#C76A00]" />
              <h3 className="text-sm font-semibold text-[#101828]">Top Students</h3>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#667085] uppercase">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#667085] uppercase">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#667085] uppercase">Total Marks</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#667085] uppercase">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECF0]">
                {examDetail.top_students.map((st, i) => (
                  <tr key={st.student_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-bold text-[#C76A00]">#{st.rank ?? i + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-[#101828]">{st.student_name}</td>
                    <td className="px-4 py-3 text-sm text-[#101828]">{st.total_marks ?? '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-[#16825D]">
                      {st.percentage !== undefined ? `${st.percentage}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!examDetail.class_averages?.length && !examDetail.sections?.length && !examDetail.top_students?.length && (
          <EmptyState
            icon={<BarChart3 size={48} />}
            title="No overview data"
            description="Exam overview data is not available yet."
          />
        )}
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Exam results and academic performance"
        action={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={16} />}
            onClick={() => { setCreateForm({ name: '', class_id: '', section_id: '' }); setCreateFormError(''); setCreateModal(true) }}
          >
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
          <EmptyState
            icon={<BarChart3 size={48} />}
            title="No exams yet"
            description="Create an exam and upload results to see analytics."
            action={
              <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setCreateModal(true)}>
                Create Exam
              </Button>
            }
          />
        ) : (
          <Table
            columns={columns}
            data={exams}
            keyExtractor={(e) => e.id}
            emptyMessage="No exams found"
          />
        )}
      </div>

      {/* Create Exam Modal */}
      <Modal
        open={createModal}
        onClose={() => setCreateModal(false)}
        title="Create Exam"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={createLoading} onClick={handleCreateExam}>
              Create
            </Button>
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
          <Input
            label="Exam Name"
            placeholder="e.g. Mid-Term 2024"
            value={createForm.name}
            onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
            autoFocus
          />
          <Select
            label="Class (optional)"
            placeholder="Select class..."
            options={classes.map((c) => ({ value: c.id, label: c.name }))}
            value={createForm.class_id}
            onChange={(e) => setCreateForm((f) => ({ ...f, class_id: e.target.value }))}
          />
          <Select
            label="Section (optional)"
            placeholder="Select section..."
            options={sections.map((s) => ({
              value: s.id,
              label: s.class_name ? `${s.class_name} — ${s.name}` : s.name,
            }))}
            value={createForm.section_id}
            onChange={(e) => setCreateForm((f) => ({ ...f, section_id: e.target.value }))}
          />
        </div>
      </Modal>

      {/* Upload Modal */}
      <Modal
        open={uploadModal}
        onClose={() => setUploadModal(false)}
        title={`Upload Results — ${uploadTarget?.name || ''}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setUploadModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={uploadLoading} onClick={handleUpload}>
              Upload
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[#667085]">
            Upload a CSV file containing the exam results for{' '}
            <span className="font-semibold text-[#101828]">{uploadTarget?.name}</span>.
          </p>
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            className="text-sm text-[#667085] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#185FA5] file:text-white hover:file:bg-[#185FA5]/90"
          />
          {uploadMsg && (
            <p className={`text-sm ${uploadMsg.includes('success') ? 'text-[#16825D]' : 'text-[#D92D20]'}`}>
              {uploadMsg}
            </p>
          )}
        </div>
      </Modal>
    </div>
  )
}
