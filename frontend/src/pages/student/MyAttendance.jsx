import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Filter, Calendar, BookOpen, Clock, MapPin } from 'lucide-react';
import { studentApi } from '@/api/student.api';
import AttendanceTable from '@/components/AttendanceTable';
import { formatPercent, getRateColor } from '@/utils/formatters';

const ITEMS_PER_PAGE = 15;

const MyAttendance = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');

  const { data: attendanceRes, isLoading } = useQuery({
    queryKey: ['student-attendance', page, statusFilter, courseFilter],
    queryFn: () => studentApi.getMyAttendance({
      page,
      limit: ITEMS_PER_PAGE,
      status: statusFilter || undefined,
      courseId: courseFilter || undefined,
    }),
    select: (res) => res.data,
  });

  const { data: coursesRes } = useQuery({
    queryKey: ['my-courses'],
    queryFn: () => studentApi.getMyCourses(),
    select: (res) => res.data.data.courses,
  });

  const { data: analyticsRes } = useQuery({
    queryKey: ['student-analytics'],
    queryFn: () => studentApi.getAnalytics(),
    select: (res) => res.data.data.analytics,
  });

  const records = attendanceRes?.data || [];
  const pagination = attendanceRes?.pagination;
  const courses = coursesRes || [];
  const courseStats = analyticsRes?.courses || [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Attendance</h1>
        <p className="page-subtitle">Complete attendance history across all courses</p>
      </div>

      {/* Course summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {courseStats.map((stat, i) => (
          <motion.div
            key={stat.courseId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="card p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-brand-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{stat.courseName}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-white/5 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${stat.attendanceRate >= 85 ? 'bg-emerald-400' : stat.attendanceRate >= 75 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${stat.attendanceRate}%` }}
                  />
                </div>
                <span className={`text-xs font-bold ${getRateColor(stat.attendanceRate)}`}>
                  {formatPercent(stat.attendanceRate)}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select
          className="input w-auto"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="present">Present</option>
          <option value="late">Late</option>
          <option value="absent">Absent</option>
        </select>
        <select
          className="input w-auto"
          value={courseFilter}
          onChange={(e) => { setCourseFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Courses</option>
          {courses.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-20"><div className="spinner" /></div>
      ) : (
        <>
          <AttendanceTable
            records={records}
            showStudent={false}
            showCourse={true}
            emptyMessage="No attendance records found with current filters."
          />

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-slate-500">
                Showing {((page - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(page * ITEMS_PER_PAGE, pagination.total)} of {pagination.total} records
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary btn-sm"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="btn-secondary btn-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyAttendance;
