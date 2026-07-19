import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BarChart2, CalendarDays, Clock, Users, TrendingUp, Plus, ArrowRight } from 'lucide-react';
import { facultyApi } from '@/api/faculty.api';
import { AttendanceStatusChart, AttendanceTrendChart } from '@/components/AnalyticsChart';
import { formatDate, formatRelativeTime } from '@/utils/formatters';

const FacultyDashboard = () => {
  const { data: coursesRes } = useQuery({
    queryKey: ['faculty-courses'],
    queryFn: () => facultyApi.getMyCourses(),
    select: (res) => res.data.data.courses,
  });

  const { data: sessionsRes } = useQuery({
    queryKey: ['faculty-sessions', { limit: 5 }],
    queryFn: () => facultyApi.getSessions({ limit: 5, page: 1 }),
    select: (res) => res.data,
  });

  const { data: analyticsRes } = useQuery({
    queryKey: ['faculty-analytics'],
    queryFn: () => facultyApi.getAnalytics(),
    select: (res) => res.data.data,
  });

  const sessions = sessionsRes?.data || [];
  const overallCount = analyticsRes?.overallSessionCount || 0;
  const courses = coursesRes || [];

  // Aggregate analytics
  const totalPresent = analyticsRes?.courses?.reduce((s, c) => s + (c.summary?.present || 0), 0) || 0;
  const totalLate = analyticsRes?.courses?.reduce((s, c) => s + (c.summary?.late || 0), 0) || 0;
  const totalAbsent = analyticsRes?.courses?.reduce((s, c) => s + (c.summary?.absent || 0), 0) || 0;

  // Build trend data from first course
  const firstCourse = analyticsRes?.courses?.[0];
  const trendData = firstCourse?.trend
    ? {
        labels: firstCourse.trend.map((t) => formatDate(t.date, 'MMM dd')),
        values: firstCourse.trend.map((t) => t.rate),
      }
    : null;

  const stats = [
    { label: 'My Courses', value: courses.length, icon: CalendarDays, color: 'bg-brand-500', change: null },
    { label: 'Total Sessions', value: overallCount, icon: BarChart2, color: 'bg-violet-500', change: null },
    { label: 'Total Students', value: courses.reduce((s, c) => s + (c.studentIds?.length || 0), 0), icon: Users, color: 'bg-cyan-500', change: null },
    { label: 'Active Sessions', value: sessions.filter((s) => s.status === 'active').length, icon: Clock, color: 'bg-emerald-500', change: null },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Faculty Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your courses and attendance sessions</p>
        </div>
        <Link to="/faculty/sessions" className="btn-primary gap-2">
          <Plus className="w-4 h-4" /> New Session
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="stat-card card-hover"
          >
            <div className={`stat-icon ${stat.color}/20`}>
              <stat.icon className={`w-5 h-5 text-white`} style={{ filter: 'brightness(1.5)' }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Breakdown */}
        <div className="card p-6">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-400" />
            Attendance Breakdown
          </h2>
          <AttendanceStatusChart present={totalPresent} late={totalLate} absent={totalAbsent} />
        </div>

        {/* Trend Chart */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-brand-400" />
            Attendance Trend
            {firstCourse && <span className="text-xs text-slate-500 ml-1">({firstCourse.courseName})</span>}
          </h2>
          <AttendanceTrendChart data={trendData} height={240} />
        </div>

        {/* Recent Sessions */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Recent Sessions</h2>
            <Link to="/faculty/sessions" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {sessions.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No sessions yet. Create your first session!</p>
            ) : (
              sessions.map((session) => (
                <Link
                  key={session._id}
                  to={`/faculty/sessions/${session._id}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-brand-500/20 transition-all group"
                >
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    session.status === 'active' ? 'bg-emerald-400 animate-pulse' :
                    session.status === 'scheduled' ? 'bg-brand-400' :
                    session.status === 'completed' ? 'bg-slate-400' : 'bg-red-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white">{session.title}</p>
                    <p className="text-xs text-slate-500">{session.courseId?.name} · {formatRelativeTime(session.scheduledAt)}</p>
                  </div>
                  <span className={`badge ${
                    session.status === 'active' ? 'badge-active' :
                    session.status === 'scheduled' ? 'badge-scheduled' :
                    session.status === 'completed' ? 'badge-completed' : 'badge-cancelled'
                  }`}>{session.status}</span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* My Courses */}
        <div className="card p-6">
          <h2 className="font-semibold text-white mb-4">My Courses</h2>
          <div className="space-y-2">
            {courses.length === 0 ? (
              <p className="text-slate-500 text-sm">No courses assigned yet.</p>
            ) : (
              courses.map((course) => (
                <div key={course._id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-brand-300">{course.code?.slice(0, 2)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{course.name}</p>
                    <p className="text-xs text-slate-500">{course.enrollmentCount || course.studentIds?.length || 0} students</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;
