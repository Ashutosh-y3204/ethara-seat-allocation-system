import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import api from '../services/api';

export const Profile = () => {
  const { user } = useAuth();
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const onSubmitPassword = async (data) => {
    setSuccess('');
    setError('');
    
    if (data.new_password !== data.confirm_password) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      // API accepts partial EmployeeUpdate object including password
      await api.put(`/api/employees/${user.id}`, {
        password: data.new_password
      });
      setSuccess('Your account password has been updated successfully.');
      reset();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 select-none">
      {/* 1. Profile card */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-6 lg:col-span-1 h-fit">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-primary-600 to-teal-400 flex items-center justify-center font-extrabold text-2xl text-white uppercase border border-slate-700">
            {user?.name?.slice(0, 2)}
          </div>
          <div>
            <h3 className="font-extrabold text-white text-lg leading-tight">{user?.name}</h3>
            <span className="text-[10px] bg-primary-500/10 text-primary-400 font-semibold px-2 py-0.5 rounded border border-primary-500/20 uppercase inline-block mt-1">{user?.role}</span>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-4 space-y-3 text-xs">
          <div>
            <span className="block text-slate-500 font-semibold uppercase mb-0.5">Employee Code</span>
            <span className="font-mono text-slate-200 font-semibold">{user?.employee_id}</span>
          </div>
          <div>
            <span className="block text-slate-500 font-semibold uppercase mb-0.5">Contact Email</span>
            <span className="text-slate-200">{user?.email}</span>
          </div>
          <div>
            <span className="block text-slate-500 font-semibold uppercase mb-0.5">Department & Title</span>
            <span className="text-slate-200">{user?.department?.name} • {user?.designation}</span>
          </div>
          <div>
            <span className="block text-slate-500 font-semibold uppercase mb-0.5">Joining Date</span>
            <span className="text-slate-200">{user?.joining_date ? new Date(user.joining_date).toLocaleDateString() : 'N/A'}</span>
          </div>
          <div>
            <span className="block text-slate-500 font-semibold uppercase mb-0.5">Desk Assigned</span>
            <span className="font-mono text-teal-400 font-bold bg-slate-900 border border-slate-800 px-2 py-0.5 rounded uppercase mt-0.5 inline-block">
              {user?.assigned_seat || 'Unallocated'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Change password form */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 lg:col-span-2 space-y-6">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Account Security</h3>
          <p className="text-xs text-slate-500 mt-1">Configure credentials or change your current system password.</p>
        </div>

        {success && (
          <div className="p-3 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold">
            {success}
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-600/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-4 max-w-md text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">New Password*</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className={`form-input text-xs ${errors.new_password ? 'border-rose-500' : ''}`}
              {...register('new_password', { 
                required: 'New password is required', 
                minLength: { value: 6, message: 'Password must be at least 6 characters' } 
              })} 
            />
            {errors.new_password && <p className="mt-1 text-xs text-rose-400">{errors.new_password.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Confirm New Password*</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className={`form-input text-xs ${errors.confirm_password ? 'border-rose-500' : ''}`}
              {...register('confirm_password', { required: 'Please confirm your new password' })} 
            />
            {errors.confirm_password && <p className="mt-1 text-xs text-rose-400">{errors.confirm_password.message}</p>}
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary text-xs font-semibold"
            >
              {loading ? 'Saving...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
