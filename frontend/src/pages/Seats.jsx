import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { 
  RxPlus, RxCross1, RxCheck, RxGrid, RxListBullet, RxTrash, RxClock, RxExclamationTriangle, RxPerson, RxCrossCircled 
} from 'react-icons/rx';

export const Seats = () => {
  const { user: currentUser } = useAuth();
  
  // View mode toggling: 'map' or 'list'
  const [viewMode, setViewMode] = useState('map');
  
  // Metadata drop downs
  const [metadata, setMetadata] = useState({ buildings: [], floors: [], zones: [] });
  const [selectedBld, setSelectedBld] = useState('All');
  const [selectedFlr, setSelectedFlr] = useState('All');
  const [selectedZn, setSelectedZn] = useState('All');

  // Map Seats Data
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);

  // List View Seats (all seats)
  const [allSeats, setAllSeats] = useState([]);
  const [listSearch, setListSearch] = useState('');
  const [listLoading, setListLoading] = useState(false);

  // Selected Seat details modal
  const [activeSeatDetails, setActiveSeatDetails] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Allocate form states
  const [empSearchQuery, setEmpSearchQuery] = useState('');
  const [matchingEmployees, setMatchingEmployees] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // CRUD new seat states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { register: regCreate, handleSubmit: handleCreateSubmit, reset: resetCreate, formState: { errors: errorsCreate } } = useForm();

  // Load layout metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await api.get('/api/seats/layout-metadata');
        setMetadata(res.data);
      } catch (err) {
        console.error('Failed to load layout metadata', err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch seats for interactive map
  const fetchMapSeats = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedBld && selectedBld !== 'All') params.building = selectedBld;
      if (selectedFlr && selectedFlr !== 'All') params.floor = selectedFlr;
      if (selectedZn && selectedZn !== 'All') params.zone = selectedZn;
      
      const res = await api.get('/api/seats', { params });
      setSeats(res.data);
    } catch (err) {
      console.error('Failed to load seats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapSeats();
  }, [selectedBld, selectedFlr, selectedZn]);

  // Fetch all seats for table list mode
  const fetchAllSeats = async () => {
    setListLoading(true);
    try {
      const res = await api.get('/api/seats', { params: { search: listSearch || undefined } });
      setAllSeats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'list') {
      fetchAllSeats();
    }
  }, [viewMode, listSearch]);

  const handleSeatClick = async (seat) => {
    try {
      const res = await api.get(`/api/seats/${seat.id}`);
      setActiveSeatDetails(res.data);
      setEmpSearchQuery('');
      setMatchingEmployees([]);
    } catch (err) {
      console.error('Failed to load seat details', err);
    }
  };

  const handleLoadHistory = async (seatId) => {
    setHistoryLoading(true);
    setIsHistoryOpen(true);
    try {
      const res = await api.get(`/api/seats/${seatId}/history`);
      setHistoryLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Seat Allocation CRUD & Actions
  const handleFindEmployees = async (e) => {
    e.preventDefault();
    if (!empSearchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const res = await api.get('/api/employees', { params: { search: empSearchQuery, size: 5 } });
      setMatchingEmployees(res.data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAllocateSeat = async (empId) => {
    if (!activeSeatDetails) return;
    try {
      await api.post(`/api/seats/${activeSeatDetails.id}/allocate`, { employee_id: empId });
      alert(`Seat ${activeSeatDetails.seat_number} allocated successfully.`);
      
      // Reload seat details & maps
      const res = await api.get(`/api/seats/${activeSeatDetails.id}`);
      setActiveSeatDetails(res.data);
      fetchMapSeats();
      if (viewMode === 'list') fetchAllSeats();
      setEmpSearchQuery('');
      setMatchingEmployees([]);
    } catch (err) {
      alert(err.response?.data?.detail || 'Allocation failed');
    }
  };

  const handleReleaseSeat = async () => {
    if (!activeSeatDetails) return;
    if (!window.confirm(`Release seat ${activeSeatDetails.seat_number}?`)) return;
    try {
      await api.post(`/api/seats/${activeSeatDetails.id}/release`);
      alert(`Seat ${activeSeatDetails.seat_number} is now vacant.`);
      
      // Reload
      const res = await api.get(`/api/seats/${activeSeatDetails.id}`);
      setActiveSeatDetails(res.data);
      fetchMapSeats();
      if (viewMode === 'list') fetchAllSeats();
    } catch (err) {
      alert(err.response?.data?.detail || 'Release failed');
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!activeSeatDetails) return;
    try {
      await api.put(`/api/seats/${activeSeatDetails.id}`, { status: newStatus });
      
      // Reload
      const res = await api.get(`/api/seats/${activeSeatDetails.id}`);
      setActiveSeatDetails(res.data);
      fetchMapSeats();
      if (viewMode === 'list') fetchAllSeats();
    } catch (err) {
      alert(err.response?.data?.detail || 'Status update failed');
    }
  };

  const handleCreateSeat = async (data) => {
    try {
      await api.post('/api/seats', data);
      setIsCreateOpen(false);
      resetCreate();
      // Refresh metadata & layout
      const meta = await api.get('/api/seats/layout-metadata');
      setMetadata(meta.data);
      fetchMapSeats();
      if (viewMode === 'list') fetchAllSeats();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create seat');
    }
  };

  const handleDeleteSeat = async (id) => {
    if (!window.confirm('Delete this seat from organization database?')) return;
    try {
      await api.delete(`/api/seats/${id}`);
      setActiveSeatDetails(null);
      fetchMapSeats();
      if (viewMode === 'list') fetchAllSeats();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete seat');
    }
  };

  return (
    <div className="space-y-6 relative min-h-[calc(100vh-10rem)]">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/50 p-4 border border-slate-855 rounded-xl">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setViewMode('map')}
            className={`btn-secondary text-xs flex items-center gap-1.5 py-1.5 ${viewMode === 'map' ? 'bg-primary-500/10 text-primary-400 border-primary-500/20' : ''}`}
          >
            <RxGrid className="h-4 w-4" />
            Interactive Map
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`btn-secondary text-xs flex items-center gap-1.5 py-1.5 ${viewMode === 'list' ? 'bg-primary-500/10 text-primary-400 border-primary-500/20' : ''}`}
          >
            <RxListBullet className="h-4 w-4" />
            Seats Inventory List
          </button>
        </div>

        {viewMode === 'map' ? (
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Building Selection */}
            <select 
              value={selectedBld} 
              onChange={(e) => setSelectedBld(e.target.value)}
              className="form-input text-xs py-1.5 max-w-[140px]"
            >
              <option value="All">All Buildings</option>
              {metadata.buildings.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            {/* Floor Selection */}
            <select 
              value={selectedFlr} 
              onChange={(e) => setSelectedFlr(e.target.value)}
              className="form-input text-xs py-1.5 max-w-[120px]"
            >
              <option value="All">All Floors</option>
              {metadata.floors.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>

            {/* Zone Selection */}
            <select 
              value={selectedZn} 
              onChange={(e) => setSelectedZn(e.target.value)}
              className="form-input text-xs py-1.5 max-w-[110px]"
            >
              <option value="All">All Zones</option>
              {metadata.zones.map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>

            {/* Admin Add Seat */}
            {currentUser?.role === 'Admin' && (
              <button 
                onClick={() => setIsCreateOpen(true)}
                className="btn-primary text-xs flex items-center gap-1.5 py-1.5 ml-auto sm:ml-0"
              >
                <RxPlus className="h-4 w-4" />
                Add Seat
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <input 
              type="text" 
              placeholder="Search seat number, building..." 
              className="form-input text-xs py-1.5 max-w-xs"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
            />
            {currentUser?.role === 'Admin' && (
              <button 
                onClick={() => setIsCreateOpen(true)}
                className="btn-primary text-xs flex items-center gap-1.5 py-1.5"
              >
                <RxPlus className="h-4 w-4" />
                Add Seat
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Main content display */}
      {viewMode === 'map' ? (
        <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-6">
          <div className="flex justify-between items-center pb-3 border-b border-slate-850">
            <div className="text-xs text-slate-400 space-y-1">
              <span className="font-semibold text-white">Layout Legend:</span>
              <div className="flex flex-wrap gap-4 pt-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-emerald-500"></span>
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-teal-500"></span>
                  <span>Occupied</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-amber-500"></span>
                  <span>Reserved</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-rose-500"></span>
                  <span>Maintenance</span>
                </div>
              </div>
            </div>
            <span className="text-xs text-primary-400 font-semibold">{seats.length} total Desks</span>
          </div>

          {loading ? (
            <div className="p-12 flex justify-center items-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent border-primary-500"></div>
            </div>
          ) : seats.length === 0 ? (
            <div className="p-12 text-center text-slate-500 italic text-sm">
              No desks configured.
            </div>
          ) : (selectedBld === 'All' || selectedFlr === 'All' || selectedZn === 'All') ? (
            // Render Global Heatmap Visualizer
            <div className="space-y-6 pt-4 max-h-[calc(100vh-20rem)] overflow-y-auto pr-2">
              {(() => {
                const grouped = {};
                seats.forEach(seat => {
                  const b = seat.building || 'Unknown Building';
                  const f = seat.floor || 'Unknown Floor';
                  const z = seat.zone || 'Unknown Zone';
                  if (!grouped[b]) grouped[b] = {};
                  if (!grouped[b][f]) grouped[b][f] = {};
                  if (!grouped[b][f][z]) grouped[b][f][z] = [];
                  grouped[b][f][z].push(seat);
                });

                return Object.keys(grouped).sort().map(bldName => (
                  <div key={bldName} className="bg-slate-900/40 p-5 rounded-xl border border-slate-800 space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                      <h3 className="text-sm font-bold text-primary-400 uppercase tracking-wider">{bldName}</h3>
                      <span className="text-[10px] text-slate-500 font-normal">
                        {Object.keys(grouped[bldName]).reduce((acc, f) => acc + Object.keys(grouped[bldName][f]).reduce((acc2, z) => acc2 + grouped[bldName][f][z].length, 0), 0)} desks
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      {Object.keys(grouped[bldName]).sort().map(flrName => (
                        <div key={flrName} className="flex flex-col xl:flex-row xl:items-start gap-4 p-3.5 bg-slate-950/40 rounded-lg border border-slate-900/50">
                          <span className="text-xs font-bold text-slate-400 w-24 shrink-0 pt-1">{flrName}</span>
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                            {Object.keys(grouped[bldName][flrName]).sort().map(znName => {
                              const sortedSeats = [...grouped[bldName][flrName][znName]].sort((a, b) => a.seat_number.localeCompare(b.seat_number));
                              return (
                                <div key={znName} className="space-y-2">
                                  <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{znName}</span>
                                    <span className="text-[9px] text-slate-600 font-medium">{sortedSeats.length} desks</span>
                                  </div>
                                  <div className="grid grid-cols-10 gap-1.5 p-2 bg-slate-900/60 border border-slate-850 rounded-lg">
                                    {sortedSeats.map(seat => (
                                      <button
                                        key={seat.id}
                                        onClick={() => handleSeatClick(seat)}
                                        className={`h-2.5 w-2.5 rounded-sm hover:scale-125 hover:ring-1 hover:ring-white transition-all cursor-pointer ${
                                          seat.status === 'Available' ? 'bg-emerald-500' :
                                          seat.status === 'Occupied' ? 'bg-teal-500' :
                                          seat.status === 'Reserved' ? 'bg-amber-500' : 'bg-rose-500'
                                        } ${activeSeatDetails?.id === seat.id ? 'ring-1 ring-primary-400 scale-125' : ''}`}
                                        title={`${seat.seat_number} (${seat.status}) ${seat.assigned_employee_name ? `- Occupant: ${seat.assigned_employee_name}` : ''}`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          ) : (
            // Original zoomed-in floor layout view
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3.5 pt-4">
              {seats.map((seat) => {
                const colorClass = 
                  seat.status === 'Available' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' :
                  seat.status === 'Occupied' ? 'bg-teal-500/10 text-teal-400 border-teal-500/30 hover:bg-teal-500/20' :
                  seat.status === 'Reserved' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20' :
                  'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20';

                return (
                  <div 
                    key={seat.id}
                    onClick={() => handleSeatClick(seat)}
                    className={`h-11 border rounded-lg flex items-center justify-center font-mono font-bold text-xs cursor-pointer select-none transition-all duration-200 ${colorClass}`}
                    title={`Seat: ${seat.seat_number} (${seat.status}) ${seat.assigned_employee_name ? `- Occupant: ${seat.assigned_employee_name}` : ''}`}
                  >
                    {seat.seat_number.split('-').pop()}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        // List table view of seats
        <div className="glass-panel rounded-xl overflow-hidden">
          {listLoading ? (
            <div className="p-12 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent border-primary-500"></div>
            </div>
          ) : allSeats.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No seats found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase bg-slate-900/30">
                    <th className="py-3 px-4 w-12 text-slate-500">Seq</th>
                    <th className="py-3 px-4">Seat Number</th>
                    <th className="py-3 px-4">Building</th>
                    <th className="py-3 px-4">Floor</th>
                    <th className="py-3 px-4">Zone</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Occupant</th>
                    <th className="py-3 px-4 w-20 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {allSeats.map((seat, index) => (
                    <tr 
                      key={seat.id} 
                      className="hover:bg-slate-900/30 cursor-pointer transition-colors"
                      onClick={() => handleSeatClick(seat)}
                    >
                      <td className="py-3 px-4 font-mono text-slate-500">{index + 1}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-white">{seat.seat_number}</td>
                      <td className="py-3 px-4 text-slate-300">{seat.building}</td>
                      <td className="py-3 px-4 text-slate-300">{seat.floor}</td>
                      <td className="py-3 px-4 text-slate-300">{seat.zone}</td>
                      <td className="py-3 px-4">
                        <span className={
                          seat.status === 'Available' ? 'badge-available' :
                          seat.status === 'Occupied' ? 'badge-occupied' :
                          seat.status === 'Reserved' ? 'badge-reserved' : 'badge-maintenance'
                        }>
                          {seat.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {seat.assigned_employee_name ? (
                          <div className="flex items-center gap-1.5">
                            <RxPerson className="text-slate-500" />
                            <span className="text-white font-medium">{seat.assigned_employee_name}</span>
                            <span className="text-[10px] text-slate-500">({seat.assigned_employee_code})</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600 italic">Vacant</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteSeat(seat.id); }}
                          className="text-rose-450 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                          title="Delete Seat"
                        >
                          <RxTrash className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. Seat Control Side Drawer */}
      {activeSeatDetails && (
        <div className="fixed inset-y-0 right-0 z-30 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between animate-slide-left select-none">
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 shrink-0">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Desk Space Control Panel</h3>
              <button onClick={() => { setActiveSeatDetails(null); setMatchingEmployees([]); setEmpSearchQuery(''); }} className="text-slate-400 hover:text-white">
                <RxCross1 className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable details */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Seat Details Header */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-white text-lg tracking-tight font-mono">{activeSeatDetails.seat_number}</h4>
                  <span className={
                    activeSeatDetails.status === 'Available' ? 'badge-available' :
                    activeSeatDetails.status === 'Occupied' ? 'badge-occupied' :
                    activeSeatDetails.status === 'Reserved' ? 'badge-reserved' : 'badge-maintenance'
                  }>
                    {activeSeatDetails.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{activeSeatDetails.building}, {activeSeatDetails.floor}, {activeSeatDetails.zone}</p>
              </div>

              {/* Occupant card */}
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <span className="block text-xs text-slate-400 font-semibold uppercase tracking-wide">Occupant Status</span>
                
                {activeSeatDetails.status === 'Occupied' ? (
                  <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-sm text-primary-400 uppercase">
                        {activeSeatDetails.assigned_employee_name?.slice(0, 2)}
                      </div>
                      <div>
                        <span className="block text-xs text-slate-400 font-medium">Assigned Employee</span>
                        <span className="block font-bold text-white text-sm">{activeSeatDetails.assigned_employee_name}</span>
                        <span className="block text-[10px] text-slate-500 font-mono mt-0.5">{activeSeatDetails.assigned_employee_code}</span>
                      </div>
                    </div>

                    {['Admin', 'HR'].includes(currentUser?.role) && (
                      <button 
                        onClick={handleReleaseSeat}
                        className="w-full btn-secondary text-xs text-rose-400 border-rose-500/10 bg-rose-500/5 hover:bg-rose-500 hover:text-white transition-all font-semibold flex items-center justify-center gap-1.5"
                      >
                        <RxCrossCircled />
                        Release Assigned Desk
                      </button>
                    )}
                  </div>
                ) : activeSeatDetails.status === 'Available' ? (
                  // Desk vacant. If Admin/HR: allocation autocomplete tool
                  ['Admin', 'HR'].includes(currentUser?.role) ? (
                    <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl space-y-3">
                      <p className="text-xs text-slate-500 italic text-center">This desk is vacant. Search employee to assign.</p>
                      
                      <form onSubmit={handleFindEmployees} className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Employee name or code..."
                          className="form-input text-xs py-1.5"
                          value={empSearchQuery}
                          onChange={(e) => setEmpSearchQuery(e.target.value)}
                        />
                        <button type="submit" className="btn-secondary text-xs py-1.5">Find</button>
                      </form>

                      {/* Display search results */}
                      {searchLoading ? (
                        <div className="h-6 flex items-center justify-center">
                          <div className="h-3 w-3 animate-spin rounded-full border border-t-transparent border-primary-500"></div>
                        </div>
                      ) : matchingEmployees.length > 0 ? (
                        <div className="bg-slate-900 border border-slate-800 rounded-lg divide-y divide-slate-850 overflow-hidden">
                          {matchingEmployees.map(emp => (
                            <div key={emp.id} className="flex justify-between items-center p-2 text-xs">
                              <div className="min-w-0">
                                <p className="font-semibold text-white truncate">{emp.name}</p>
                                <p className="text-[10px] text-slate-500 truncate">{emp.designation} ({emp.employee_id})</p>
                              </div>
                              <button
                                onClick={() => handleAllocateSeat(emp.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-semibold"
                              >
                                Allocate
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : empSearchQuery && (
                        <p className="text-[11px] text-slate-500 italic text-center">No active employees found.</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic bg-slate-950 p-3 rounded-lg border border-slate-850">
                      Desk is vacant. No active occupant assigned.
                    </p>
                  )
                ) : (
                  // Reserved or maintenance
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-center space-y-1">
                    <RxExclamationTriangle className="h-5 w-5 text-amber-500 mx-auto" />
                    <p className="text-xs text-slate-400">Desk status set to {activeSeatDetails.status}. Allocation blocked.</p>
                  </div>
                )}
              </div>

              {/* Status configuration (Admin/HR only) */}
              {['Admin', 'HR'].includes(currentUser?.role) && (
                <div className="border-t border-slate-800 pt-4 space-y-3">
                  <span className="block text-xs text-slate-400 font-semibold uppercase tracking-wide">Configure Desk Status</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => handleUpdateStatus('Available')}
                      disabled={activeSeatDetails.status === 'Available' || activeSeatDetails.status === 'Occupied'}
                      className="btn-secondary text-[11px] py-1 px-1 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      Available
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus('Reserved')}
                      disabled={activeSeatDetails.status === 'Reserved' || activeSeatDetails.status === 'Occupied'}
                      className="btn-secondary text-[11px] py-1 px-1 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      Reserved
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus('Maintenance')}
                      disabled={activeSeatDetails.status === 'Maintenance' || activeSeatDetails.status === 'Occupied'}
                      className="btn-secondary text-[11px] py-1 px-1 disabled:opacity-30 disabled:pointer-events-none"
                    >
                      Maintenance
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Logs shortcut & Delete */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex gap-2 shrink-0">
              <button 
                onClick={() => handleLoadHistory(activeSeatDetails.id)}
                className="btn-secondary text-sm flex-1 font-semibold flex items-center justify-center gap-1.5"
              >
                <RxClock />
                Allocation Logs
              </button>
              <button 
                onClick={() => handleDeleteSeat(activeSeatDetails.id)}
                className="btn-danger text-sm font-semibold px-4 flex items-center justify-center"
                title="Delete Seat"
              >
                <RxTrash />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Allocation History Logs Modal */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm select-none">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 m-4 max-h-[80vh] flex flex-col justify-between animate-slide-up">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4 shrink-0">
              <h3 className="text-lg font-bold text-white">Desk Assignment History Logs</h3>
              <button onClick={() => { setIsHistoryOpen(false); setHistoryLogs([]); }} className="text-slate-400 hover:text-white">
                <RxCross1 className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {historyLoading ? (
                <div className="p-12 flex justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border border-t-transparent border-primary-500"></div>
                </div>
              ) : historyLogs.length === 0 ? (
                <p className="text-slate-500 italic text-sm text-center py-12">No previous allocation records found for this desk.</p>
              ) : (
                <div className="space-y-4">
                  {historyLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-slate-950 border border-slate-850 rounded-lg space-y-1.5">
                      <div className="flex justify-between items-start text-xs">
                        <span className="font-semibold text-white">{log.employee_name} ({log.employee_code})</span>
                        <span className={`px-2 py-0.5 rounded-[3px] text-[10px] font-bold ${log.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                          {log.is_active ? 'Current' : 'Archived'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex flex-col gap-0.5">
                        <span>Assigned: {new Date(log.allocated_at).toLocaleString()}</span>
                        {log.released_at && <span>Released: {new Date(log.released_at).toLocaleString()}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="pt-4 border-t border-slate-800 text-right shrink-0 mt-4">
              <button onClick={() => setIsHistoryOpen(false)} className="btn-secondary text-xs">Close Logs</button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Create Seat Modal (Admin only) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm select-none">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 m-4 animate-slide-up">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white">Create Office Desk</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">
                <RxCross1 className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit(handleCreateSeat)} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Building*</label>
                <select className="form-input text-xs" {...regCreate('building', { required: true })}>
                  <option value="HQ Tower">HQ Tower</option>
                  <option value="Innovation Lab">Innovation Lab</option>
                  <option value="Nexus Centre">Nexus Centre</option>
                  <option value="Apex Plaza">Apex Plaza</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Floor*</label>
                <select className="form-input text-xs" {...regCreate('floor', { required: true })}>
                  <option value="Floor 1">Floor 1</option>
                  <option value="Floor 2">Floor 2</option>
                  <option value="Floor 3">Floor 3</option>
                  <option value="Floor 4">Floor 4</option>
                  <option value="Floor 5">Floor 5</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Zone*</label>
                <select className="form-input text-xs" {...regCreate('zone', { required: true })}>
                  <option value="Zone A">Zone A</option>
                  <option value="Zone B">Zone B</option>
                  <option value="Zone C">Zone C</option>
                  <option value="Zone D">Zone D</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Seat Number*</label>
                <input type="text" placeholder="e.g. H-1-A-99" className="form-input text-xs" {...errorsCreate.seat_number} {...regCreate('seat_number', { required: true })} />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="btn-secondary text-xs">Cancel</button>
                <button type="submit" className="btn-primary text-xs font-semibold">Save Desk</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
