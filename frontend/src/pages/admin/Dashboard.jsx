import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Users, BookOpen, Building2, BarChart2, TrendingUp, Activity, CheckCircle, XCircle, Clock } from 'lucide-react';
import { adminApi } from '@/api/admin.api';
import { AttendanceStatusChart } from '@/components/AnalyticsChart';
import { formatPercent } from '@/utils/formatters';

const AdminDashboard = () => {
  const { data: analyticsRes, isLoading: analyticsLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => adminApi.getAnalytics(),
    select: (res) => res.data.data,
  });

  const { data: usersRes } = useQuery({
    queryKey: ['admin-users-summary'],
    queryFn: () => adminApi.getUsers({ limit: 1 }),
    select: (res) => res.data.pagination,
  });

  const { data: coursesRes } = useQuery({
    queryKey: ['admin-courses-summary'],
    queryFn: () => adminApi.getCourses({ limit: 1 }),
    select: (res) => res.data.pagination,
  });

  const { data: deptsRes } = useQuery({
    queryKey: ['admin-depts-summary'],
    queryFn: () => adminApi.getDepartments({ limit: 1 }),
    select: (res) => res.data.pagination,
  });

  const analytics = analyticsRes?.analytics;
  const userStats = analyticsRes?.userStats;
  const totalUsers = usersRes?.total || 0;
  const totalCourses = coursesRes?.total || 0;
  const totalDepts = deptsRes?.total || 0;

  const facultyCount = userStats?.faculty?.total || 0;
  const studentCount = userStats?.student?.total || 0;

  const statCards = [
    {
      label: 'Total Users',
      value: totalUsers,
      sub: `${facultyCount} Faculty · ${studentCount} Students`,
      icon: Users,
      gradient: 'from-indigo-500 to-violet-600',
      glow: 'shadow-indigo-500/25',
    },
    {
      label: 'Total Courses',
      value: totalCourses,
      sub: 'Active courses',
      icon: BookOpen,
      gradient: 'from-cyan-500 to-blue-600',
      glow: 'shadow-cyan-500/25',
    },
    {
      label: 'Departments',
      value: totalDepts,
      sub: 'Academic divisions',
      icon: Building2,
      gradient: 'from-emerald-500 to-teal-600',
      glow: 'shadow-emerald-500/25',
    },
    {
      label: 'Total Sessions',
      value: analytics?.totalSessions || 0,
      sub: 'Completed sessions',
      icon: Activity,
      gradient: 'from-amber-500 to-orange-600',
      glow: 'shadow-amber-500/25',
    },
  ];

  const topCourses = analytics?.topCourses || [];
  const sessionsByDay = analytics?.sessionsByDay || [];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="page-title gradient-text">Admin Dashboard</h1>
          <p className="page-subtitle">Institution-wide overview and management</p>
        </motion.div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="card p-5 group hover:border-white/10 transition-all duration-300"
          >
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-3 shadow-lg ${stat.glow} group-hover:scale-110 transition-transform`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-white tabular-nums">{analyticsLoading ? '—' : stat.value}</p>
            <p className="text-sm font-medium text-slate-300 mt-0.5">{stat.label}</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{stat.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card p-6"
        >
          <h2 className="font-semibold text-white mb-5 flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-400" />
            User Breakdown
          </h2>
          <div className="space-y-4">
            {[
              { role: 'Admin', count: userStats?.admin?.total || 0, active: userStats?.admin?.active || 0, color: 'bg-violet-500' },
              { role: 'Faculty', count: userStats?.faculty?.total || 0, active: userStats?.faculty?.active || 0, color: 'bg-cyan-500' },
              { role: 'Student', count: userStats?.student?.total || 0, active: userStats?.student?.active || 0, color: 'bg-emerald-500' },
            ].map(({ role, count, active, color }) => (
              <div key={role}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm text-slate-300 font-medium">{role}</span>
                  <span className="text-sm font-bold text-white">{count}</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2">
                  <div
                    className={`${color} h-2 rounded-full transition-all duration-700`}
                    style={{ width: totalUsers > 0 ? `${(count / totalUsers) * 100}%` : '0%' }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">{active} active</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Sessions by Day of Week */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card p-6"
        >
          <h2 className="font-semibold text-white mb-5 flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-400" />
            Sessions by Day
          </h2>
          {sessionsByDay.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-500 text-sm">No session data yet.</div>
          ) : (
            <div className="space-y-2.5">
              {sessionsByDay.map(({ day, count }) => {
                const maxCount = Math.max(...sessionsByDay.map(d => d.count), 1);
                return (
                  <div key={day} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-8 shrink-0">{day}</span>
                    <div className="flex-1 bg-white/5 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(count / maxCount) * 100}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="bg-gradient-to-r from-brand-500 to-violet-500 h-2 rounded-full"
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-300 w-4 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Top Courses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="card p-6"
        >
          <h2 className="font-semibold text-white mb-5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-400" />
            Most Active Courses
          </h2>
          {topCourses.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-500 text-sm">No course data yet.</div>
          ) : (
            <div className="space-y-3">
              {topCourses.map((course, idx) => (
                <div key={course.courseId} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500/20 to-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-brand-300">{idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{course.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{course.code}</p>
                  </div>
                  <span className="text-xs font-bold text-brand-300 shrink-0">
                    {formatPercent(course.attendanceRate)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Summary Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-6 card p-6"
      >
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-brand-400" />
          Institution Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{analytics?.totalAttendanceRecords || 0}</p>
              <p className="text-xs text-slate-400">Total Attendance Records</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{analytics?.totalSessions || 0}</p>
              <p className="text-xs text-slate-400">Completed Sessions</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{topCourses.length}</p>
              <p className="text-xs text-slate-400">Courses With Activity</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
