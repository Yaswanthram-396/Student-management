export const SCHOOL_NAME = 'Green Valley Public School'
export const PRINCIPAL_NAME = 'Mr. Rajesh Sharma'
export const PRINCIPAL_INITIALS = 'RS'

export const kpiData = [
  { label: 'Total Students', value: '847', trend: '+12 this month', trendDir: 'up' as const },
  { label: 'Total Teachers', value: '38', trend: '2 on leave today', trendDir: 'neutral' as const },
  { label: "Today's Attendance", value: '91%', trend: '↑ 3% from yesterday', trendDir: 'up' as const },
  { label: 'Pending Actions', value: '5', trend: '3 results, 2 requests', trendDir: 'neutral' as const },
]

export const attendanceWeek = [
  { day: 'Mon', pct: 88 },
  { day: 'Tue', pct: 91 },
  { day: 'Wed', pct: 79 },
  { day: 'Thu', pct: 94 },
  { day: 'Fri', pct: 87 },
  { day: 'Sat', pct: 91 },
  { day: 'Sun', pct: 93 },
]

export const subjectScores = [
  { subject: 'English', avg: 82 },
  { subject: 'Hindi', avg: 76 },
  { subject: 'Chemistry', avg: 74 },
  { subject: 'Physics', avg: 71 },
  { subject: 'Maths', avg: 68 },
]

export const recentActivity = [
  { color: 'accent', text: 'Mid-Term results uploaded', time: '2h ago' },
  { color: 'success', text: '42 students onboarded (Class 9)', time: '5h ago' },
  { color: 'warning', text: 'Attendance drop in Class 7B', time: 'Yesterday' },
  { color: 'accent', text: 'Announcement sent to all', time: 'Yesterday' },
  { color: 'success', text: 'Teacher Mrs. Priya added', time: '2 days ago' },
]

export const pendingActions = [
  { text: '3 exam results await approval', cta: 'Review', route: '/exams' },
  { text: 'Class 8A has no class teacher', cta: 'Assign', route: '/classes' },
  { text: '2 bulk uploads processing', cta: 'Check Status', route: '/configuration' },
]

export const classes = [
  { id: 'c1', name: 'Class 6', display_order: 1, sections: 3, students: 112 },
  { id: 'c2', name: 'Class 7', display_order: 2, sections: 4, students: 148 },
  { id: 'c3', name: 'Class 8', display_order: 3, sections: 4, students: 152 },
  { id: 'c4', name: 'Class 9', display_order: 4, sections: 3, students: 124 },
  { id: 'c5', name: 'Class 10', display_order: 5, sections: 3, students: 115 },
  { id: 'c6', name: 'Class 11', display_order: 6, sections: 2, students: 96 },
  { id: 'c7', name: 'Class 12', display_order: 7, sections: 2, students: 100 },
]

export const sections = [
  { id: 's1', name: 'A', class_name: 'Class 6', class_id: 'c1', class_teacher: 'Mrs. Ananya Iyer', student_count: 38, parent_query_enabled: true },
  { id: 's2', name: 'B', class_name: 'Class 6', class_id: 'c1', class_teacher: 'Mr. Kiran Rao', student_count: 37, parent_query_enabled: true },
  { id: 's3', name: 'C', class_name: 'Class 6', class_id: 'c1', class_teacher: null, student_count: 37, parent_query_enabled: false },
  { id: 's4', name: 'A', class_name: 'Class 7', class_id: 'c2', class_teacher: 'Mrs. Sunitha Verma', student_count: 38, parent_query_enabled: true },
  { id: 's5', name: 'B', class_name: 'Class 7', class_id: 'c2', class_teacher: null, student_count: 37, parent_query_enabled: false },
  { id: 's6', name: 'C', class_name: 'Class 7', class_id: 'c2', class_teacher: 'Mr. Arun Mehta', student_count: 36, parent_query_enabled: true },
  { id: 's7', name: 'D', class_name: 'Class 7', class_id: 'c2', class_teacher: 'Mrs. Priya Nair', student_count: 37, parent_query_enabled: true },
  { id: 's8', name: 'A', class_name: 'Class 8', class_id: 'c3', class_teacher: 'Mr. Suresh Patel', student_count: 39, parent_query_enabled: true },
  { id: 's9', name: 'B', class_name: 'Class 8', class_id: 'c3', class_teacher: null, student_count: 38, parent_query_enabled: false },
]

