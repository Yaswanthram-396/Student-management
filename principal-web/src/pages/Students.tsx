import React, { useEffect, useState, useRef } from 'react'
import { GraduationCap, CloudUpload } from 'lucide-react'
import { PageHeader }  from '../components/ui/PageHeader'
import { Button }      from '../components/ui/Button'
import { Select }      from '../components/ui/Select'
import { Table, TableColumn } from '../components/ui/Table'
import { EmptyState }  from '../components/ui/EmptyState'
import { Spinner }     from '../components/ui/Spinner'
import { getClasses, getSections, getSectionStudents, bulkUploadStudents, getStudentBulkUploadStatus } from '../api/principal'
import type { SchoolClass, Section, SectionStudent } from '../types'

export default function StudentsPage() {
  const [classes,          setClasses         ] = useState<SchoolClass[]>([])
  const [sections,         setSections        ] = useState<Section[]>([])
  const [students,         setStudents        ] = useState<SectionStudent[]>([])
  const [selectedClass,    setSelectedClass   ] = useState('')
  const [selectedSection,  setSelectedSection ] = useState('')
  const [loadingClasses,   setLoadingClasses  ] = useState(true)
  const [loadingSections,  setLoadingSections ] = useState(false)
  const [loadingStudents,  setLoadingStudents ] = useState(false)
  const [error,            setError           ] = useState('')

  // Bulk upload
  const [dragOver,      setDragOver     ] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadMsg,     setUploadMsg    ] = useState('')
  const [uploadStatus,  setUploadStatus ] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load classes on mount
  useEffect(() => {
    setLoadingClasses(true)
    getClasses()
      .then(setClasses)
      .catch(() => setError('Failed to load classes'))
      .finally(() => setLoadingClasses(false))
  }, [])

  // Load sections when class changes
  useEffect(() => {
    if (!selectedClass) { setSections([]); setSelectedSection(''); return }
    setLoadingSections(true)
    getSections(selectedClass)
      .then(data => { setSections(data); setSelectedSection('') })
      .catch(() => setError('Failed to load sections'))
      .finally(() => setLoadingSections(false))
  }, [selectedClass])

  // Load students when section changes
  useEffect(() => {
    if (!selectedSection) { setStudents([]); return }
    setLoadingStudents(true)
    setError('')
    getSectionStudents(selectedSection)
      .then(setStudents)
      .catch(() => setError('Failed to load students'))
      .finally(() => setLoadingStudents(false))
  }, [selectedSection])

  const handleFileUpload = async (file: File) => {
    setUploadLoading(true)
    setUploadMsg('')
    setUploadStatus('')
    try {
      const res = await bulkUploadStudents(file)
      setUploadStatus(res.status)
      setUploadMsg(`Upload started (${res.total_rows} rows). Batch: ${res.batch_id}`)
      // Poll for completion
      let attempts = 0
      const poll = async () => {
        try {
          const status = await getStudentBulkUploadStatus(res.batch_id)
          setUploadStatus(status.status)
          if (status.status === 'COMPLETED' || status.status === 'FAILED') {
            setUploadMsg(`${status.status}: ${status.success_count} success, ${status.error_count} errors.`)
            if (status.status === 'COMPLETED' && selectedSection) {
              const data = await getSectionStudents(selectedSection)
              setStudents(data)
            }
          } else if (attempts < 10) {
            attempts++
            setTimeout(poll, 2000)
          }
        } catch { /* ignore poll errors */ }
      }
      setTimeout(poll, 1500)
    } catch (err) {
      setUploadMsg(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadLoading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  const columns: TableColumn<SectionStudent>[] = [
    {
      key: 'roll_number',
      header: 'Roll No.',
      render: (s) => <span className="font-mono text-sm text-[#667085]">{s.roll_number || '—'}</span>,
    },
    {
      key: 'name',
      header: 'Name',
      render: (s) => <span className="text-sm font-medium text-[#101828]">{s.name}</span>,
    },
    {
      key: 'admission_number',
      header: 'Admission No.',
      render: (s) => <span className="text-sm text-[#667085]">{s.admission_number || '—'}</span>,
    },
    {
      key: 'section',
      header: 'Section',
      render: (s) => (
        <span className="text-sm text-[#667085]">
          {s.academic_class.name} — {s.section.name}
        </span>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Students" subtitle="View students by class and section, or bulk upload" />

      {error && (
        <div className="mb-4 p-3 bg-[#FEE4E2] rounded-lg text-sm text-[#D92D20] border border-[#D92D20]/20">{error}</div>
      )}

      {/* Class + Section selectors */}
      <div className="flex flex-wrap gap-3 mb-5">
        {loadingClasses ? <Spinner size="sm" className="text-[#185FA5]" /> : (
          <Select label="Class" placeholder="Select class…"
            options={classes.map(c => ({ value: c.id, label: c.name }))}
            value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
            className="w-48" />
        )}
        {selectedClass && (
          loadingSections ? <div className="flex items-end pb-2"><Spinner size="sm" className="text-[#185FA5]" /></div> : (
            <Select label="Section" placeholder="Select section…"
              options={sections.map(s => ({ value: s.id, label: s.name }))}
              value={selectedSection} onChange={e => setSelectedSection(e.target.value)}
              className="w-48" />
          )
        )}
      </div>

      {/* Bulk upload */}
      <div className="mb-6">
        <div
          className={`rounded-[12px] p-8 text-center transition-all duration-200 ${
            dragOver
              ? 'bg-[#F0F4FF] border-2 border-[#185FA5]'
              : 'bg-[#F8FAFF] border-2 hover:border-[#185FA5]/60'
          }`}
          style={{
            borderStyle: 'dashed',
            borderColor: dragOver ? '#185FA5' : '#BFDBFE',
          }}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-3">
            {uploadLoading ? (
              <Spinner size="md" className="text-[#185FA5]" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-[#F0F4FF] border border-[#DBEAFE] flex items-center justify-center">
                <CloudUpload size={24} className="text-[#185FA5]" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-[#1a2340]">
                Drag & drop a CSV file, or{' '}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[#185FA5] hover:underline font-bold"
                >
                  browse to upload
                </button>
              </p>
              <p className="text-xs text-[#4B6FA8] mt-1.5 font-medium">
                Required: student_name, class, section, parent_name, parent_mobile_number
              </p>
              <p className="text-xs text-[#667085] mt-0.5">
                Optional: roll_number, admission_number, student_username, parent_username
              </p>
            </div>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = '' }} />
          </div>
        </div>
        {uploadMsg && (
          <div className={`mt-3 flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-sm font-semibold border ${
            uploadStatus === 'COMPLETED'
              ? 'bg-[#DCFAE6] text-[#16825D] border-[#ABEFC6]'
              : uploadStatus === 'FAILED'
              ? 'bg-[#FEE4E2] text-[#D92D20] border-[#FCA5A5]'
              : 'bg-[#EFF8FF] text-[#185FA5] border-[#BFDBFE]'
          }`}>
            {uploadMsg}
          </div>
        )}
      </div>

      {/* Styled "or" divider */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#DBEAFE]" />
        <span className="text-xs font-bold text-[#4B6FA8] px-3 py-1 rounded-full bg-[#F0F4FF] border border-[#DBEAFE]">
          OR VIEW BY CLASS
        </span>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#DBEAFE]" />
      </div>

      {/* Student list */}
      {!selectedSection ? (
        <EmptyState icon={<GraduationCap size={40} />} title="Select a class and section"
          description="Choose a class and section above to view its student list." />
      ) : (
        <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#F0F4FF] bg-[#F8FAFF]">
            <p className="text-sm font-bold text-[#1a2340]">
              {students.length} student{students.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Table columns={columns} data={students} loading={loadingStudents}
            keyExtractor={s => s.id} emptyMessage="No students in this section" />
        </div>
      )}
    </div>
  )
}
