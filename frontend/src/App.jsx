import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PrivateRoute, PublicOnlyRoute } from './components/RouteGuard';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';
import { Projects } from './pages/Projects';
import { Seats } from './pages/Seats';
import { AIAssistant } from './pages/AIAssistant';
import { Profile } from './pages/Profile';
import { Signup } from './pages/Signup';

// Simple Unauthorized page
const Unauthorized = () => (
  <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 text-center space-y-4">
    <h2 className="text-3xl font-extrabold text-rose-500">Access Denied</h2>
    <p className="text-slate-400 text-sm max-w-sm">You do not have the required role permissions to access this management console page.</p>
    <a href="/" className="btn-primary text-xs">Return to Dashboard</a>
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>

          {/* Secure routes */}
          <Route element={<PrivateRoute allowedRoles={['Admin', 'HR', 'Project Manager', 'Employee']} />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/seats" element={<Seats />} />
              <Route path="/assistant" element={<AIAssistant />} />
              <Route path="/profile" element={<Profile />} />
              
              {/* Higher-privilege routes inside general private wrapper */}
              <Route element={<PrivateRoute allowedRoles={['Admin', 'HR', 'Project Manager']} />}>
                <Route path="/employees" element={<Employees />} />
              </Route>
            </Route>
          </Route>

          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