export const subjects = [
  { id: 'sub1', name: 'Mathematics', code: 'MATH', is_active: true },
  { id: 'sub2', name: 'English', code: 'ENG', is_active: true },
  { id: 'sub3', name: 'Hindi', code: 'HIN', is_active: true },
  { id: 'sub4', name: 'Physics', code: 'PHY', is_active: true },
  { id: 'sub5', name: 'Chemistry', code: 'CHEM', is_active: true },
  { id: 'sub6', name: 'Biology', code: 'BIO', is_active: true },
  { id: 'sub7', name: 'History', code: 'HIST', is_active: true },
  { id: 'sub8', name: 'Geography', code: 'GEO', is_active: false },
  { id: 'sub9', name: 'Computer Science', code: 'CS', is_active: true },
]

export const teachers = [
  {
    id: 't1', name: 'Mrs. Ananya Iyer', mobile_number: '9876543210',
    primary_subject: 'Mathematics', assigned_sections: ['Class 6 A', 'Class 7 A'],
    status: 'active',
  },
  {
    id: 't2', name: 'Mr. Kiran Rao', mobile_number: '9876543211',
    primary_subject: 'English', assigned_sections: ['Class 6 B'],
    status: 'active',
  },
  {
    id: 't3', name: 'Mrs. Sunitha Verma', mobile_number: '9876543212',
    primary_subject: 'Physics', assigned_sections: ['Class 7 A', 'Class 8 A'],
    status: 'active',
  },
  {
    id: 't4', name: 'Mr. Arun Mehta', mobile_number: '9876543213',
    primary_subject: 'Chemistry', assigned_sections: ['Class 7 C', 'Class 9 A'],
    status: 'on_leave',
  },
  {
    id: 't5', name: 'Mrs. Priya Nair', mobile_number: '9876543214',
    primary_subject: 'Hindi', assigned_sections: ['Class 7 D'],
    status: 'active',
  },
  {
    id: 't6', name: 'Mr. Suresh Patel', mobile_number: '9876543215',
    primary_subject: 'Biology', assigned_sections: ['Class 8 A', 'Class 10 A'],
    status: 'active',
  },
  {
    id: 't7', name: 'Mrs. Kavitha Sharma', mobile_number: '9876543216',
    primary_subject: 'History', assigned_sections: ['Class 9 B', 'Class 10 B'],
    status: 'on_leave',
  },
  {
    id: 't8', name: 'Mr. Rajiv Kumar', mobile_number: '9876543217',
    primary_subject: 'Computer Science', assigned_sections: ['Class 11 A', 'Class 12 A'],
    status: 'active',
  },
  {
    id: 't9', name: 'Mrs. Deepa Menon', mobile_number: '9876543218',
    primary_subject: 'Geography', assigned_sections: ['Class 6 C'],
    status: 'active',
  },
  {
    id: 't10', name: 'Mr. Venkat Rao', mobile_number: '9876543219',
    primary_subject: 'Mathematics', assigned_sections: ['Class 10 C', 'Class 11 B'],
    status: 'active',
  },
]

