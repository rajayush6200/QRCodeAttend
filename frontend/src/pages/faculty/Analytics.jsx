import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BarChart2, TrendingUp, BookOpen, AlertTriangle } from 'lucide-react';
import { facultyApi } from '@/api/faculty.api';
import { AttendanceTrendChart, AttendanceStatusChart } from '@/components/AnalyticsChart';
import { formatPercent } from '@/utils/formatters';

const FacultyAnalytics = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['faculty-analytics'],
    queryFn: () => facultyApi.getAnalytics(),
    select: (res) => res.data.data,
  });

  if (isLoading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  const courses = data?.courses || [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Attendance insights across all your courses</p>
      </div>

      <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-brand-500/10 border border-brand-500/20">
        <BarChart2 className="w-4 h-4 text-brand-400" />
        <span className="text-sm text-brand-300">
          <strong>{data?.overallSessionCount || 0}</strong> total sessions conducted across{' '}
          <strong>{courses.length}</strong> courses
        </span>
      </div>

      <div className="space-y-6">
        {courses.length === 0 ? (
          <div className="card p-16 text-center text-slate-400">No analytics data available yet.</div>
        ) : (
          courses.map((course, i) => (
            <motion.div
              key={course.courseId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="card p-6"
            >
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-brand-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-white">{course.courseName}</h2>
                    <p className="text-xs text-slate-400">{course.courseCode} · {course.totalSessions} sessions</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${course.averageAttendanceRate >= 75 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatPercent(course.averageAttendanceRate)}
                  </p>
                  <p className="text-xs text-slate-500">avg. attendance</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Session Trend</p>
                  <AttendanceTrendChart
                    data={course.trend ? {
                      labels: course.trend.map((t) => new Date(t.date).toLocaleDateString('en', { month: 'short', day: '2-digit' })),
                      values: course.trend.map((t) => t.rate),
                    } : null}
                    height={200}
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Status Breakdown</p>
                  <AttendanceStatusChart
                    present={course.summary?.present || 0}
                    late={course.summary?.late || 0}
                    absent={course.summary?.absent || 0}
                    height={200}
                  />
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default FacultyAnalytics;
