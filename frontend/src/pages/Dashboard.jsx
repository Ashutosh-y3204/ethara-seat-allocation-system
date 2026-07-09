import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend
} from 'recharts';
import { 
  RxPerson, RxLayers, RxGrid, RxCalendar, RxCheckCircled, RxCrossCircled, RxExclamationTriangle 
} from 'react-icons/rx';

export const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/api/dashboard');
        setData(res.data);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
        setError('Error loading dashboard analytics. Please verify database seeding.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-900 border border-slate-800 rounded-xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-80 lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl"></div>
          <div className="h-80 bg-slate-900 border border-slate-800 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-900 border border-slate-800 rounded-xl"></div>
          <div className="h-80 bg-slate-900 border border-slate-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
        <RxExclamationTriangle className="h-12 w-12 text-rose-500 mx-auto" />
        <p className="text-slate-300 font-medium">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  const kpis = data.kpis;
  const PIE_COLORS = ['#14b8a6', '#3b82f6', '#f59e0b', '#ef4444']; // Occupied, Available, Reserved, Maintenance
  const seatPieData = [
    { name: 'Occupied', value: kpis.occupied_seats },
    { name: 'Available', value: kpis.available_seats },
    { name: 'Reserved', value: kpis.reserved_seats },
    { name: 'Maintenance', value: kpis.maintenance_seats }
  ];

  return (
    <div className="space-y-6">
      {/* 1. KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Employees */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg">
            <RxPerson className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Active Employees</p>
            <h3 className="text-2xl font-bold text-white mt-1">{kpis.total_employees.toLocaleString()}</h3>
          </div>
        </div>

        {/* Total Projects */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-lg">
            <RxLayers className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Projects</p>
            <h3 className="text-2xl font-bold text-white mt-1">{kpis.total_projects}</h3>
          </div>
        </div>

        {/* Seat Utilization */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-lg">
            <RxGrid className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Seat Utilization</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-bold text-white">{kpis.seat_utilization_rate}%</h3>
              <span className="text-[10px] text-slate-500 font-semibold">{kpis.occupied_seats} / {kpis.total_seats} seats</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-teal-500 h-full rounded-full" style={{ width: `${kpis.seat_utilization_rate}%` }}></div>
            </div>
          </div>
        </div>

        {/* New Joiners Counter */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg">
            <RxCalendar className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">New Hires (30d)</p>
            <h3 className="text-2xl font-bold text-white mt-1">+{kpis.new_joiners_count}</h3>
          </div>
        </div>
      </div>

      {/* 2. Primary Analytics Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Building Occupancy (Stacked Bar Chart) */}
        <div className="glass-panel p-6 rounded-xl lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Building Occupancy Details</h3>
            <span className="text-xs text-teal-400 font-semibold">Vacant vs Occupied</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.building_occupancy} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="building" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="occupied" name="Occupied Seats" stackId="a" fill="#14b8a6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="available" name="Available Seats" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Seat Status Breakdown (Pie Chart) */}
        <div className="glass-panel p-6 rounded-xl space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Seat Inventory Status</h3>
          <div className="h-52 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={seatPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {seatPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-white">{kpis.total_seats.toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Desks</span>
            </div>
          </div>
          {/* Legend Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-teal-500"></span>
              <span className="text-slate-400">Occupied: {kpis.occupied_seats}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
              <span className="text-slate-400">Available: {kpis.available_seats}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
              <span className="text-slate-400">Reserved: {kpis.reserved_seats}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
              <span className="text-slate-400">Maint: {kpis.maintenance_seats}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Distribution Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Distribution (Horizontal Bar Chart) */}
        <div className="glass-panel p-6 rounded-xl space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Department Workforce Distribution</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={data.department_distribution} 
                layout="vertical" 
                margin={{ top: 5, right: 10, left: 30, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis dataKey="department" type="category" stroke="#94a3b8" fontSize={10} width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                />
                <Bar dataKey="count" name="Employees" fill="#a78bfa" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Allocation Trend (Line Chart) */}
        <div className="glass-panel p-6 rounded-xl space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Seat Allocation Monthly Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthly_trend} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                />
                <Line type="monotone" dataKey="allocations" name="Allocations Completed" stroke="#14b8a6" strokeWidth={2} dot={{ fill: '#14b8a6', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. New Joiners Table */}
      <div className="glass-panel p-6 rounded-xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Recently Boarded Joiners</h3>
          <span className="text-xs text-slate-400">Showing last 10 entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase">
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Joining Date</th>
                <th className="py-3 px-4">Seat</th>
                <th className="py-3 px-4">Project</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {data.new_joiners.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-semibold text-slate-300">{emp.employee_id}</td>
                  <td className="py-3 px-4 font-medium text-white">{emp.name}</td>
                  <td className="py-3 px-4 text-slate-300">{emp.department?.name}</td>
                  <td className="py-3 px-4 text-slate-400">{emp.designation}</td>
                  <td className="py-3 px-4 text-slate-300">{new Date(emp.joining_date).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    {emp.assigned_seat ? (
                      <span className="text-xs font-semibold font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                        {emp.assigned_seat}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-500 italic">Unallocated</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {emp.assigned_project ? (
                      <span className="text-xs font-medium text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {emp.assigned_project}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-500 italic">None</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