export const students = [
  { id: 'st1', name: 'Arjun Sharma', roll_number: '001', admission_number: 'ADM2024001', class_name: 'Class 9', section_name: 'A' },
  { id: 'st2', name: 'Priya Krishnamurthy', roll_number: '002', admission_number: 'ADM2024002', class_name: 'Class 9', section_name: 'A' },
  { id: 'st3', name: 'Rohan Verma', roll_number: '003', admission_number: 'ADM2024003', class_name: 'Class 9', section_name: 'B' },
  { id: 'st4', name: 'Ananya Gupta', roll_number: '004', admission_number: 'ADM2024004', class_name: 'Class 8', section_name: 'A' },
  { id: 'st5', name: 'Vikram Nair', roll_number: '005', admission_number: 'ADM2024005', class_name: 'Class 8', section_name: 'B' },
  { id: 'st6', name: 'Sneha Pillai', roll_number: '006', admission_number: 'ADM2024006', class_name: 'Class 10', section_name: 'A' },
  { id: 'st7', name: 'Karthik Rajan', roll_number: '007', admission_number: 'ADM2024007', class_name: 'Class 7', section_name: 'C' },
  { id: 'st8', name: 'Divya Menon', roll_number: '008', admission_number: 'ADM2024008', class_name: 'Class 7', section_name: 'A' },
]

export const attendanceByClass = [
  { class_id: 'c1', class_name: 'Class 6', total: 112, present: 104, absent: 8, pct: 92.9 },
  { class_id: 'c2', class_name: 'Class 7', total: 148, present: 131, absent: 17, pct: 88.5 },
  { class_id: 'c3', class_name: 'Class 8', total: 152, present: 143, absent: 9, pct: 94.1 },
  { class_id: 'c4', class_name: 'Class 9', total: 124, present: 108, absent: 16, pct: 87.1 },
  { class_id: 'c5', class_name: 'Class 10', total: 115, present: 110, absent: 5, pct: 95.7 },
  { class_id: 'c6', class_name: 'Class 11', total: 96, present: 88, absent: 8, pct: 91.7 },
  { class_id: 'c7', class_name: 'Class 12', total: 100, present: 95, absent: 5, pct: 95.0 },
]

export const announcements = [
  {
    id: 'a1', title: 'School Annual Day — Save the Date!',
    body: 'Our Annual Day celebration will be held on June 14, 2026. All parents are cordially invited. More details to follow.',
    audience: 'SCHOOL', published_at: '2026-05-13T09:00:00Z', author_role: 'PRINCIPAL',
  },
  {
    id: 'a2', title: 'Mid-Term Exam Schedule Released',
    body: 'The mid-term examination schedule for all classes has been uploaded. Students should begin their preparations.',
    audience: 'SCHOOL', published_at: '2026-05-10T10:30:00Z', author_role: 'PRINCIPAL',
  },
  {
    id: 'a3', title: 'Parent-Teacher Meeting — Class 10',
    body: 'A special parent-teacher meeting for Class 10 is scheduled on May 20. Attendance is mandatory.',
    audience: 'CLASS', published_at: '2026-05-08T14:00:00Z', author_role: 'PRINCIPAL',
  },
  {
    id: 'a4', title: 'Sports Day Practice Schedule',
    body: 'Practice sessions for Sports Day will begin from May 17. Students selected for events will be notified separately.',
    audience: 'SCHOOL', published_at: '2026-05-06T11:00:00Z', author_role: 'PRINCIPAL',
  },
  {
    id: 'a5', title: 'Library Books Return Deadline',
    body: 'All students must return borrowed library books by May 31. Late returns will attract a nominal fine.',
    audience: 'SCHOOL', published_at: '2026-05-03T08:00:00Z', author_role: 'PRINCIPAL',
  },
]

