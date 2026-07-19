import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Building2, X, Edit2, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { adminApi } from '@/api/admin.api';
import { formatDate } from '@/utils/formatters';

const deptSchema = z.object({
  name: z.string().min(2, 'Department name required'),
  code: z.string().min(2, 'Code required').toUpperCase(),
  description: z.string().optional(),
});

const Departments = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const queryClient = useQueryClient();

  const { data: deptsRes, isLoading } = useQuery({
    queryKey: ['admin-departments'],
    queryFn: () => adminApi.getDepartments({ limit: 100 }),
    select: (res) => res.data.data,
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(deptSchema),
  });

  const saveDept = useMutation({
    mutationFn: (data) => editingDept
      ? adminApi.updateDepartment(editingDept._id, data)
      : adminApi.createDepartment(data),
    onSuccess: () => {
      toast.success(editingDept ? 'Department updated!' : 'Department created!');
      queryClient.invalidateQueries({ queryKey: ['admin-departments'] });
      closeModal();
    },
  });

  const deleteDept = useMutation({
    mutationFn: (id) => adminApi.deleteDepartment(id),
    onSuccess: () => {
      toast.success('Department deleted!');
      queryClient.invalidateQueries({ queryKey: ['admin-departments'] });
    },
  });

  const openModal = (dept = null) => {
    if (dept) {
      setEditingDept(dept);
      setValue('name', dept.name);
      setValue('code', dept.code);
      setValue('description', dept.description || '');
    } else {
      setEditingDept(null);
      reset();
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDept(null);
    reset();
  };

  const departments = deptsRes || [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="page-subtitle">Manage institution departments</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary gap-2">
          <Plus className="w-4 h-4" /> Add Department
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="spinner" /></div>
      ) : departments.length === 0 ? (
        <div className="card p-16 text-center text-slate-400">No departments found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept, i) => (
            <motion.div
              key={dept._id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card p-5"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-violet-400" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openModal(dept)} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-white/5 transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => { if(window.confirm('Delete this department?')) deleteDept.mutate(dept._id); }} 
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-lg text-white mb-1 truncate">{dept.name}</h3>
              <p className="text-sm font-mono text-brand-400 mb-3">{dept.code}</p>
              {dept.description && <p className="text-sm text-slate-400 line-clamp-2 mb-4">{dept.description}</p>}

              <div className="pt-4 border-t border-white/5 flex justify-between items-center text-xs text-slate-500">
                <span>{dept.courseCount || 0} Courses</span>
                <span>Added {formatDate(dept.createdAt)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-card w-full max-w-md p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">{editingDept ? 'Edit Department' : 'Add Department'}</h2>
              <button onClick={closeModal} className="btn-ghost btn-sm"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={handleSubmit((data) => saveDept.mutate(data))} className="space-y-4">
              <div>
                <label className="label">Department Name</label>
                <input type="text" placeholder="e.g. Computer Science" className={`input ${errors.name ? 'input-error' : ''}`} {...register('name')} />
                {errors.name && <p className="error-msg">⚠ {errors.name.message}</p>}
              </div>
              <div>
                <label className="label">Department Code</label>
                <input type="text" placeholder="e.g. CS" className={`input uppercase ${errors.code ? 'input-error' : ''}`} {...register('code')} />
                {errors.code && <p className="error-msg">⚠ {errors.code.message}</p>}
              </div>
              <div>
                <label className="label">Description (optional)</label>
                <textarea placeholder="Brief description..." rows="3" className="input" {...register('description')} />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saveDept.isPending} className="btn-primary flex-1">
                  {saveDept.isPending ? <div className="spinner" /> : 'Save Department'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Departments;
