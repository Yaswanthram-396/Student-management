import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  GraduationCap,
  CalendarCheck,
  BarChart3,
  Megaphone,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
  { label: 'Classes', path: '/classes', icon: <BookOpen size={20} /> },
  { label: 'Teachers', path: '/teachers', icon: <Users size={20} /> },
  { label: 'Students', path: '/students', icon: <GraduationCap size={20} /> },
  { label: 'Attendance', path: '/attendance', icon: <CalendarCheck size={20} /> },
  { label: 'Analytics', path: '/analytics', icon: <BarChart3 size={20} /> },
  { label: 'Announcements', path: '/announcements', icon: <Megaphone size={20} /> },
  { label: 'Calendar', path: '/calendar', icon: <Calendar size={20} /> },
  { label: 'Settings', path: '/settings', icon: <Settings size={20} /> },
]

function SidebarContent({
  onClose,
  isMobile,
}: {
  onClose?: () => void
  isMobile?: boolean
}) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-[#EAECF0]">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAECF0]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#185FA5] rounded-lg flex items-center justify-center">
            <GraduationCap size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#101828] leading-tight">Principal</p>
            <p className="text-xs text-[#667085] leading-tight">Dashboard</p>
          </div>
        </div>
        {isMobile && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-[#667085]"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-3">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                onClick={isMobile ? onClose : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? 'bg-[#185FA5] text-white shadow-sm'
                      : 'text-[#667085] hover:bg-gray-100 hover:text-[#101828]'
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User info + logout */}
      <div className="border-t border-[#EAECF0] p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors">
          <div className="w-8 h-8 bg-[#185FA5]/10 text-[#185FA5] rounded-full flex items-center justify-center font-semibold text-sm">
            {user?.username?.charAt(0).toUpperCase() || 'P'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#101828] truncate">
              {user?.username || 'Principal'}
            </p>
            <p className="text-xs text-[#667085] truncate">{user?.email || 'Admin'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-[#667085] hover:bg-red-50 hover:text-[#D92D20] transition-colors"
            title="Logout"
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
    '/dashboard': 'Dashboard',
    '/classes': 'Classes',
    '/teachers': 'Teachers',
    '/students': 'Students',
    '/attendance': 'Attendance',
    '/analytics': 'Analytics',
    '/announcements': 'Announcements',
    '/calendar': 'Calendar',
    '/settings': 'Settings',
  }
  return map[pathname] || 'Dashboard'
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const pageTitle = getBreadcrumb(location.pathname)

  return (
    <div className="flex h-screen bg-[#F6F8FB] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-60 flex-shrink-0 h-full">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-60 lg:hidden"
            >
              <SidebarContent onClose={() => setMobileOpen(false)} isMobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* TopBar */}
        <header className="flex-shrink-0 bg-white border-b border-[#EAECF0] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-[#667085]"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-1.5 text-sm text-[#667085]">
              <span className="text-[#667085]">Home</span>
              <ChevronRight size={14} className="text-[#667085]" />
              <span className="text-[#101828] font-medium">{pageTitle}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-gray-100 text-[#667085] relative">
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
