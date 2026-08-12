import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setError('');
    setLoading(true);
    try {
      await login(data.email, data.password);
      navigate('/');
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (email, password) => {
    setValue('email', email);
    setValue('password', password);
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden select-none">
      {/* Decorative background gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md space-y-8 z-10">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-tr from-primary-600 to-teal-400 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-primary-500/20">
            E
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white">Ethara Systems</h2>
          <p className="mt-2 text-sm text-slate-400">Seat Allocation & Project Mapping System</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 backdrop-blur-xl p-8 rounded-2xl shadow-2xl space-y-6">
          {error && (
            <div className="p-3 bg-rose-600/10 border border-rose-500/20 text-rose-400 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="email-address" className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Email Address
              </label>
              <input
                id="email-address"
                type="email"
                placeholder="email@example.com"
                className={`form-input ${errors.email ? 'border-rose-500 focus:ring-rose-500/30 focus:border-rose-500' : ''}`}
                {...register('email', { 
                  required: 'Email address is required', 
                  pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' } 
                })}
              />
              {errors.email && <p className="mt-1 text-xs text-rose-400">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className={`form-input ${errors.password ? 'border-rose-500 focus:ring-rose-500/30 focus:border-rose-500' : ''}`}
                {...register('password', { required: 'Password is required' })}
              />
              {errors.password && <p className="mt-1 text-xs text-rose-400">{errors.password.message}</p>}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-2.5 flex items-center justify-center font-semibold text-sm"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent border-white"></div>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>

          <div className="text-center pt-1">
            <p className="text-xs text-slate-400">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary-400 hover:text-primary-300 font-semibold transition-all">
                Register here
              </Link>
            </p>
          </div>

          {/* Quick Demo Credentials Widget */}
          <div className="border-t border-slate-800 pt-6">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Assessment Test Accounts
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => quickLogin('admin@ethara.com', 'password123')}
                className="p-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-left transition-all cursor-pointer"
              >
                <div className="font-semibold text-primary-400">Admin (1-Click)</div>
                <div className="text-[10px] text-slate-500">admin@ethara.com</div>
              </button>
              <button
                type="button"
                onClick={() => quickLogin('hr@ethara.com', 'password123')}
                className="p-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-left transition-all cursor-pointer"
              >
                <div className="font-semibold text-teal-400">HR Exec (1-Click)</div>
                <div className="text-[10px] text-slate-500">hr@ethara.com</div>
              </button>
              <button
                type="button"
                onClick={() => quickLogin('pm@ethara.com', 'password123')}
                className="p-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-left transition-all cursor-pointer"
              >
                <div className="font-semibold text-indigo-400">PM (1-Click)</div>
                <div className="text-[10px] text-slate-500">pm@ethara.com</div>
              </button>
              <button
                type="button"
                onClick={() => quickLogin('employee@ethara.com', 'password123')}
                className="p-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-left transition-all cursor-pointer"
              >
                <div className="font-semibold text-slate-400">Employee (1-Click)</div>
                <div className="text-[10px] text-slate-500">employee@ethara.com</div>
              </button>
            </div>
            <div className="mt-3 text-[10px] text-slate-500 text-center">
              All demo accounts use password <code className="text-slate-400 font-mono">password123</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
