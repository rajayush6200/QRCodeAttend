import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard, Users, BookOpen, Building2, ClipboardList,
  CalendarDays, QrCode, BarChart3, ScanLine, BookMarked,
  LogOut, ChevronLeft, Menu, Shield, ChevronRight,
} from 'lucide-react';
import { getInitials } from '@/utils/formatters';

const adminNav = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/admin/dashboard' },
  { label: 'Users', icon: Users, to: '/admin/users' },
  { label: 'Courses', icon: BookOpen, to: '/admin/courses' },
  { label: 'Departments', icon: Building2, to: '/admin/departments' },
  { label: 'Audit Logs', icon: Shield, to: '/admin/audit-logs' },
];

const facultyNav = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/faculty/dashboard' },
  { label: 'Sessions', icon: CalendarDays, to: '/faculty/sessions' },
  { label: 'Analytics', icon: BarChart3, to: '/faculty/analytics' },
];

const studentNav = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/student/dashboard' },
  { label: 'Scan QR', icon: ScanLine, to: '/student/scan' },
  { label: 'My Attendance', icon: ClipboardList, to: '/student/attendance' },
];

const roleNav = { admin: adminNav, faculty: facultyNav, student: studentNav };

const roleConfig = {
  admin: {
    bg: 'bg-violet-500/15',
    text: 'text-violet-400',
    border: 'border-violet-500/20',
    gradient: 'from-violet-500 to-indigo-600',
    label: 'Admin Panel',
  },
  faculty: {
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-400',
    border: 'border-cyan-500/20',
    gradient: 'from-cyan-500 to-blue-600',
    label: 'Faculty Panel',
  },
  student: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    gradient: 'from-emerald-500 to-teal-600',
    label: 'Student Panel',
  },
};

const Sidebar = ({ isCollapsed, onToggle, isMobileOpen, onMobileClose }) => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navItems = roleNav[user?.role] || [];
  const config = roleConfig[user?.role] || roleConfig.student;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/[0.05]">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-glow"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          <QrCode className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
        </div>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden whitespace-nowrap flex-1"
            >
              <p className="text-sm font-bold text-white leading-tight">QRCodeAttend</p>
              <p className={`text-[10px] font-semibold uppercase tracking-widest ${config.text}`}>
                {config.label}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        {!isCollapsed && (
          <button
            onClick={onToggle}
            className="ml-auto p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] transition-colors"
            id="sidebar-collapse-btn"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onMobileClose}
              title={isCollapsed ? item.label : undefined}
              className={`nav-item ${isActive ? 'nav-item-active' : 'nav-item-inactive'} ${isCollapsed ? 'justify-center px-2.5' : ''}`}
              id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <item.icon
                className={`w-4.5 h-4.5 flex-shrink-0 transition-colors ${isActive ? 'text-brand-300' : ''}`}
                style={{ width: 18, height: 18 }}
              />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden whitespace-nowrap text-sm"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          );
        })}
      </nav>

      {/* User Profile Footer */}
      <div className="px-3 pb-4 border-t border-white/[0.05] pt-3">
        {!isCollapsed && (
          <div className={`flex items-center gap-3 p-3 rounded-xl ${config.bg} border ${config.border} mb-2`}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: `linear-gradient(135deg, var(--color-brand), var(--color-accent))` }}
            >
              {user?.profilePhoto ? (
                <img src={user.profilePhoto} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                getInitials(user?.name || '?')
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate leading-tight">{user?.name}</p>
              <p className={`text-[11px] ${config.text} capitalize font-medium`}>{user?.role}</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="flex justify-center mb-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: `linear-gradient(135deg, var(--color-brand), var(--color-accent))` }}
              title={user?.name}
            >
              {getInitials(user?.name || '?')}
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className={`w-full nav-item nav-item-inactive hover:text-red-400 hover:bg-red-500/[0.08] ${isCollapsed ? 'justify-center px-2.5' : ''}`}
          id="logout-btn"
          title="Logout"
        >
          <LogOut className="flex-shrink-0" style={{ width: 16, height: 16 }} />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden whitespace-nowrap text-sm"
              >
                Sign Out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: isCollapsed ? 64 : 230 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="hidden md:flex flex-col border-r border-white/[0.05] flex-shrink-0 overflow-hidden relative z-10"
        style={{
          height: '100vh',
          position: 'sticky',
          top: 0,
          background: 'linear-gradient(180deg, rgba(16,16,34,0.98) 0%, rgba(10,10,20,0.98) 100%)',
        }}
      >
        {sidebarContent}
        {isCollapsed && (
          <button
            onClick={onToggle}
            className="absolute bottom-24 right-0 translate-x-1/2 w-5 h-8 rounded-full border border-white/10 flex items-center justify-center bg-surface-100 text-slate-400 hover:text-slate-200 transition-colors shadow-md z-20"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </motion.aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
              onClick={onMobileClose}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-60 border-r border-white/[0.05] z-50 md:hidden"
              style={{ background: 'rgba(10,10,20,0.98)', backdropFilter: 'blur(24px)' }}
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
