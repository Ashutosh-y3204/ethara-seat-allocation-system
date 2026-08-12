import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PrivateRoute, PublicOnlyRoute } from './components/RouteGuard';
import { Layout } from './components/Layout';

// Lazy-loaded pages for instant initial bundle delivery
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Signup = lazy(() => import('./pages/Signup').then(m => ({ default: m.Signup })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Employees = lazy(() => import('./pages/Employees').then(m => ({ default: m.Employees })));
const Projects = lazy(() => import('./pages/Projects').then(m => ({ default: m.Projects })));
const Seats = lazy(() => import('./pages/Seats').then(m => ({ default: m.Seats })));
const AIAssistant = lazy(() => import('./pages/AIAssistant').then(m => ({ default: m.AIAssistant })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));

// Lightweight page loading placeholder
const PageFallback = () => (
  <div className="flex h-screen w-full items-center justify-center bg-slate-950">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
    </div>
  </div>
);

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
        <Suspense fallback={<PageFallback />}>
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
        </Suspense>
      </AuthProvider>
    </Router>
  );
}

export default App;
