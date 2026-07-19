import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '@/api/student.api';
import { formatRelativeTime } from '@/utils/formatters';
import { useSocket } from '@/hooks/useSocket';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);
  const queryClient = useQueryClient();
  const { on, off } = useSocket();

  const { data, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.getNotifications({ limit: 15 }),
    select: (res) => res.data,
  });

  const notifications = data?.data || [];
  const unreadCount = data?.pagination?.unreadCount || 0;

  // Listen for real-time notifications
  useEffect(() => {
    const handleNotification = () => {
      refetch();
    };
    on('notification:new', handleNotification);
    return () => off('notification:new', handleNotification);
  }, [on, off, refetch]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const markRead = useMutation({
    mutationFn: (id) => notificationApi.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteNotif = useMutation({
    mutationFn: (id) => notificationApi.deleteNotification(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const typeIcon = {
    SESSION_STARTED: '📢',
    SESSION_ENDED: '✅',
    ATTENDANCE_MARKED: '✓',
    ATTENDANCE_LOW: '⚠️',
    SESSION_REMINDER: '🔔',
    ACCOUNT_CREATED: '🎉',
    COURSE_ENROLLED: '📚',
    SYSTEM_ALERT: '🔧',
    PASSWORD_RESET: '🔐',
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen((o) => !o)}
        className="relative p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-80 sm:w-96 glass-card shadow-card-hover z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-200">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="badge bg-brand-500/20 text-brand-300">{unreadCount} new</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    title="Mark all as read"
                    className="btn-ghost btn-sm"
                    id="mark-all-read-btn"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="btn-ghost btn-sm">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto no-scrollbar">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-slate-500 text-sm">
                  <Bell className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p>No notifications</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <motion.div
                    key={notif._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`px-4 py-3 border-b border-white/5 transition-colors ${
                      !notif.isRead ? 'bg-brand-500/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0 mt-0.5">
                        {typeIcon[notif.type] || '🔔'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{notif.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{notif.message}</p>
                        <p className="text-xs text-slate-500 mt-1">{formatRelativeTime(notif.createdAt)}</p>
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        {!notif.isRead && (
                          <button
                            onClick={() => markRead.mutate(notif._id)}
                            title="Mark as read"
                            className="p-1 rounded text-slate-500 hover:text-brand-400 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotif.mutate(notif._id)}
                          title="Delete"
                          className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