export const calendarEvents = [
  { id: 'ev1', title: 'Mid-Term Exams', event_type: 'EXAM', start_date: '2026-05-18', end_date: '2026-05-28', description: 'Mid-term exams for all classes', visible_to: ['TEACHER', 'STUDENT', 'PARENT'] },
  { id: 'ev2', title: 'Buddha Purnima', event_type: 'HOLIDAY', start_date: '2026-05-12', end_date: '2026-05-12', description: 'National Holiday', visible_to: ['TEACHER', 'STUDENT', 'PARENT'] },
  { id: 'ev3', title: 'Annual Sports Day', event_type: 'EVENT', start_date: '2026-06-05', end_date: '2026-06-05', description: 'Annual Sports Day celebration', visible_to: ['TEACHER', 'STUDENT', 'PARENT'] },
  { id: 'ev4', title: 'Annual Day Celebration', event_type: 'EVENT', start_date: '2026-06-14', end_date: '2026-06-14', description: 'School Annual Day', visible_to: ['TEACHER', 'STUDENT', 'PARENT'] },
  { id: 'ev5', title: 'Summer Vacation', event_type: 'HOLIDAY', start_date: '2026-06-20', end_date: '2026-07-15', description: 'Summer break', visible_to: ['TEACHER', 'STUDENT', 'PARENT'] },
  { id: 'ev6', title: 'Parent-Teacher Meeting', event_type: 'EVENT', start_date: '2026-05-20', end_date: '2026-05-20', description: 'PTM for Class 10', visible_to: ['PARENT'] },
  { id: 'ev7', title: 'Science Exhibition', event_type: 'EVENT', start_date: '2026-05-25', end_date: '2026-05-25', description: 'Inter-school science exhibition', visible_to: ['TEACHER', 'STUDENT'] },
]

export const exams = [
  {
    id: 'ex1', name: 'Mid-Term Examination 2026',
    start_date: '2026-05-18', end_date: '2026-05-28',
    status: 'PUBLISHED', analytics_status: 'DONE',
    subjects: ['Mathematics', 'English', 'Hindi', 'Physics', 'Chemistry'],
  },
  {
    id: 'ex2', name: 'Unit Test 2 — Science',
    start_date: '2026-04-10', end_date: '2026-04-12',
    status: 'PUBLISHED', analytics_status: 'DONE',
    subjects: ['Physics', 'Chemistry', 'Biology'],
  },
  {
    id: 'ex3', name: 'Unit Test 2 — Humanities',
    start_date: '2026-04-14', end_date: '2026-04-15',
    status: 'PUBLISHED', analytics_status: 'RUNNING',
    subjects: ['History', 'Geography', 'English'],
  },
  {
    id: 'ex4', name: 'First Term Final Examination',
    start_date: '2026-03-01', end_date: '2026-03-12',
    status: 'PUBLISHED', analytics_status: 'DONE',
    subjects: ['Mathematics', 'English', 'Hindi', 'Physics', 'Chemistry', 'Biology'],
  },
  {
    id: 'ex5', name: 'Annual Examination 2026',
    start_date: '2026-06-10', end_date: '2026-06-20',
    status: 'DRAFT', analytics_status: 'CREATED',
    subjects: ['Mathematics', 'English', 'Hindi', 'Physics', 'Chemistry', 'Biology', 'History'],
  },
]

export const analyticsOverview = {
  exam_name: 'Mid-Term Examination 2026',
  class_avgs: [
    { class_name: 'Class 6', avg: 76 },
    { class_name: 'Class 7', avg: 71 },
    { class_name: 'Class 8', avg: 74 },
    { class_name: 'Class 9', avg: 69 },
    { class_name: 'Class 10', avg: 78 },
    { class_name: 'Class 11', avg: 73 },
    { class_name: 'Class 12', avg: 80 },
  ],
  subject_avgs: [
    { subject: 'Mathematics', avg: 68, pass_pct: 82 },
    { subject: 'English', avg: 82, pass_pct: 96 },
    { subject: 'Hindi', avg: 76, pass_pct: 91 },
    { subject: 'Physics', avg: 71, pass_pct: 85 },
    { subject: 'Chemistry', avg: 74, pass_pct: 87 },
  ],
  risk_distribution: [
    { label: 'SAFE', count: 612, color: '#10B981' },
    { label: 'WATCH', count: 156, color: '#F59E0B' },
    { label: 'ALERT', count: 79, color: '#EF4444' },
  ],
  section_comparison: [
    { section: 'Class 9 A', avg: 73, rank: 1 },
    { section: 'Class 9 B', avg: 70, rank: 2 },
    { section: 'Class 9 C', avg: 66, rank: 3 },
  ],
}

export const schoolConfig = {
  attendance_frequency: 'TWICE',
  whatsapp_absent_automation_enabled: true,
  parent_query_enabled: true,
  subdomain: 'greenvalley',
}
