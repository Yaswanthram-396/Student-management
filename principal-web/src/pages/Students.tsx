import React, { useEffect, useState, useCallback, useRef } from 'react'
import { GraduationCap, Upload, CloudUpload } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Select } from '../components/ui/Select'
import { Table, TableColumn } from '../components/ui/Table'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'
import { getClasses, getSections, getSectionStudents } from '../api/principal'
import type { SchoolClass, Section, Student } from '../types'
import { apiPostForm } from '../api/client'

export default function StudentsPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [loadingSections, setLoadingSections] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [error, setError] = useState('')

  // Bulk upload
  const [dragOver, setDragOver] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLoadingClasses(true)
    getClasses()
      .then(setClasses)
      .catch(() => setError('Failed to load classes'))
      .finally(() => setLoadingClasses(false))
  }, [])

  useEffect(() => {
    if (!selectedClass) {
      setSections([])
      setSelectedSection('')
      return
    }
    setLoadingSections(true)
    getSections(Number(selectedClass))
      .then((data) => {
        setSections(data)
        setSelectedSection('')
      })
      .catch(() => setError('Failed to load sections'))
      .finally(() => setLoadingSections(false))
  }, [selectedClass])

  useEffect(() => {
    if (!selectedSection) {
      setStudents([])
      return
    }
    setLoadingStudents(true)
    setError('')
    getSectionStudents(Number(selectedSection))
      .then(setStudents)
      .catch(() => setError('Failed to load students'))
      .finally(() => setLoadingStudents(false))
  }, [selectedSection])

  const handleFileUpload = async (file: File) => {
    if (!selectedSection) {
      setUploadMsg('Please select a section before uploading')
      return
    }
    setUploadLoading(true)
    setUploadMsg('')
    const fd = new FormData()
    fd.append('file', file)
    try {
      await apiPostForm(`/sections/${selectedSection}/students/bulk-upload/`, fd)
      setUploadMsg('Upload successful! Refreshing student list...')
      const data = await getSectionStudents(Number(selectedSection))
      setStudents(data)
      setUploadMsg('Students uploaded successfully.')
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

  const columns: TableColumn<Student>[] = [
    {
      key: 'roll_number',
      header: 'Roll No.',
      render: (s) => <span className="font-mono text-[#667085]">{s.roll_number || '—'}</span>,
    },
    {
      key: 'name',
      header: 'Name',
      render: (s) => <span className="font-medium text-[#101828]">{s.name}</span>,
    },
    {
      key: 'admission_number',
      header: 'Admission No.',
      render: (s) => <span className="text-[#667085]">{s.admission_number || '—'}</span>,
    },
    {
      key: 'gender',
      header: 'Gender',
      render: (s) => <span className="text-[#667085] capitalize">{s.gender || '—'}</span>,
    },
    {
      key: 'parent_phone',
      header: 'Parent Phone',
      render: (s) => <span className="text-[#667085]">{s.parent_phone || '—'}</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle="View and manage students by class and section"
      />

      {error && (
        <div className="mb-4 p-3 bg-[#FEE4E2] border border-[#D92D20]/20 rounded-lg text-sm text-[#D92D20]">
          {error}
        </div>
      )}

      {/* Selectors */}
      <div className="flex flex-wrap gap-3 mb-5">
        {loadingClasses ? (
          <Spinner size="sm" className="text-[#185FA5]" />
        ) : (
          <Select
            label="Class"
            placeholder="Select class..."
            options={classes.map((c) => ({ value: c.id, label: c.name }))}
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-48"
          />
        )}
        {selectedClass && (
          loadingSections ? (
            <div className="flex items-end pb-2">
              <Spinner size="sm" className="text-[#185FA5]" />
            </div>
          ) : (
            <Select
              label="Section"
              placeholder="Select section..."
              options={sections.map((s) => ({ value: s.id, label: s.name }))}
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-48"
            />
          )
        )}
      </div>

      {/* Bulk Upload Drop Zone */}
      {selectedSection && (
        <div className="mb-5">
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors duration-150 ${
              dragOver ? 'border-[#185FA5] bg-[#185FA5]/5' : 'border-[#EAECF0] hover:border-[#185FA5]/40'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center gap-3">
              {uploadLoading ? (
                <Spinner size="md" className="text-[#185FA5]" />
              ) : (
                <CloudUpload size={32} className="text-[#667085]" />
              )}
              <div>
                <p className="text-sm font-medium text-[#101828]">
                  Drag & drop a CSV file here, or{' '}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[#185FA5] hover:underline"
                  >
                    browse
                  </button>
                </p>
                <p className="text-xs text-[#667085] mt-0.5">
                  Supports CSV files with student data
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload(file)
                  e.target.value = ''
                }}
              />
            </div>
          </div>
          {uploadMsg && (
            <p className={`mt-2 text-sm ${uploadMsg.includes('success') ? 'text-[#16825D]' : 'text-[#D92D20]'}`}>
              {uploadMsg}
            </p>
          )}
        </div>
      )}

      {/* Students Table */}
      {!selectedSection ? (
        <EmptyState
          icon={<GraduationCap size={48} />}
          title="Select a class and section"
          description="Choose a class and section to view the student list."
        />
      ) : (
        <div className="bg-white border border-[#EAECF0] rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#EAECF0]">
            <p className="text-sm font-semibold text-[#101828]">
              {students.length} student{students.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Table
            columns={columns}
            data={students}
            loading={loadingStudents}
            keyExtractor={(s) => s.id}
            emptyMessage="No students found in this section"
          />
        </div>
      )}
    </div>
  )
}
