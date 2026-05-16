import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Users,
  GraduationCap,
  CalendarCheck,
  ArrowRight,
  BarChart3,
  Megaphone,
} from 'lucide-react'
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
import { StatCard } from '../components/ui/StatCard'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { PageHeader } from '../components/ui/PageHeader'
import { getClasses } from '../api/principal'
import { getTeachers } from '../api/principal'
import { getAttendanceDailySummary } from '../api/principal'
import { getAnnouncements } from '../api/principal'
import { getSections } from '../api/principal'
import type { Announcement, AttendanceClassSummary } from '../types'

function today(): string {
  return new Date().toISOString().split('T')[0]
}

interface DashboardStats {
  classCount: number
  teacherCount: number
  studentCount: number
  attendancePct: number
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    classCount: 0,
    teacherCount: 0,
    studentCount: 0,
    attendancePct: 0,
  })
  const [attendanceData, setAttendanceData] = useState<AttendanceClassSummary[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [classes, teachers, sections, attSummary, anns] = await Promise.allSettled([
        getClasses(),
        getTeachers(),
        getSections(),
        getAttendanceDailySummary(today()),
        getAnnouncements(),
      ])

      const classData   = classes.status   === 'fulfilled' ? classes.value   : []
      const teacherData = teachers.status  === 'fulfilled' ? teachers.value  : []
      const sectionData = sections.status  === 'fulfilled' ? sections.value  : []
      const attData     = attSummary.status === 'fulfilled' ? attSummary.value : { date: today(), classes: [] }
      const annData     = anns.status      === 'fulfilled' ? anns.value      : []

      const classAtt = attData.classes || []
      const totalStudents = classAtt.reduce((sum, c) => sum + c.total_students, 0)
      const totalPresent  = classAtt.reduce((sum, c) => sum + c.present_count,  0)
      const avgAtt = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0

      setStats({
        classCount:    classData.length,
        teacherCount:  teacherData.length,
        studentCount:  sectionData.length > 0 ? totalStudents : 0,
        attendancePct: avgAtt,
      })
      setAttendanceData(classAtt.slice(0, 10))
      setAnnouncements(annData.slice(0, 3))
    } catch (err) {
      setError('Failed to load dashboard data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Weekly mock data for trend chart
  const weeklyData = [
    { day: 'Mon', present: 85, absent: 15 },
    { day: 'Tue', present: 88, absent: 12 },
    { day: 'Wed', present: 82, absent: 18 },
    { day: 'Thu', present: 90, absent: 10 },
    { day: 'Fri', present: stats.attendancePct, absent: 100 - stats.attendancePct },
  ]

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
        title="Dashboard"
        subtitle={`Welcome back! Here's what's happening today, ${today()}`}
      />

      {error && (
        <div className="mb-4 p-3 bg-[#FEE4E2] border border-[#D92D20]/20 rounded-lg text-sm text-[#D92D20]">
          {error} —{' '}
          <button onClick={fetchData} className="underline font-medium">
            Retry
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<BookOpen size={20} />}
          label="Total Classes"
          value={stats.classCount}
          iconBg="bg-blue-50"
        />
        <StatCard
          icon={<Users size={20} />}
          label="Total Teachers"
          value={stats.teacherCount}
          iconBg="bg-purple-50"
        />
        <StatCard
          icon={<GraduationCap size={20} />}
          label="Total Students"
          value={stats.studentCount}
          iconBg="bg-green-50"
        />
        <StatCard
          icon={<CalendarCheck size={20} />}
          label="Today's Attendance"
          value={`${stats.attendancePct}%`}
          iconBg={stats.attendancePct >= 80 ? 'bg-green-50' : 'bg-orange-50'}
          trend={
            stats.attendancePct > 0
              ? {
                  value: stats.attendancePct,
                  direction: stats.attendancePct >= 80 ? 'up' : 'down',
                  label: 'today',
                }
              : undefined
          }
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
        {/* Weekly trend */}
        <Card>
          <h3 className="text-sm font-semibold text-[#101828] mb-4">Weekly Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyData} barSize={24} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#EAECF0" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#667085' }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#667085' }}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{ border: 'none', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="present" name="Present %" fill="#16825D" radius={[4, 4, 0, 0]} />
              <Bar dataKey="absent" name="Absent %" fill="#FEE4E2" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Section-wise attendance today */}
        <Card>
          <h3 className="text-sm font-semibold text-[#101828] mb-4">Today's Section Attendance</h3>
          {attendanceData.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-sm text-[#667085]">
              No attendance data for today
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={attendanceData} barSize={20} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#EAECF0" vertical={false} />
                <XAxis
                  dataKey="class_name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#667085' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#667085' }}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{ border: 'none', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  formatter={(value: number) => [`${value}%`, 'Attendance']}
                />
                <Bar dataKey="attendance_percentage" name="Attendance %" radius={[4, 4, 0, 0]}>
                  {attendanceData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.attendance_percentage >= 80 ? '#16825D' : entry.attendance_percentage >= 60 ? '#C76A00' : '#D92D20'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Quick Actions */}
        <Card>
          <h3 className="text-sm font-semibold text-[#101828] mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/attendance')}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-[#EAECF0] hover:border-[#185FA5]/40 hover:bg-[#185FA5]/5 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 text-[#185FA5]">
                  <CalendarCheck size={16} />
                </div>
                <span className="text-sm font-medium text-[#101828]">View Attendance</span>
              </div>
              <ArrowRight size={16} className="text-[#667085] group-hover:text-[#185FA5]" />
            </button>
            <button
              onClick={() => navigate('/analytics')}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-[#EAECF0] hover:border-[#185FA5]/40 hover:bg-[#185FA5]/5 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                  <BarChart3 size={16} />
                </div>
                <span className="text-sm font-medium text-[#101828]">View Analytics</span>
              </div>
              <ArrowRight size={16} className="text-[#667085] group-hover:text-[#185FA5]" />
            </button>
            <button
              onClick={() => navigate('/teachers')}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-[#EAECF0] hover:border-[#185FA5]/40 hover:bg-[#185FA5]/5 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50 text-[#16825D]">
                  <Users size={16} />
                </div>
                <span className="text-sm font-medium text-[#101828]">Manage Teachers</span>
              </div>
              <ArrowRight size={16} className="text-[#667085] group-hover:text-[#185FA5]" />
            </button>
          </div>
        </Card>

        {/* Recent Announcements */}
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#101828]">Recent Announcements</h3>
            <button
              onClick={() => navigate('/announcements')}
              className="text-xs text-[#185FA5] hover:underline font-medium flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </button>
          </div>
          {announcements.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-sm text-[#667085]">
              No announcements yet
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-[#EAECF0]"
                >
                  <div className="p-1.5 rounded-lg bg-white border border-[#EAECF0] text-[#185FA5]">
                    <Megaphone size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-[#101828] truncate">{ann.title}</p>
                      <Badge
                        variant={
                          ann.audience === 'SCHOOL'
                            ? 'info'
                            : ann.audience === 'CLASS'
                            ? 'success'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {ann.audience}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#667085] mt-0.5 truncate">{ann.body}</p>
                    <p className="text-xs text-[#667085] mt-1">
                      {ann.published_at ? new Date(ann.published_at).toLocaleDateString() : 'Draft'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
