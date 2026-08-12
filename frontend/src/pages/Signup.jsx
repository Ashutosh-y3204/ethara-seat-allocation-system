import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const DEFAULT_DEPTS = [
  { id: 1, name: 'Engineering', code: 'ENG' },
  { id: 2, name: 'Human Resources', code: 'HR' },
  { id: 3, name: 'Product Management', code: 'PMO' },
  { id: 4, name: 'Finance', code: 'FIN' },
  { id: 5, name: 'Operations', code: 'OPS' },
  { id: 6, name: 'Marketing', code: 'MKT' },
  { id: 7, name: 'Design', code: 'DES' },
  { id: 8, name: 'Quality Assurance', code: 'QA' },
  { id: 9, name: 'DevOps', code: 'DEV' },
  { id: 10, name: 'Sales', code: 'SAL' },
];

export const Signup = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState(DEFAULT_DEPTS);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      joining_date: new Date().toISOString().split('T')[0],
      role: 'Employee',
      status: 'Active'
    }
  });

  // Load departments dropdown on component mount
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await api.get('/api/employees/departments');
        if (Array.isArray(res.data) && res.data.length > 0) {
          setDepartments(res.data);
        }
      } catch (err) {
        console.error('Failed to load live departments, using fallback list', err);
      }
    };
    fetchDepts();
  }, []);

  const onSubmit = async (data) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      // POST signup request
      await api.post('/api/auth/signup', data);
      setSuccess('Your profile has been created successfully! Redirecting you to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Check if employee ID or email is already registered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden select-none">
      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-lg space-y-8 z-10">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-tr from-primary-600 to-teal-400 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg">
            E
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white">Create Account</h2>
          <p className="mt-2 text-sm text-slate-400">Join the Ethara seat allocation workspace</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 backdrop-blur-xl p-8 rounded-2xl shadow-2xl space-y-6">
          {error && (
            <div className="p-3 bg-rose-600/10 border border-rose-500/20 text-rose-400 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium">
              {success}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Employee ID*</label>
                <input
                  type="text"
                  placeholder="e.g., EMP6001"
                  className={`form-input text-xs ${errors.employee_id ? 'border-rose-500' : ''}`}
                  {...register('employee_id', { required: 'Employee ID is required' })}
                />
                {errors.employee_id && <p className="mt-1 text-[10px] text-rose-400">{errors.employee_id.message}</p>}
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Full Name*</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  className={`form-input text-xs ${errors.name ? 'border-rose-500' : ''}`}
                  {...register('name', { required: 'Full name is required' })}
                />
                {errors.name && <p className="mt-1 text-[10px] text-rose-400">{errors.name.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Email Address*</label>
                <input
                  type="email"
                  placeholder="john.doe@company.com"
                  className={`form-input text-xs ${errors.email ? 'border-rose-500' : ''}`}
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' }
                  })}
                />
                {errors.email && <p className="mt-1 text-[10px] text-rose-400">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Phone Number</label>
                <input
                  type="text"
                  placeholder="+9715000000"
                  className="form-input text-xs"
                  {...register('phone')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Department*</label>
                <select
                  className={`form-input text-xs ${errors.department_id ? 'border-rose-500' : ''}`}
                  {...register('department_id', { required: 'Department is required', valueAsNumber: true })}
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                {errors.department_id && <p className="mt-1 text-[10px] text-rose-400">{errors.department_id.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Designation*</label>
                <input
                  type="text"
                  placeholder="Software Engineer"
                  className={`form-input text-xs ${errors.designation ? 'border-rose-500' : ''}`}
                  {...register('designation', { required: 'Designation is required' })}
                />
                {errors.designation && <p className="mt-1 text-[10px] text-rose-400">{errors.designation.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Joining Date*</label>
                <input
                  type="date"
                  className="form-input text-xs"
                  {...register('joining_date', { required: true })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Password*</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className={`form-input text-xs ${errors.password ? 'border-rose-500' : ''}`}
                  {...register('password', { 
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' }
                  })}
                />
                {errors.password && <p className="mt-1 text-[10px] text-rose-400">{errors.password.message}</p>}
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-2.5 flex items-center justify-center font-semibold text-sm"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent border-white"></div>
                ) : (
                  'Create Profile'
                )}
              </button>
            </div>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
