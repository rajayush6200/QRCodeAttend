import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ScanLine, BookOpen, TrendingUp, AlertTriangle, BarChart2, ArrowRight } from 'lucide-react';
import { studentApi } from '@/api/student.api';
import { AttendanceTrendChart, AttendanceStatusChart } from '@/components/AnalyticsChart';
import { formatDate, formatPercent, getRateColor } from '@/utils/formatters';

const StudentDashboard = () => {
  const { data: analyticsRes } = useQuery({
    queryKey: ['student-analytics'],
    queryFn: () => studentApi.getAnalytics(),
    select: (res) => res.data.data.analytics,
  });

  const { data: attendanceRes } = useQuery({
    queryKey: ['student-attendance-recent'],
    queryFn: () => studentApi.getMyAttendance({ limit: 5 }),
    select: (res) => res.data.data,
  });

  const analytics = analyticsRes;
  const recentRecords = attendanceRes || [];
  const lowCourses = analytics?.lowAttendanceCourses || [];

  // Build overall status data
  const totalPresent = analytics?.courses?.reduce((s, c) => s + c.attended, 0) || 0;
  const totalLate = analytics?.courses?.reduce((s, c) => s + c.late, 0) || 0;
  const totalAbsent = analytics?.courses?.reduce((s, c) => s + c.absent, 0) || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Student Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Track your attendance across all courses</p>
        </div>
        <Link to="/student/scan" className="btn-primary gap-2">
          <ScanLine className="w-4 h-4" /> Scan QR
        </Link>
      </div>

      {/* Low Attendance Warning */}
      {lowCourses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-300">Low Attendance Warning</p>
            <p className="text-xs text-red-400/80 mt-0.5">
              Your attendance is below 75% in: {lowCourses.map((c) => c.courseName).join(', ')}.
              Please attend upcoming sessions.
            </p>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Overall Rate', value: formatPercent(analytics?.overallRate || 0), icon: BarChart2, color: 'bg-brand-500' },
          { label: 'Total Courses', value: analytics?.totalCourses || 0, icon: BookOpen, color: 'bg-violet-500' },
          { label: 'Sessions Attended', value: totalPresent + totalLate, icon: TrendingUp, color: 'bg-emerald-500' },
          { label: 'Sessions Absent', value: totalAbsent, icon: AlertTriangle, color: 'bg-red-500' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="stat-card"
          >
            <div className={`stat-icon ${stat.color}/20`}>
              <stat.icon className="w-5 h-5 text-white" style={{ filter: 'brightness(1.5)' }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Doughnut */}
        <div className="card p-6">
          <h2 className="font-semibold text-white mb-4">Attendance Breakdown</h2>
          <AttendanceStatusChart present={totalPresent} late={totalLate} absent={totalAbsent} />
        </div>

        {/* Course-wise rates */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Course Attendance</h2>
            <Link to="/student/attendance" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              Full history <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-4">
            {(analytics?.courses || []).map((course) => (
              <div key={course.courseId}>
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="text-sm font-medium text-slate-200">{course.courseName}</span>
                    <span className="text-xs text-slate-500 ml-2 font-mono">{course.courseCode}</span>
                  </div>
                  <span className={`text-sm font-bold ${getRateColor(course.attendanceRate)}`}>
                    {formatPercent(course.attendanceRate)}
                  </span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${course.attendanceRate}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-2 rounded-full ${
                      course.attendanceRate >= 85 ? 'bg-emerald-400' :
                      course.attendanceRate >= 75 ? 'bg-amber-400' : 'bg-red-400'
                    }`}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {course.attended + course.late}/{course.totalSessions} sessions attended
                  {course.isLow && <span className="text-red-400 ml-2">⚠ Below 75%</span>}
                </p>
              </div>
            ))}
            {!analytics?.courses?.length && (
              <p className="text-slate-500 text-sm text-center py-6">No attendance records yet.</p>
            )}
          </div>
        </div>

        {/* Recent Attendance */}
        <div className="card p-6 lg:col-span-3">
          <h2 className="font-semibold text-white mb-4">Recent Attendance</h2>
          <div className="space-y-2">
            {recentRecords.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No attendance records yet. Scan a QR code to get started!</p>
            ) : (
              recentRecords.map((record) => (
                <div key={record._id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    record.status === 'present' ? 'bg-emerald-400' :
                    record.status === 'late' ? 'bg-amber-400' : 'bg-red-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{record.sessionId?.title || 'Session'}</p>
                    <p className="text-xs text-slate-500">{record.courseId?.name} · {formatDate(record.markedAt)}</p>
                  </div>
                  <span className={`badge ${
                    record.status === 'present' ? 'badge-present' :
                    record.status === 'late' ? 'badge-late' : 'badge-absent'
                  }`}>{record.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
