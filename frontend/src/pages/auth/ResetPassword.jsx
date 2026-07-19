import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { QrCode, Lock, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authApi } from '@/api/auth.api';

const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const ResetPassword = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(resetPasswordSchema),
  });

  const resetMutation = useMutation({
    mutationFn: (data) => authApi.resetPassword({
      token,
      email,
      newPassword: data.newPassword,
    }),
    onSuccess: () => {
      toast.success('Password reset successful. Please sign in.');
      navigate('/login');
    },
  });

  if (!token || !email) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Invalid reset link</h2>
          <p className="text-slate-400 mb-6">This password reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="btn-primary">Request a new link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">QRCodeAttend</span>
        </div>

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white">Reset password</h2>
          <p className="text-slate-400 mt-2">Enter your new password below.</p>
        </div>

        <form onSubmit={handleSubmit((data) => resetMutation.mutate(data))} className="space-y-5">
          <div>
            <label htmlFor="reset-password" className="label">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                id="reset-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min 8 chars, uppercase, number"
                className={`input pl-10 pr-11 ${errors.newPassword ? 'input-error' : ''}`}
                {...register('newPassword')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.newPassword && <p className="error-msg">⚠ {errors.newPassword.message}</p>}
          </div>

          <div>
            <label htmlFor="reset-confirm-password" className="label">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                id="reset-confirm-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter your password"
                className={`input pl-10 ${errors.confirmPassword ? 'input-error' : ''}`}
                {...register('confirmPassword')}
              />
            </div>
            {errors.confirmPassword && <p className="error-msg">⚠ {errors.confirmPassword.message}</p>}
          </div>

          <button
            id="reset-password-submit-btn"
            type="submit"
            disabled={resetMutation.isPending}
            className="btn-primary w-full btn-lg mt-2"
          >
            {resetMutation.isPending ? (
              <><div className="spinner" /> Resetting...</>
            ) : (
              <>Reset Password <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-brand-400 hover:text-brand-300 font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
