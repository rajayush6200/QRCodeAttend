import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Search, BookOpen, Users, Building2, X, Edit2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { adminApi } from '@/api/admin.api';

const courseSchema = z.object({
  name: z.string().min(2, 'Course name required'),
  code: z.string().min(2, 'Course code required').toUpperCase(),
  departmentId: z.string().min(1, 'Department required'),
  facultyIds: z.array(z.string()).optional(),
});

const Courses = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const queryClient = useQueryClient();

  const { data: coursesData, isLoading } = useQuery({
    queryKey: ['admin-courses', page, search],
    queryFn: () => adminApi.getCourses({ page, limit: 12, search: search || undefined }),
    select: (res) => res.data,
  });

  const { data: deptsRes } = useQuery({
    queryKey: ['admin-departments-list'],
    queryFn: () => adminApi.getDepartments({ limit: 100 }),
    select: (res) => res.data.data,
  });

  const { data: facultyRes } = useQuery({
    queryKey: ['admin-faculty-list'],
    queryFn: () => adminApi.getUsers({ role: 'faculty', limit: 100 }),
    select: (res) => res.data.data,
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(courseSchema),
    defaultValues: { facultyIds: [] },
  });

  const saveCourse = useMutation({
    mutationFn: (data) => editingCourse
      ? adminApi.updateCourse(editingCourse._id, data)
      : adminApi.createCourse(data),
    onSuccess: () => {
      toast.success(editingCourse ? 'Course updated!' : 'Course created!');
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      closeModal();
    },
  });

  const openModal = (course = null) => {
    if (course) {
      setEditingCourse(course);
      setValue('name', course.name);
      setValue('code', course.code);
      setValue('departmentId', course.departmentId?._id || '');
      setValue('facultyIds', course.facultyIds?.map(f => f._id) || []);
    } else {
      setEditingCourse(null);
      reset({ facultyIds: [] });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCourse(null);
    reset();
  };

  const courses = coursesData?.data || [];
  const pagination = coursesData?.pagination;
  const departments = deptsRes || [];
  const facultyList = facultyRes || [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Courses</h1>
          <p className="page-subtitle">Manage curriculum and assignments</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary gap-2">
          <Plus className="w-4 h-4" /> Add Course
        </button>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search courses..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="input pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="spinner" /></div>
      ) : courses.length === 0 ? (
        <div className="card p-16 text-center text-slate-400">No courses found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {courses.map((course, i) => (
            <motion.div
              key={course._id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card p-5"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-brand-300">{course.code?.slice(0, 2)}</span>
                </div>
                <button
                  onClick={() => openModal(course)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-white/5 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <h3 className="font-semibold text-white mb-1 truncate">{course.name}</h3>
              <p className="text-xs text-slate-400 font-mono mb-4">{course.code}</p>

              <div className="space-y-2 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5" />
                  <span className="truncate">{course.departmentId?.name || 'No Dept'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" />
                  {course.enrollmentCount || 0} students enrolled
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5" />
                  {course.facultyIds?.length || 0} faculty assigned
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {pagination?.totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <p className="text-xs text-slate-500">Page {page} of {pagination.totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary btn-sm">Prev</button>
            <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="btn-secondary btn-sm">Next</button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">{editingCourse ? 'Edit Course' : 'Add Course'}</h2>
              <button onClick={closeModal} className="btn-ghost btn-sm"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={handleSubmit((data) => saveCourse.mutate(data))} className="space-y-4">
              <div>
                <label className="label">Course Name</label>
                <input type="text" placeholder="e.g. Data Structures" className={`input ${errors.name ? 'input-error' : ''}`} {...register('name')} />
                {errors.name && <p className="error-msg">⚠ {errors.name.message}</p>}
              </div>
              <div>
                <label className="label">Course Code</label>
                <input type="text" placeholder="e.g. CS201" className={`input uppercase ${errors.code ? 'input-error' : ''}`} {...register('code')} />
                {errors.code && <p className="error-msg">⚠ {errors.code.message}</p>}
              </div>
              <div>
                <label className="label">Department</label>
                <select className={`input ${errors.departmentId ? 'input-error' : ''}`} {...register('departmentId')}>
                  <option value="">Select Department</option>
                  {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
                {errors.departmentId && <p className="error-msg">⚠ {errors.departmentId.message}</p>}
              </div>
              <div>
                <label className="label">Assign Faculty (Multiple selection)</label>
                <select multiple className="input min-h-[100px]" {...register('facultyIds')}>
                  {facultyList.map(f => <option key={f._id} value={f._id}>{f.name} ({f.email})</option>)}
                </select>
                <p className="text-xs text-slate-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saveCourse.isPending} className="btn-primary flex-1">
                  {saveCourse.isPending ? <div className="spinner" /> : 'Save Course'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Courses;
