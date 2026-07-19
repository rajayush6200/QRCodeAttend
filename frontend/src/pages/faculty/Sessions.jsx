import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  Plus, Search, Filter, Calendar, MapPin, Clock, Users,
  Play, CheckCircle, XCircle, ChevronRight, X,
} from 'lucide-react';
import { facultyApi } from '@/api/faculty.api';
import { formatDateTime, formatRelativeTime } from '@/utils/formatters';

const sessionSchema = z.object({
  courseId: z.string().min(1, 'Select a course'),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  topic: z.string().optional(),
  scheduledAt: z.string().min(1, 'Scheduled time is required'),
  lat: z.number({ invalid_type_error: 'Latitude required' }).min(-90).max(90),
  lng: z.number({ invalid_type_error: 'Longitude required' }).min(-180).max(180),
  radius: z.number().min(10).max(500).default(50),
  qrRotationInterval: z.number().min(15).max(120).default(30),
});

const Sessions = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: coursesRes } = useQuery({
    queryKey: ['faculty-courses'],
    queryFn: () => facultyApi.getMyCourses(),
    select: (res) => res.data.data.courses,
  });

  const { data: sessionsRes, isLoading } = useQuery({
    queryKey: ['faculty-sessions', filterStatus],
    queryFn: () => facultyApi.getSessions({ status: filterStatus === 'all' ? undefined : filterStatus, limit: 50 }),
    select: (res) => res.data.data,
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(sessionSchema),
    defaultValues: { radius: 50, qrRotationInterval: 30 },
  });

  const createSession = useMutation({
    mutationFn: (data) => facultyApi.createSession({
      courseId: data.courseId,
      title: data.title,
      topic: data.topic,
      scheduledAt: data.scheduledAt,
      geoLocation: { lat: data.lat, lng: data.lng, radius: data.radius },
      qrRotationInterval: data.qrRotationInterval,
    }),
    onSuccess: () => {
      toast.success('Session created!');
      queryClient.invalidateQueries({ queryKey: ['faculty-sessions'] });
      setShowCreateModal(false);
      reset();
    },
  });

  const getLocation = () => {
    if (!navigator.geolocation) return toast.error('Geolocation not supported.');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue('lat', pos.coords.latitude, { shouldValidate: true });
        setValue('lng', pos.coords.longitude, { shouldValidate: true });
        toast.success(`Location set: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      },
      () => toast.error('Could not get location.')
    );
  };

  const sessions = sessionsRes || [];
  const filteredSessions = sessions.filter((s) =>
    !search || s.title.toLowerCase().includes(search.toLowerCase())
  );

  const statusFilters = ['all', 'active', 'scheduled', 'completed', 'cancelled'];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Sessions</h1>
          <p className="page-subtitle">Manage your attendance sessions</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary gap-2" id="create-session-btn">
          <Plus className="w-4 h-4" /> Create Session
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search sessions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 max-w-xs"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {statusFilters.map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                filterStatus === s
                  ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:border-white/20'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20"><div className="spinner" /></div>
      ) : filteredSessions.length === 0 ? (
        <div className="card p-16 text-center">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No sessions found. Create your first session!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSessions.map((session, i) => (
            <motion.div
              key={session._id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/faculty/sessions/${session._id}`}
                className="card card-hover block p-5 group"
                id={`session-card-${session._id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      session.status === 'active' ? 'bg-emerald-400 animate-pulse' :
                      session.status === 'scheduled' ? 'bg-brand-400' :
                      session.status === 'completed' ? 'bg-slate-400' : 'bg-red-400'
                    }`} />
                    <span className={`badge ${
                      session.status === 'active' ? 'badge-active' :
                      session.status === 'scheduled' ? 'badge-scheduled' :
                      session.status === 'completed' ? 'badge-completed' : 'badge-cancelled'
                    }`}>{session.status}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-brand-400 transition-colors" />
                </div>

                <h3 className="text-base font-semibold text-white mb-1 truncate">{session.title}</h3>
                <p className="text-xs text-slate-400 mb-3">{session.courseId?.name} · {session.courseId?.code}</p>

                <div className="space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDateTime(session.scheduledAt)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" />
                    {session.totalStudents} enrolled · {session.presentCount} present
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" />
                    {session.geoLocation?.radius}m radius
                  </div>
                </div>

                {session.status === 'completed' && session.totalStudents > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <div className="w-full bg-white/5 rounded-full h-1.5">
                      <div
                        className="bg-gradient-brand h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.round((session.presentCount / session.totalStudents) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {Math.round((session.presentCount / session.totalStudents) * 100)}% attendance
                    </p>
                  </div>
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Create New Session</h2>
              <button onClick={() => setShowCreateModal(false)} className="btn-ghost btn-sm">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit((data) => createSession.mutate(data))} className="space-y-4">
              <div>
                <label className="label">Course</label>
                <select className="input" {...register('courseId')}>
                  <option value="">Select a course</option>
                  {(coursesRes || []).map((c) => (
                    <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
                  ))}
                </select>
                {errors.courseId && <p className="error-msg">⚠ {errors.courseId.message}</p>}
              </div>

              <div>
                <label className="label">Session Title</label>
                <input type="text" placeholder="e.g. Lecture 5: Sorting Algorithms" className={`input ${errors.title ? 'input-error' : ''}`} {...register('title')} />
                {errors.title && <p className="error-msg">⚠ {errors.title.message}</p>}
              </div>

              <div>
                <label className="label">Topic (optional)</label>
                <input type="text" placeholder="Brief topic description" className="input" {...register('topic')} />
              </div>

              <div>
                <label className="label">Scheduled At</label>
                <input type="datetime-local" className={`input ${errors.scheduledAt ? 'input-error' : ''}`} {...register('scheduledAt')} />
                {errors.scheduledAt && <p className="error-msg">⚠ {errors.scheduledAt.message}</p>}
              </div>

              {/* Location */}
              <div>
                <label className="label">Classroom Location</label>
                <button type="button" onClick={getLocation} className="btn-secondary w-full gap-2 mb-2">
                  <MapPin className="w-4 h-4" /> Use My Current Location
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="any"
                    placeholder="Latitude"
                    className={`input text-sm ${errors.lat ? 'input-error' : ''}`}
                    onChange={(e) => setValue('lat', parseFloat(e.target.value))}
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude"
                    className={`input text-sm ${errors.lng ? 'input-error' : ''}`}
                    onChange={(e) => setValue('lng', parseFloat(e.target.value))}
                  />
                </div>
                {(errors.lat || errors.lng) && <p className="error-msg">⚠ Valid coordinates required</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Geo-fence Radius (m)</label>
                  <input type="number" min={10} max={500} className="input" {...register('radius', { valueAsNumber: true })} />
                </div>
                <div>
                  <label className="label">QR Rotation (s)</label>
                  <input type="number" min={15} max={120} className="input" {...register('qrRotationInterval', { valueAsNumber: true })} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={createSession.isPending} className="btn-primary flex-1" id="create-session-submit-btn">
                  {createSession.isPending ? <><div className="spinner" /> Creating...</> : 'Create Session'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Sessions;
