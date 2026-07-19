import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, Bell, Search, ChevronRight } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import { useAuthStore } from '@/store/authStore';
import { getInitials } from '@/utils/formatters';

const breadcrumbMap = {
  '/admin/dashboard': ['Admin', 'Dashboard'],
  '/admin/users': ['Admin', 'Users'],
  '/admin/courses': ['Admin', 'Courses'],
  '/admin/departments': ['Admin', 'Departments'],
  '/admin/audit-logs': ['Admin', 'Audit Logs'],
  '/faculty/dashboard': ['Faculty', 'Dashboard'],
  '/faculty/sessions': ['Faculty', 'Sessions'],
  '/faculty/analytics': ['Faculty', 'Analytics'],
  '/student/dashboard': ['Student', 'Dashboard'],
  '/student/scan': ['Student', 'Scan QR'],
  '/student/attendance': ['Student', 'My Attendance'],
};

const roleColors = {
  admin: 'from-violet-500 to-indigo-600',
  faculty: 'from-cyan-500 to-blue-600',
  student: 'from-emerald-500 to-teal-600',
};

const Navbar = ({ onMobileMenuOpen }) => {
  const location = useLocation();
  const { user } = useAuthStore();

  const pathKey = Object.keys(breadcrumbMap).find((k) => location.pathname.startsWith(k)) || '/';
  const crumbs = breadcrumbMap[pathKey] || ['QRCodeAttend'];
  const gradient = roleColors[user?.role] || roleColors.student;

  return (
    <header
      className="sticky top-0 z-30 border-b border-white/[0.05]"
      style={{ background: 'rgba(10,10,20,0.9)', backdropFilter: 'blur(20px)' }}
    >
      <div className="flex items-center h-15 px-4 md:px-6 gap-3" style={{ height: 60 }}>
        {/* Mobile menu button */}
        <button
          onClick={onMobileMenuOpen}
          className="md:hidden p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"
          id="mobile-menu-btn"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />}
              <span
                className={`text-sm font-medium truncate ${
                  i === crumbs.length - 1 ? 'text-white' : 'text-slate-500'
                }`}
              >
                {crumb}
              </span>
            </span>
          ))}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1.5">
          {/* Notifications */}
          <NotificationBell />

          {/* User avatar with role indicator */}
          <div className="hidden sm:flex items-center gap-2.5 pl-2.5 border-l border-white/[0.07] ml-1">
            <div className="text-right hidden md:block">
              <p className="text-sm font-semibold text-slate-200 leading-tight">{user?.name}</p>
              <p className="text-[11px] text-slate-500 capitalize">{user?.role}</p>
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ring-2 ring-white/10"
              style={{ background: `linear-gradient(135deg, #6366f1, #8b5cf6)` }}
            >
              {user?.profilePhoto ? (
                <img src={user.profilePhoto} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                getInitials(user?.name || '?')
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
