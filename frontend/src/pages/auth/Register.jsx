import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, QrCode, Mail, Lock, User, Hash, Building2, ArrowRight } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authApi } from '@/api/auth.api';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  role: z.enum(['faculty', 'student'], { required_error: 'Select a role' }),
  institutionCode: z.string().min(3, 'Institution code is required'),
  enrollmentNumber: z.string().optional(),
}).refine(
  (data) => data.role !== 'student' || (data.enrollmentNumber && data.enrollmentNumber.length > 0),
  { message: 'Enrollment number is required for students', path: ['enrollmentNumber'] }
);

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'student' },
  });

  const role = watch('role');

  const registerMutation = useMutation({
    mutationFn: (data) => authApi.register(data),
    onSuccess: () => {
      toast.success('Account created! Please sign in.');
      navigate('/login');
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 relative" style={{ background: 'linear-gradient(135deg, #0a0a14 0%, #111120 50%, #0a0a14 100%)' }}>
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="orb orb-brand w-80 h-80" style={{ top: '5%', right: '15%' }} />
        <div className="orb orb-violet w-64 h-64" style={{ bottom: '10%', left: '10%', animationDelay: '2s' }} />
        <div className="mesh-bg absolute inset-0 opacity-40" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg relative z-10"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-glow" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">QRCodeAttend</span>
        </div>

        <div className="glass-card p-8">
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-white">Create your account</h2>
            <p className="text-slate-400 mt-1.5 text-sm">Join your institution on QRCodeAttend</p>
          </div>

        <form onSubmit={handleSubmit((data) => registerMutation.mutate(data))} className="space-y-4">
          <div>
            <label className="label">I am a</label>
            <div className="grid grid-cols-2 gap-3">
              {['student', 'faculty'].map((r) => (
                <label
                  key={r}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                    role === r
                      ? 'bg-brand-500/20 border-brand-500/50 text-brand-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <input type="radio" value={r} className="hidden" {...register('role')} />
                  <span className="capitalize font-semibold text-sm">{r}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="reg-name" className="label">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input id="reg-name" type="text" placeholder="John Doe" className={`input pl-10 ${errors.name ? 'input-error' : ''}`} {...register('name')} />
            </div>
            {errors.name && <p className="error-msg">⚠ {errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="reg-email" className="label">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input id="reg-email" type="email" placeholder="you@university.edu" className={`input pl-10 ${errors.email ? 'input-error' : ''}`} {...register('email')} />
            </div>
            {errors.email && <p className="error-msg">⚠ {errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="reg-inst-code" className="label">Institution Code</label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input id="reg-inst-code" type="text" placeholder="e.g. NITD, IIT" className={`input pl-10 uppercase ${errors.institutionCode ? 'input-error' : ''}`} {...register('institutionCode')} />
            </div>
            {errors.institutionCode && <p className="error-msg">⚠ {errors.institutionCode.message}</p>}
          </div>

          {role === 'student' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <label htmlFor="reg-enrollment" className="label">Enrollment Number</label>
              <div className="relative">
                <Hash className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input id="reg-enrollment" type="text" placeholder="e.g. CS2021001" className={`input pl-10 ${errors.enrollmentNumber ? 'input-error' : ''}`} {...register('enrollmentNumber')} />
              </div>
              {errors.enrollmentNumber && <p className="error-msg">⚠ {errors.enrollmentNumber.message}</p>}
            </motion.div>
          )}

          <div>
            <label htmlFor="reg-password" className="label">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input id="reg-password" type={showPassword ? 'text' : 'password'} placeholder="Min 8 chars, uppercase, number" className={`input pl-10 pr-11 ${errors.password ? 'input-error' : ''}`} {...register('password')} />
              <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-colors" tabIndex={-1}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="error-msg">⚠ {errors.password.message}</p>}
          </div>

          <button id="register-submit-btn" type="submit" disabled={registerMutation.isPending} className="btn-primary w-full btn-lg mt-2">
            {registerMutation.isPending ? <><div className="spinner" /> Creating account...</> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
