import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { 
  RxPlus, RxPencil1, RxTrash, RxCross1, RxCheck, RxCrossCircled, RxLayers, RxPerson 
} from 'react-icons/rx';

export const Projects = () => {
  const { user: currentUser } = useAuth();
  
  // List State
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals & Drawers State
  const [selectedProj, setSelectedProj] = useState(null); // Detailed project drawer
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [projToEdit, setProjToEdit] = useState(null);

  // Membership assignment search state
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [matchingEmployees, setMatchingEmployees] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Forms
  const { register: regCreate, handleSubmit: handleCreateSubmit, reset: resetCreate, formState: { errors: errorsCreate } } = useForm();
  const { register: regEdit, handleSubmit: handleEditSubmit, reset: resetEdit, formState: { errors: errorsEdit } } = useForm();

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/projects', {
        params: {
          search: search || undefined,
          status: selectedStatus || undefined
        }
      });
      setProjects(res.data);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [selectedStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProjects();
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedStatus('');
    fetchProjects();
  };

  // CRUD handlers
  const onCreateProject = async (data) => {
    try {
      await api.post('/api/projects', data);
      setIsCreateOpen(false);
      resetCreate();
      fetchProjects();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create project');
    }
  };

  const onEditProject = async (data) => {
    try {
      await api.put(`/api/projects/${projToEdit.id}`, data);
      setIsEditOpen(false);
      setProjToEdit(null);
      resetEdit();
      fetchProjects();
      if (selectedProj && selectedProj.id === projToEdit.id) {
        const updated = await api.get(`/api/projects/${projToEdit.id}`);
        setSelectedProj(updated.data);
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update project');
    }
  };

  const onDeleteProject = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project? This will remove all project members.')) return;
    try {
      await api.delete(`/api/projects/${id}`);
      setSelectedProj(null);
      fetchProjects();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete project');
    }
  };

  // Project membership management
  const handleFindEmployees = async (e) => {
    e.preventDefault();
    if (!memberSearchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const res = await api.get('/api/employees', {
        params: { search: memberSearchQuery, size: 5 }
      });
      setMatchingEmployees(res.data.items);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAssignMember = async (empId) => {
    if (!selectedProj) return;
    try {
      await api.post(`/api/projects/${selectedProj.id}/assign`, { employee_id: empId });
      setMemberSearchQuery('');
      setMatchingEmployees([]);
      // Refresh drawer
      const res = await api.get(`/api/projects/${selectedProj.id}`);
      setSelectedProj(res.data);
      fetchProjects();
    } catch (err) {
      alert(err.response?.data?.detail || 'Assignment failed');
    }
  };

  const handleRemoveMember = async (empId) => {
    if (!selectedProj) return;
    if (!window.confirm('Remove this employee from the project team?')) return;
    try {
      await api.post(`/api/projects/${selectedProj.id}/remove/${empId}`);
      // Refresh drawer
      const res = await api.get(`/api/projects/${selectedProj.id}`);
      setSelectedProj(res.data);
      fetchProjects();
    } catch (err) {
      alert(err.response?.data?.detail || 'Removal failed');
    }
  };

  const handleOpenEdit = (proj) => {
    setProjToEdit(proj);
    setIsEditOpen(true);
    setTimeout(() => {
      resetEdit({
        name: proj.name,
        code: proj.code,
        description: proj.description || '',
        capacity: proj.capacity,
        start_date: proj.start_date,
        end_date: proj.end_date || '',
        status: proj.status
      });
    }, 50);
  };

  return (
    <div className="space-y-6 relative min-h-[calc(100vh-10rem)]">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/50 p-4 border border-slate-850 rounded-xl">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full sm:max-w-md">
          <input
            type="text"
            placeholder="Search project name or code..."
            className="form-input text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn-primary text-sm font-semibold whitespace-nowrap">
            Search
          </button>
        </form>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Status filter */}
          <select 
            value={selectedStatus} 
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="form-input text-xs max-w-[150px] py-1.5"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="Proposed">Proposed</option>
          </select>

          {/* Clear Filter */}
          {(search || selectedStatus) && (
            <button 
              onClick={handleClearFilters}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              Clear
            </button>
          )}

          {/* Create Button (Admin/PM only) */}
          {['Admin', 'Project Manager'].includes(currentUser?.role) && (
            <button 
              onClick={() => setIsCreateOpen(true)}
              className="btn-primary text-xs flex items-center gap-1.5 py-1.5 ml-auto sm:ml-0"
            >
              <RxPlus className="h-4 w-4" />
              New Project
            </button>
          )}
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="p-12 flex justify-center items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent border-primary-500"></div>
        </div>
      ) : projects.length === 0 ? (
        <div className="p-12 text-center text-slate-500 font-medium">
          No projects found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj) => {
            const occupancyRate = proj.capacity > 0 ? (proj.current_occupancy / proj.capacity) * 100 : 0;
            return (
              <div 
                key={proj.id} 
                className="glass-panel p-5 rounded-xl border border-slate-800 space-y-4 hover:border-primary-500/20 cursor-pointer transition-all duration-300"
                onClick={async () => {
                  const detailed = await api.get(`/api/projects/${proj.id}`);
                  setSelectedProj(detailed.data);
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-white text-base truncate">{proj.name}</h3>
                    <span className="font-mono text-xs text-slate-500 mt-1 block">{proj.code}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${
                    proj.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    proj.status === 'Completed' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {proj.status}
                  </span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 h-8 leading-relaxed">
                  {proj.description || 'No description provided.'}
                </p>

                {/* Capacity gauge */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-medium">
                    <span className="text-slate-400">Team Occupancy</span>
                    <span className="text-slate-300">{proj.current_occupancy} / {proj.capacity} members</span>
                  </div>
                  <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${occupancyRate >= 90 ? 'bg-rose-500' : 'bg-primary-500'}`}
                      style={{ width: `${Math.min(occupancyRate, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                  <span>Start: {new Date(proj.start_date).toLocaleDateString()}</span>
                  <span>End: {proj.end_date ? new Date(proj.end_date).toLocaleDateString() : 'Ongoing'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Project Drawer */}
      {selectedProj && (
        <div className="fixed inset-y-0 right-0 z-30 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between animate-slide-left select-none">
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 shrink-0">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Project Workspace Mapping</h3>
              <button onClick={() => { setSelectedProj(null); setMatchingEmployees([]); setMemberSearchQuery(''); }} className="text-slate-400 hover:text-white">
                <RxCross1 className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable details */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-white text-lg leading-tight">{selectedProj.name}</h4>
                  <span className="badge-available uppercase text-[10px]">{selectedProj.status}</span>
                </div>
                <p className="font-mono text-xs text-primary-400">{selectedProj.code}</p>
                <p className="text-xs text-slate-400 leading-relaxed pt-1">{selectedProj.description}</p>
              </div>

              {/* Occupancy stats */}
              <div className="grid grid-cols-2 gap-4 bg-slate-850 p-4 border border-slate-800 rounded-xl text-center">
                <div>
                  <span className="block text-[10px] text-slate-500 font-semibold uppercase mb-0.5">Assigned staff</span>
                  <span className="text-xl font-bold text-white">{selectedProj.current_occupancy}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 font-semibold uppercase mb-0.5">Limit capacity</span>
                  <span className="text-xl font-bold text-white">{selectedProj.capacity}</span>
                </div>
              </div>

              {/* Members listing */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Project Team Members</span>
                  <span className="text-[10px] text-slate-500 font-medium">Count: {selectedProj.members.length}</span>
                </div>

                {selectedProj.members.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">No team members assigned to this project.</p>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {selectedProj.members.map((m) => (
                      <div key={m.employee_id} className="flex justify-between items-center bg-slate-950 p-2.5 border border-slate-850 rounded-lg hover:border-slate-800 transition-colors">
                        <div className="min-w-0">
                          <span className="block font-medium text-white text-xs truncate">{m.name}</span>
                          <span className="block text-[10px] text-slate-400 truncate">{m.designation} ({m.emp_code})</span>
                        </div>
                        {['Admin', 'Project Manager', 'HR'].includes(currentUser?.role) && (
                          <button 
                            onClick={() => handleRemoveMember(m.employee_id)}
                            className="p-1 hover:bg-slate-900 text-slate-500 hover:text-rose-400 rounded transition-colors"
                            title="Remove from project"
                          >
                            <RxCrossCircled className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add member widget (Admin/PM/HR only) */}
              {['Admin', 'Project Manager', 'HR'].includes(currentUser?.role) && (
                <div className="border-t border-slate-800 pt-4 space-y-3">
                  <span className="block text-xs text-slate-400 font-semibold uppercase tracking-wide">Add Team Member</span>
                  <form onSubmit={handleFindEmployees} className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Search employee name/code..." 
                      className="form-input text-xs py-1.5"
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                    />
                    <button type="submit" className="btn-secondary text-xs py-1.5 whitespace-nowrap">Find</button>
                  </form>

                  {/* Matching results */}
                  {searchLoading ? (
                    <div className="h-6 flex items-center justify-center">
                      <div className="h-3 w-3 animate-spin rounded-full border border-t-transparent border-primary-500"></div>
                    </div>
                  ) : matchingEmployees.length > 0 ? (
                    <div className="bg-slate-950 border border-slate-850 rounded-lg divide-y divide-slate-850 overflow-hidden">
                      {matchingEmployees.map(emp => (
                        <div key={emp.id} className="flex justify-between items-center p-2 text-xs hover:bg-slate-900/60">
                          <div className="min-w-0">
                            <p className="font-semibold text-white truncate">{emp.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{emp.designation} ({emp.employee_id})</p>
                          </div>
                          <button
                            onClick={() => handleAssignMember(emp.id)}
                            className="px-2 py-1 bg-primary-600 hover:bg-primary-500 text-white rounded text-[10px] font-semibold"
                          >
                            Assign
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : memberSearchQuery && (
                    <p className="text-[11px] text-slate-500 italic">No matching active employees found.</p>
                  )}
                </div>
              )}
            </div>

            {/* Footer options */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex gap-2 shrink-0">
              {['Admin', 'Project Manager'].includes(currentUser?.role) && (
                <button 
                  onClick={() => handleOpenEdit(selectedProj)}
                  className="btn-secondary text-sm flex-1 font-semibold flex items-center justify-center gap-1.5"
                >
                  <RxPencil1 />
                  Edit Project
                </button>
              )}
              {currentUser?.role === 'Admin' && (
                <button 
                  onClick={() => onDeleteProject(selectedProj.id)}
                  className="btn-danger text-sm font-semibold px-4 flex items-center justify-center"
                >
                  <RxTrash />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm select-none">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 m-4 max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-lg font-bold text-white">Create New Project</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">
                <RxCross1 className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit(onCreateProject)} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Project Name*</label>
                <input type="text" placeholder="Alpha Platform Revamp" className="form-input text-xs" {...errorsCreate.name} {...regCreate('name', { required: true })} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Project Code*</label>
                <input type="text" placeholder="PRJ-999" className="form-input text-xs" {...errorsCreate.code} {...regCreate('code', { required: true })} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Description</label>
                <textarea rows="3" placeholder="Explain the project goal and scope..." className="form-input text-xs" {...regCreate('description')}></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Capacity Limit*</label>
                  <input type="number" placeholder="50" className="form-input text-xs" {...errorsCreate.capacity} {...regCreate('capacity', { required: true, valueAsNumber: true })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Project Status*</label>
                  <select className="form-input text-xs" {...regCreate('status', { required: true })}>
                    <option value="Active">Active</option>
                    <option value="Proposed">Proposed</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Start Date*</label>
                  <input type="date" className="form-input text-xs" {...errorsCreate.start_date} {...regCreate('start_date', { required: true })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">End Date</label>
                  <input type="date" className="form-input text-xs" {...regCreate('end_date')} />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="btn-secondary text-xs">Cancel</button>
                <button type="submit" className="btn-primary text-xs font-semibold">Save Project</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm select-none">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 m-4 max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-lg font-bold text-white">Edit Project Details</h3>
              <button onClick={() => { setIsEditOpen(false); setProjToEdit(null); }} className="text-slate-400 hover:text-white">
                <RxCross1 className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit(onEditProject)} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Project Name*</label>
                <input type="text" className="form-input text-xs" {...errorsEdit.name} {...regEdit('name', { required: true })} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Project Code*</label>
                <input type="text" className="form-input text-xs" {...errorsEdit.code} {...regEdit('code', { required: true })} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Description</label>
                <textarea rows="3" className="form-input text-xs" {...regEdit('description')}></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Capacity Limit*</label>
                  <input type="number" className="form-input text-xs" {...errorsEdit.capacity} {...regEdit('capacity', { required: true, valueAsNumber: true })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Project Status*</label>
                  <select className="form-input text-xs" {...regEdit('status', { required: true })}>
                    <option value="Active">Active</option>
                    <option value="Proposed">Proposed</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Start Date*</label>
                  <input type="date" className="form-input text-xs" {...errorsEdit.start_date} {...regEdit('start_date', { required: true })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">End Date</label>
                  <input type="date" className="form-input text-xs" {...regEdit('end_date')} />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => { setIsEditOpen(false); setProjToEdit(null); }} className="btn-secondary text-xs">Cancel</button>
                <button type="submit" className="btn-primary text-xs font-semibold">Update Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
