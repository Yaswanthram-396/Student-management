import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, Users, GraduationCap, CalendarCheck,
  BarChart3, Megaphone, Calendar, Settings, LogOut, Menu, X, Bell,
  ChevronRight, FlaskConical,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

// Nav groups with dividers
const NAV_GROUPS: { label?: string; items: NavItem[] }[] = [
  {
    items: [
      { label: 'Dashboard',    path: '/dashboard',    icon: <LayoutDashboard size={20} /> },
    ],
  },
  {
    label: 'MANAGEMENT',
    items: [
      { label: 'Classes',      path: '/classes',      icon: <BookOpen      size={20} /> },
      { label: 'Teachers',     path: '/teachers',     icon: <Users         size={20} /> },
      { label: 'Students',     path: '/students',     icon: <GraduationCap size={20} /> },
      { label: 'Subjects',     path: '/subjects',     icon: <FlaskConical  size={20} /> },
    ],
  },
  {
    label: 'ACADEMICS',
    items: [
      { label: 'Attendance',   path: '/attendance',   icon: <CalendarCheck size={20} /> },
      { label: 'Analytics',    path: '/analytics',    icon: <BarChart3     size={20} /> },
    ],
  },
  {
    label: 'COMMUNICATION',
    items: [
      { label: 'Announcements',path: '/announcements',icon: <Megaphone     size={20} /> },
      { label: 'Calendar',     path: '/calendar',     icon: <Calendar      size={20} /> },
    ],
  },
  {
    items: [
      { label: 'Settings',     path: '/settings',     icon: <Settings      size={20} /> },
    ],
  },
]

function SidebarContent({ onClose, isMobile }: { onClose?: () => void; isMobile?: boolean }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const initials = (user?.name || 'P')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#185FA5' }}>
      {/* School crest / logo area */}
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Crest circle */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.25)' }}
            >
              <GraduationCap size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">Principal Portal</p>
              <p className="text-blue-200 text-xs leading-tight mt-0.5">School Management</p>
            </div>
          </div>
          {isMobile && (
            <button onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-none py-3 px-3">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
            {group.label && (
              <p className="px-3 mb-1.5 text-[10px] font-bold tracking-widest text-blue-300 uppercase select-none">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map(item => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={isMobile ? onClose : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-[9px] text-sm font-semibold transition-all duration-150 ${
                        isActive
                          ? 'text-[#185FA5] shadow-sm'
                          : 'text-blue-100 hover:bg-white/10 hover:text-white'
                      }`
                    }
                    style={({ isActive }) =>
                      isActive
                        ? {
                            backgroundColor: 'rgba(255,255,255,0.95)',
                            boxShadow: '0 0 0 1.5px rgba(255,255,255,0.5), 0 4px 12px rgba(0,0,0,0.15)',
                          }
                        : {}
                    }
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* User info */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-[9px] hover:bg-white/10 transition-colors">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name || 'Principal'}</p>
            <p className="text-xs text-blue-200 truncate">{user?.phone_number || 'Admin'}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-red-500/20 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

function getBreadcrumb(pathname: string): string {
  const map: Record<string, string> = {
    '/dashboard':    'Dashboard',
    '/classes':      'Classes',
    '/teachers':     'Teachers',
    '/students':     'Students',
    '/subjects':     'Subjects',
    '/attendance':   'Attendance',
    '/analytics':    'Analytics',
    '/announcements':'Announcements',
    '/calendar':     'Calendar',
    '/settings':     'Settings',
  }
  return map[pathname] || 'Dashboard'
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const pageTitle = getBreadcrumb(location.pathname)

  return (
    <div className="flex h-screen bg-[#F6F8FB] overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0 h-full shadow-[4px_0_24px_rgba(0,0,0,0.06)]">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -256 }} animate={{ x: 0 }} exit={{ x: -256 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-64 lg:hidden"
            >
              <SidebarContent onClose={() => setMobileOpen(false)} isMobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* TopBar */}
        <header className="flex-shrink-0 bg-white border-b border-[#EAECF0] px-5 py-3.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-[#F0F4FF] text-[#667085]"
            >
              <Menu size={20} />
            </button>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm">
              <span className="text-[#667085] font-medium">Home</span>
              <ChevronRight size={14} className="text-[#DBEAFE]" />
              <span className="text-[#185FA5] font-bold">{pageTitle}</span>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-[9px] hover:bg-[#F0F4FF] text-[#667085] hover:text-[#185FA5] transition-all-smooth relative">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#D92D20] rounded-full" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-6 max-w-screen-xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
