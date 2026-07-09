import React, { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  RxDashboard, RxPerson, RxLayers, RxGrid, RxChatBubble, RxExit, RxHamburgerMenu, RxCross1, RxMagnifyingGlass 
} from 'react-icons/rx';

export const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: RxDashboard, roles: ['Admin', 'HR', 'Employee', 'Project Manager'] },
    { name: 'Employees', path: '/employees', icon: RxPerson, roles: ['Admin', 'HR', 'Project Manager'] },
    { name: 'Projects', path: '/projects', icon: RxLayers, roles: ['Admin', 'HR', 'Project Manager', 'Employee'] },
    { name: 'Seat Map', path: '/seats', icon: RxGrid, roles: ['Admin', 'HR', 'Project Manager', 'Employee'] },
    { name: 'AI Assistant', path: '/assistant', icon: RxChatBubble, roles: ['Admin', 'HR', 'Project Manager', 'Employee'] },
  ];

  // Get matching menu items for current user role
  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user?.role));

  const getPageTitle = () => {
    const currentPath = location.pathname;
    if (currentPath === '/') return 'Dashboard Overview';
    const item = menuItems.find(m => m.path === currentPath);
    return item ? item.name : 'System Settings';
  };

  const handleGlobalSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchOpen(false);
    navigate(`/employees?search=${encodeURIComponent(searchQuery)}`);
    setSearchQuery('');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950">
      {/* 1. Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 shrink-0 select-none">
        {/* Brand Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-primary-600 to-teal-400 flex items-center justify-center text-white font-bold text-lg group-hover:scale-105 transition-transform">
              E
            </div>
            <span className="font-bold text-xl tracking-tight text-white group-hover:text-primary-400 transition-colors">Ethara</span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
          {filteredMenuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive 
                    ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Footer User Widget */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-850">
            <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-semibold text-primary-400 uppercase">
              {user?.name?.slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">{user?.role}</p>
            </div>
            <button 
              onClick={logout}
              className="text-slate-400 hover:text-rose-400 p-1.5 rounded-md hover:bg-slate-800 transition-colors"
              title="Logout"
            >
              <RxExit className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex bg-slate-950/60 backdrop-blur-sm">
          <div className="relative flex flex-col w-64 bg-slate-900 border-r border-slate-800 animate-slide-right">
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
              <span className="font-bold text-xl text-white">Ethara</span>
              <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                <RxCross1 className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
              {filteredMenuItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => 
                    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      isActive 
                        ? 'bg-primary-500/10 text-primary-400' 
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    }`
                  }
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </NavLink>
              ))}
            </nav>
            <div className="p-4 border-t border-slate-800">
              <button 
                onClick={() => { setMobileMenuOpen(false); logout(); }}
                className="w-full flex items-center justify-center gap-2 p-2.5 bg-rose-600/10 text-rose-400 rounded-lg font-medium border border-rose-500/20 hover:bg-rose-600 hover:text-white transition-all"
              >
                <RxExit className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Frame */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 bg-slate-900/60 border-b border-slate-850 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden text-slate-400 hover:text-white p-1 rounded-md"
            >
              <RxHamburgerMenu className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-semibold text-white tracking-tight hidden sm:block">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Global Search Button */}
            <button 
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg text-sm transition-all focus:outline-none focus:ring-1 focus:ring-primary-500/30"
            >
              <RxMagnifyingGlass className="h-4 w-4" />
              <span className="hidden sm:inline">Search employee or seat...</span>
              <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] bg-slate-800 text-slate-500 rounded border border-slate-700">Ctrl K</kbd>
            </button>

            {/* Profile Nav */}
            <Link to="/profile" className="flex items-center gap-2 group">
              <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-primary-400 group-hover:border-primary-500 transition-colors uppercase">
                {user?.name?.slice(0, 2)}
              </div>
              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors hidden md:block">
                {user?.name}
              </span>
            </Link>
          </div>
        </header>

        {/* Global Search Modal */}
        {searchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-slate-950/70 backdrop-blur-sm" onClick={() => setSearchOpen(false)}>
            <div 
              className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-4 m-4 animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleGlobalSearch} className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Search globally (e.g. Finance, John, HQ-1, PM)..."
                  className="form-input flex-1"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="btn-primary flex items-center gap-2">
                  <RxMagnifyingGlass className="h-5 w-5" />
                  Search
                </button>
              </form>
              <div className="mt-3 text-[11px] text-slate-500 px-1">
                Tip: Press Enter to search. Results will show matches in employees list.
              </div>
            </div>
          </div>
        )}

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-6">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
