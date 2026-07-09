import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { 
  RxPlus, RxPencil1, RxTrash, RxChevronLeft, RxChevronRight, RxCross1, RxCheck, RxCrossCircled, 
  RxExclamationTriangle, RxShadowOuter 
} from 'react-icons/rx';

export const Employees = () => {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // List State
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('employee_id');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modals & Drawers State
  const [selectedEmp, setSelectedEmp] = useState(null); // Detail drawer
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [empToEdit, setEmpToEdit] = useState(null);
  
  // Suggestion State
  const [suggestedSeat, setSuggestedSeat] = useState(null);
  const [suggesting, setSuggesting] = useState(false);

  // Forms
  const { register: regCreate, handleSubmit: handleCreateSubmit, reset: resetCreate, formState: { errors: errorsCreate } } = useForm();
  const { register: regEdit, handleSubmit: handleEditSubmit, reset: resetEdit, formState: { errors: errorsEdit } } = useForm();

  // Load departments
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await api.get('/api/employees/departments');
        setDepartments(res.data);
      } catch (err) {
        console.error('Failed to load departments', err);
      }
    };
    fetchDepts();
  }, []);

  // Sync global search from query param
  useEffect(() => {
    const searchParam = searchParams.get('search');
    if (searchParam) {
      setSearch(searchParam);
      setPage(1);
    }
  }, [searchParams]);

  // Load employees list
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/employees', {
        params: {
          page,
          size: 10,
          search: search || undefined,
          department_id: selectedDept || undefined,
          status: selectedStatus || undefined,
          sort_by: sortBy,
          sort_order: sortOrder
        }
      });
      setEmployees(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.pages);
    } catch (err) {
      console.error('Failed to load employees', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [page, selectedDept, selectedStatus, sortBy, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearchParams(search ? { search } : {});
    fetchEmployees();
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedDept('');
    setSelectedStatus('');
    setSearchParams({});
    setPage(1);
  };

  // CRUD Handlers
  const onCreateEmployee = async (data) => {
    try {
      await api.post('/api/employees', data);
      setIsCreateOpen(false);
      resetCreate();
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create employee');
    }
  };

  const onEditEmployee = async (data) => {
    try {
      // Remove empty password field
      if (!data.password) {
        delete data.password;
      }
      await api.put(`/api/employees/${empToEdit.id}`, data);
      setIsEditOpen(false);
      setEmpToEdit(null);
      resetEdit();
      fetchEmployees();
      // If drawer is open, update selected employee details too
      if (selectedEmp && selectedEmp.id === empToEdit.id) {
        const updated = await api.get(`/api/employees/${empToEdit.id}`);
        setSelectedEmp(updated.data);
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update employee');
    }
  };

  const onDeleteEmployee = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee record? This will release their current seat and project membership.')) {
      return;
    }
    try {
      await api.delete(`/api/employees/${id}`);
      setSelectedEmp(null);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete employee');
    }
  };

  // Seat Allocation Suggestion
  const handleSuggestSeat = async (empId) => {
    setSuggesting(true);
    setSuggestedSeat(null);
    try {
      const res = await api.get(`/api/seats/suggest/${empId}`);
      setSuggestedSeat(res.data);
    } catch (err) {
      alert(err.response?.data?.detail || 'No available seats matching criteria.');
    } finally {
      setSuggesting(false);
    }
  };

  const handleAllocateSuggestedSeat = async () => {
    if (!suggestedSeat || !selectedEmp) return;
    try {
      await api.post(`/api/seats/${suggestedSeat.seat_id}/allocate`, {
        employee_id: selectedEmp.id
      });
      alert(`Seat ${suggestedSeat.seat_number} successfully allocated!`);
      setSuggestedSeat(null);
      // Refresh drawer employee details & list
      const updated = await api.get(`/api/employees/${selectedEmp.id}`);
      setSelectedEmp(updated.data);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.detail || 'Allocation failed');
    }
  };

  const handleReleaseSeat = async (seatNum) => {
    if (!window.confirm(`Are you sure you want to release seat ${seatNum}?`)) return;
    try {
      // Find seat by seat number to get ID
      const seatsRes = await api.get('/api/seats', { params: { search: seatNum } });
      const seat = seatsRes.data.find(s => s.seat_number === seatNum);
      if (!seat) {
        alert('Seat not found in system.');
        return;
      }

      await api.post(`/api/seats/${seat.id}/release`);
      alert('Seat released successfully!');
      
      // Refresh drawer employee details & list
      const updated = await api.get(`/api/employees/${selectedEmp.id}`);
      setSelectedEmp(updated.data);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.detail || 'Release failed');
    }
  };

  const handleOpenEdit = (emp) => {
    setEmpToEdit(emp);
    setIsEditOpen(true);
    // Prefill form
    setTimeout(() => {
      resetEdit({
        employee_id: emp.employee_id,
        name: emp.name,
        email: emp.email,
        phone: emp.phone || '',
        department_id: emp.department_id,
        designation: emp.designation,
        joining_date: emp.joining_date,
        role: emp.role,
        status: emp.status
      });
    }, 50);
  };

  return (
    <div className="space-y-6 relative min-h-[calc(100vh-10rem)]">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/50 p-4 border border-slate-850 rounded-xl">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full sm:max-w-md">
          <input
            type="text"
            placeholder="Search name, code, design..."
            className="form-input text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn-primary text-sm font-semibold whitespace-nowrap">
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Dept Filter */}
          <select 
            value={selectedDept} 
            onChange={(e) => { setSelectedDept(e.target.value); setPage(1); }}
            className="form-input text-xs max-w-[150px] py-1.5"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select 
            value={selectedStatus} 
            onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
            className="form-input text-xs max-w-[120px] py-1.5"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          {/* Clear Filters */}
          {(search || selectedDept || selectedStatus) && (
            <button 
              onClick={handleClearFilters}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              Clear
            </button>
          )}

          {/* Create Button (Admin/HR only) */}
          {['Admin', 'HR'].includes(currentUser?.role) && (
            <button 
              onClick={() => setIsCreateOpen(true)}
              className="btn-primary text-xs flex items-center gap-1.5 py-1.5 ml-auto sm:ml-0"
            >
              <RxPlus className="h-4 w-4" />
              Add Employee
            </button>
          )}
        </div>
      </div>

      {/* 2. Employee Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent border-primary-500"></div>
          </div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium">
            No employees found matching filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase bg-slate-900/30">
                  <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => { setSortBy('employee_id'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                    Employee ID {sortBy === 'employee_id' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => { setSortBy('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                    Name {sortBy === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => { setSortBy('designation'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                    Designation {sortBy === 'designation' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-3.5 px-4">Seat</th>
                  <th className="py-3.5 px-4">Project</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {employees.map((emp) => (
                  <tr 
                    key={emp.id} 
                    className="hover:bg-slate-900/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedEmp(emp)}
                  >
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-300">{emp.employee_id}</td>
                    <td className="py-3.5 px-4 font-medium text-white">{emp.name}</td>
                    <td className="py-3.5 px-4 text-slate-300">{emp.department?.name}</td>
                    <td className="py-3.5 px-4 text-slate-400">{emp.designation}</td>
                    <td className="py-3.5 px-4">
                      {emp.assigned_seat ? (
                        <span className="text-xs font-semibold font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                          {emp.assigned_seat}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-600 italic">Unallocated</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {emp.assigned_project ? (
                        <span className="text-xs font-medium text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          {emp.assigned_project}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-600 italic">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={emp.status === 'Active' ? 'badge-available' : 'badge-maintenance'}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1.5">
                        {['Admin', 'HR'].includes(currentUser?.role) && (
                          <button 
                            onClick={() => handleOpenEdit(emp)}
                            className="p-1.5 text-slate-400 hover:text-primary-400 hover:bg-slate-800 rounded-md transition-colors"
                            title="Edit"
                          >
                            <RxPencil1 className="h-4 w-4" />
                          </button>
                        )}
                        {currentUser?.role === 'Admin' && (
                          <button 
                            onClick={() => onDeleteEmployee(emp.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors"
                            title="Delete"
                          >
                            <RxTrash className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 border-t border-slate-800 text-xs">
            <span className="text-slate-400">
              Showing <span className="font-semibold text-white">{employees.length}</span> of{' '}
              <span className="font-semibold text-white">{total.toLocaleString()}</span> employees
            </span>
            <div className="flex items-center gap-3">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1 border border-slate-800 rounded bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none"
              >
                <RxChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-slate-300 font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1 border border-slate-800 rounded bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none"
              >
                <RxChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Employee Detail Drawer */}
      {selectedEmp && (
        <div className="fixed inset-y-0 right-0 z-30 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between animate-slide-left select-none">
          <div>
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Employee Profile Details</h3>
              <button onClick={() => { setSelectedEmp(null); setSuggestedSeat(null); }} className="text-slate-400 hover:text-white">
                <RxCross1 className="h-5 w-5" />
              </button>
            </div>

            {/* Profile Content */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-12rem)]">
              {/* Header card */}
              <div className="flex items-center gap-4 bg-slate-850 p-4 border border-slate-800 rounded-xl">
                <div className="h-14 w-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xl text-primary-400 uppercase">
                  {selectedEmp.name?.slice(0, 2)}
                </div>
                <div>
                  <h4 className="font-bold text-white text-lg">{selectedEmp.name}</h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedEmp.employee_id}</p>
                </div>
              </div>

              {/* Data list */}
              <div className="space-y-4 text-sm">
                <div>
                  <span className="block text-xs text-slate-500 font-semibold uppercase mb-1">Designation & Role</span>
                  <span className="text-white font-medium">{selectedEmp.designation}</span>
                  <span className="ml-2 text-[10px] bg-slate-800 text-slate-400 font-semibold px-2 py-0.5 rounded border border-slate-700 uppercase">{selectedEmp.role}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-500 font-semibold uppercase mb-1">Department</span>
                  <span className="text-white font-medium">{selectedEmp.department?.name}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-500 font-semibold uppercase mb-1">Contact Email</span>
                  <span className="text-slate-300">{selectedEmp.email}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-500 font-semibold uppercase mb-1">Phone Number</span>
                  <span className="text-slate-300">{selectedEmp.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-500 font-semibold uppercase mb-1">Joining Date</span>
                  <span className="text-slate-300">{new Date(selectedEmp.joining_date).toLocaleDateString()}</span>
                </div>

                {/* Seat Mapping */}
                <div className="border-t border-slate-800 pt-4">
                  <span className="block text-xs text-slate-500 font-semibold uppercase mb-2">Workspace Desk</span>
                  {selectedEmp.assigned_seat ? (
                    <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-850 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-teal-400 bg-teal-500/10 px-2.5 py-0.5 text-xs font-bold rounded-full border border-teal-500/20 uppercase">
                          {selectedEmp.assigned_seat}
                        </span>
                        <span className="text-xs text-slate-400">Active Seat</span>
                      </div>
                      {['Admin', 'HR'].includes(currentUser?.role) && (
                        <button 
                          onClick={() => handleReleaseSeat(selectedEmp.assigned_seat)}
                          className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                        >
                          Release
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-950 border border-slate-850 rounded-lg text-center space-y-3">
                      <p className="text-xs text-slate-500 italic">No workspace seat assigned to this employee.</p>
                      {['Admin', 'HR'].includes(currentUser?.role) && (
                        <div>
                          <button
                            onClick={() => handleSuggestSeat(selectedEmp.id)}
                            disabled={suggesting}
                            className="btn-secondary py-1.5 text-xs w-full font-semibold"
                          >
                            {suggesting ? 'Finding Closest Seat...' : 'Suggest Smart Desk'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Suggestion Outcome */}
                  {suggestedSeat && (
                    <div className="mt-3 p-3 bg-primary-500/10 border border-primary-500/25 rounded-lg space-y-2.5 animate-slide-up">
                      <div className="flex justify-between items-start">
                        <div className="text-xs">
                          <span className="block text-[10px] text-primary-400 font-bold uppercase tracking-wider mb-0.5">Suggested Seat</span>
                          <span className="font-mono text-white font-bold text-sm bg-slate-900 border border-slate-800 px-2 py-0.5 rounded uppercase">
                            {suggestedSeat.seat_number}
                          </span>
                        </div>
                        <button onClick={() => setSuggestedSeat(null)} className="text-slate-400 hover:text-slate-200">
                          <RxCross1 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed italic">{suggestedSeat.reason}</p>
                      <button
                        onClick={handleAllocateSuggestedSeat}
                        className="w-full btn-primary text-xs py-1.5 font-semibold flex items-center justify-center gap-1.5"
                      >
                        <RxCheck className="h-4 w-4" />
                        Allocate Sug Desk
                      </button>
                    </div>
                  )}
                </div>

                {/* Project Map */}
                <div className="border-t border-slate-800 pt-4">
                  <span className="block text-xs text-slate-500 font-semibold uppercase mb-1">Assigned Project</span>
                  {selectedEmp.assigned_project ? (
                    <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded border border-indigo-500/20 uppercase inline-block mt-1">
                      {selectedEmp.assigned_project}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-500 italic block mt-1">None assigned yet</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Footer Controls */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex gap-2">
            {['Admin', 'HR'].includes(currentUser?.role) && (
              <button 
                onClick={() => handleOpenEdit(selectedEmp)}
                className="btn-secondary text-sm flex-1 font-semibold flex items-center justify-center gap-1.5"
              >
                <RxPencil1 />
                Edit Profile
              </button>
            )}
            {currentUser?.role === 'Admin' && (
              <button 
                onClick={() => onDeleteEmployee(selectedEmp.id)}
                className="btn-danger text-sm font-semibold px-4 flex items-center justify-center"
              >
                <RxTrash />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. Create Employee Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm select-none">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 m-4 max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-lg font-bold text-white">Create Employee Profile</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">
                <RxCross1 className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit(onCreateEmployee)} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Employee ID*</label>
                  <input type="text" placeholder="EMP5001" className="form-input text-xs" {...errorsCreate.employee_id} {...regCreate('employee_id', { required: true })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name*</label>
                  <input type="text" placeholder="John Doe" className="form-input text-xs" {...errorsCreate.name} {...regCreate('name', { required: true })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Email Address*</label>
                  <input type="email" placeholder="john.doe@company.com" className="form-input text-xs" {...errorsCreate.email} {...regCreate('email', { required: true })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Phone Number</label>
                  <input type="text" placeholder="+1234567890" className="form-input text-xs" {...regCreate('phone')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Department*</label>
                  <select className="form-input text-xs" {...regCreate('department_id', { required: true })}>
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Designation*</label>
                  <input type="text" placeholder="Software Engineer" className="form-input text-xs" {...errorsCreate.designation} {...regCreate('designation', { required: true })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Joining Date*</label>
                  <input type="date" className="form-input text-xs" {...errorsCreate.joining_date} {...regCreate('joining_date', { required: true })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">System Access Role*</label>
                  <select className="form-input text-xs" {...regCreate('role', { required: true })}>
                    <option value="Employee">Employee</option>
                    <option value="HR">HR Executive</option>
                    <option value="Project Manager">Project Manager</option>
                    <option value="Admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Status*</label>
                  <select className="form-input text-xs" {...regCreate('status', { required: true })}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
                  <input type="password" placeholder="Default: password123" className="form-input text-xs" {...regCreate('password')} />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="btn-secondary text-xs">Cancel</button>
                <button type="submit" className="btn-primary text-xs font-semibold">Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Edit Employee Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm select-none">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 m-4 max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-lg font-bold text-white">Edit Employee Profile</h3>
              <button onClick={() => { setIsEditOpen(false); setEmpToEdit(null); }} className="text-slate-400 hover:text-white">
                <RxCross1 className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit(onEditEmployee)} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Employee ID*</label>
                  <input type="text" className="form-input text-xs opacity-60 cursor-not-allowed" readOnly {...regEdit('employee_id')} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name*</label>
                  <input type="text" className="form-input text-xs" {...errorsEdit.name} {...regEdit('name', { required: true })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Email Address*</label>
                  <input type="email" className="form-input text-xs" {...errorsEdit.email} {...regEdit('email', { required: true })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Phone Number</label>
                  <input type="text" className="form-input text-xs" {...regEdit('phone')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Department*</label>
                  <select className="form-input text-xs" {...regEdit('department_id', { required: true })}>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Designation*</label>
                  <input type="text" className="form-input text-xs" {...errorsEdit.designation} {...regEdit('designation', { required: true })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Joining Date*</label>
                  <input type="date" className="form-input text-xs" {...errorsEdit.joining_date} {...regEdit('joining_date', { required: true })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">System Access Role*</label>
                  <select className="form-input text-xs" {...regEdit('role', { required: true })}>
                    <option value="Employee">Employee</option>
                    <option value="HR">HR Executive</option>
                    <option value="Project Manager">Project Manager</option>
                    <option value="Admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Status*</label>
                  <select className="form-input text-xs" {...regEdit('status', { required: true })}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Update Password</label>
                  <input type="password" placeholder="Leave blank to keep same" className="form-input text-xs" {...regEdit('password')} />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => { setIsEditOpen(false); setEmpToEdit(null); }} className="btn-secondary text-xs">Cancel</button>
                <button type="submit" className="btn-primary text-xs font-semibold">Update Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
