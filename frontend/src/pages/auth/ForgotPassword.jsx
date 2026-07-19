import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { QrCode, Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authApi } from '@/api/auth.api';

const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

const ForgotPassword = () => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const forgotMutation = useMutation({
    mutationFn: (data) => authApi.forgotPassword(data.email),
    onSuccess: () => {
      toast.success('If that email exists, a reset link has been sent.');
    },
  });

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
          <h2 className="text-3xl font-bold text-white">Forgot password?</h2>
          <p className="text-slate-400 mt-2">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit((data) => forgotMutation.mutate(data))} className="space-y-5">
          <div>
            <label htmlFor="forgot-email" className="label">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                placeholder="you@university.edu"
                className={`input pl-10 ${errors.email ? 'input-error' : ''}`}
                {...register('email')}
              />
            </div>
            {errors.email && <p className="error-msg">⚠ {errors.email.message}</p>}
          </div>

          <button
            id="forgot-password-submit-btn"
            type="submit"
            disabled={forgotMutation.isPending}
            className="btn-primary w-full btn-lg mt-2"
          >
            {forgotMutation.isPending ? (
              <><div className="spinner" /> Sending link...</>
            ) : (
              <>Send Reset Link <ArrowRight className="w-4 h-4" /></>
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

export default ForgotPassword;
