import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, QrCode, Mail, Lock, ArrowRight, Zap, Shield, MapPin } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/authStore';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const features = [
  { icon: Zap, label: 'Dynamic QR Codes', desc: 'Rotate every 30s to prevent sharing', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { icon: MapPin, label: 'GPS Verification', desc: 'Physical presence confirmed via geo-fence', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { icon: Shield, label: 'Anti-Proxy System', desc: 'Device fingerprinting stops cheaters', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
];

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { loginSuccess } = useAuthStore();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation({
    mutationFn: (data) => authApi.login(data),
    onSuccess: (res) => {
      const { user, tokens } = res.data.data;
      loginSuccess(user, tokens);
      toast.success(`Welcome back, ${user.name}!`);
      const dashboardMap = { admin: '/admin/dashboard', faculty: '/faculty/dashboard', student: '/student/dashboard' };
      navigate(dashboardMap[user.role] || '/');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Login failed. Please try again.');
    },
  });

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0a14 0%, #111120 50%, #0a0a14 100%)' }}>
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="orb orb-brand w-96 h-96" style={{ top: '10%', left: '20%', animationDelay: '0s' }} />
        <div className="orb orb-violet w-72 h-72" style={{ bottom: '15%', right: '10%', animationDelay: '3s' }} />
        <div className="orb orb-cyan w-64 h-64" style={{ top: '60%', left: '5%', animationDelay: '1.5s' }} />
        <div className="mesh-bg absolute inset-0 opacity-40" />
      </div>

      {/* Left — Branding Panel */}
      <div className="hidden lg:flex flex-col w-[55%] relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-center h-full px-16">
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="mb-12"
          >
            <div className="flex items-center gap-4 mb-8">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-glow-lg"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                <QrCode className="w-9 h-9 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black gradient-text">QRCodeAttend</h1>
                <p className="text-sm text-slate-500 font-medium">Smart Attendance System</p>
              </div>
            </div>

            <h2 className="text-5xl font-black text-white leading-tight mb-4">
              Zero Proxies.<br />
              <span className="gradient-text">Real Attendance.</span>
            </h2>
            <p className="text-lg text-slate-400 leading-relaxed max-w-md">
              The most advanced QR-based attendance platform with GPS verification and device fingerprinting.
            </p>
          </motion.div>

          {/* Feature Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="space-y-3"
          >
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] hover:border-white/10 transition-all duration-300"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center flex-shrink-0`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.label}</p>
                  <p className="text-xs text-slate-500">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Bottom stat strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-10 flex items-center gap-8"
          >
            {[
              { value: '99.9%', label: 'Accuracy' },
              { value: '<2s', label: 'Scan Time' },
              { value: '0', label: 'Proxy Passes' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-black gradient-text">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">QRCodeAttend</span>
          </div>

          {/* Form Card */}
          <div className="glass-card p-8">
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-white">Welcome back</h2>
              <p className="text-slate-400 mt-1.5 text-sm">Sign in to access your dashboard</p>
            </div>

            <form onSubmit={handleSubmit((data) => loginMutation.mutate(data))} className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="login-email" className="label">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@university.edu"
                    className={`input pl-10 ${errors.email ? 'input-error' : ''}`}
                    {...register('email')}
                  />
                </div>
                <AnimatePresence>
                  {errors.email && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="error-msg"
                    >
                      ⚠ {errors.email.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password" className="label mb-0">Password</label>
                  <Link to="/forgot-password" className="text-xs text-brand-400 hover:text-brand-300 transition-colors font-medium">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={`input pl-10 pr-11 ${errors.password ? 'input-error' : ''}`}
                    {...register('password')}
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
                <AnimatePresence>
                  {errors.password && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="error-msg"
                    >
                      ⚠ {errors.password.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit */}
              <button
                id="login-submit-btn"
                type="submit"
                disabled={loginMutation.isPending}
                className="btn-primary w-full btn-lg mt-2"
              >
                {loginMutation.isPending ? (
                  <>
                    <div className="spinner" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6 pt-5 border-t border-white/[0.06]">
              <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wider">Demo Credentials</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { role: 'Admin', email: 'admin@qrcodeattend.com', pass: 'Admin@1234', color: 'text-violet-400' },
                  { role: 'Faculty', email: 'faculty@git.edu', pass: 'Faculty@1234', color: 'text-cyan-400' },
                  { role: 'Student', email: 'student@git.edu', pass: 'Student@1234', color: 'text-emerald-400' },
                ].map(({ role, email, pass, color }) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      loginMutation.mutate({ email, password: pass });
                    }}
                    className="p-2 rounded-xl border border-white/[0.06] hover:border-white/[0.12] transition-all text-center hover:bg-white/[0.04] group"
                  >
                    <p className={`text-xs font-bold ${color}`}>{role}</p>
                    <p className="text-[10px] text-slate-600 group-hover:text-slate-500 transition-colors mt-0.5">Quick login</p>
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-5 text-center text-sm text-slate-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
                Create account
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
