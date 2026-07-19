import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Search, UserCheck, UserX, KeyRound, X, Shield, GraduationCap } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { adminApi } from '@/api/admin.api';
import { formatDate, getInitials } from '@/utils/formatters';

const createUserSchema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Min 8 characters'),
  role: z.enum(['admin', 'faculty', 'student']),
  enrollmentNumber: z.string().optional(),
  employeeId: z.string().optional(),
});

const roleIcon = { admin: Shield, faculty: '🎓', student: '👨‍🎓' };
const roleBadge = {
  admin: 'badge bg-violet-500/20 text-violet-400',
  faculty: 'badge bg-cyan-500/20 text-cyan-400',
  student: 'badge bg-emerald-500/20 text-emerald-400',
};

const Users = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, roleFilter],
    queryFn: () => adminApi.getUsers({ page, limit: 15, search: search || undefined, role: roleFilter || undefined }),
    select: (res) => res.data,
  });

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'student' },
  });

  const role = watch('role');

  const createUser = useMutation({
    mutationFn: (data) => adminApi.createUser(data),
    onSuccess: () => {
      toast.success('User created successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowModal(false);
      reset();
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }) => adminApi.updateUser(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User status updated.');
    },
  });

  const resetPassword = useMutation({
    mutationFn: (id) => adminApi.resetUserPassword(id, 'TempPass@123'),
    onSuccess: () => toast.success('Password reset to TempPass@123'),
  });

  const users = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Manage faculty and students</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary gap-2" id="create-user-btn">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-10"
          />
        </div>
        <select className="input w-auto" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="faculty">Faculty</option>
          <option value="student">Student</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-20"><div className="spinner" /></div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>ID</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16 text-slate-400">No users found.</td></tr>
              ) : users.map((user) => (
                <tr key={user._id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {user.profilePhoto ? <img src={user.profilePhoto} className="w-full h-full rounded-full object-cover" /> : getInitials(user.name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-200">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td><span className={roleBadge[user.role]}>{user.role}</span></td>
                  <td className="text-xs font-mono text-slate-400">{user.enrollmentNumber || user.employeeId || '—'}</td>
                  <td className="text-xs text-slate-400">{formatDate(user.createdAt)}</td>
                  <td>
                    <span className={`badge ${user.isActive ? 'badge-present' : 'badge-absent'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive.mutate({ id: user._id, isActive: !user.isActive })}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
                        title={user.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => { if (window.confirm('Reset password to TempPass@123?')) resetPassword.mutate(user._id); }}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-amber-400 transition-colors"
                        title="Reset Password"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination?.totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <p className="text-xs text-slate-500">Page {page} of {pagination.totalPages} · {pagination.total} users</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary btn-sm">Previous</button>
            <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="btn-secondary btn-sm">Next</button>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-card w-full max-w-md p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Add New User</h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost btn-sm"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit((data) => createUser.mutate(data))} className="space-y-4">
              <div>
                <label className="label">Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {['student', 'faculty', 'admin'].map((r) => (
                    <label key={r} className={`flex items-center justify-center px-3 py-2.5 rounded-xl border cursor-pointer text-xs font-semibold capitalize transition-all ${role === r ? 'bg-brand-500/20 border-brand-500/50 text-brand-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                      <input type="radio" value={r} className="hidden" {...register('role')} />
                      {r}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Full Name</label>
                <input type="text" placeholder="John Doe" className={`input ${errors.name ? 'input-error' : ''}`} {...register('name')} />
                {errors.name && <p className="error-msg">⚠ {errors.name.message}</p>}
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" placeholder="user@institution.edu" className={`input ${errors.email ? 'input-error' : ''}`} {...register('email')} />
                {errors.email && <p className="error-msg">⚠ {errors.email.message}</p>}
              </div>
              <div>
                <label className="label">Initial Password</label>
                <input type="password" placeholder="Min 8 chars" className={`input ${errors.password ? 'input-error' : ''}`} {...register('password')} />
                {errors.password && <p className="error-msg">⚠ {errors.password.message}</p>}
              </div>
              {role === 'student' && (
                <div>
                  <label className="label">Enrollment Number</label>
                  <input type="text" placeholder="CS2021001" className="input" {...register('enrollmentNumber')} />
                </div>
              )}
              {role === 'faculty' && (
                <div>
                  <label className="label">Employee ID</label>
                  <input type="text" placeholder="FAC001" className="input" {...register('employeeId')} />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={createUser.isPending} className="btn-primary flex-1" id="create-user-submit-btn">
                  {createUser.isPending ? <><div className="spinner" /> Creating...</> : 'Create User'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Users;
