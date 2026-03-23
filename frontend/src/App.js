import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { Toaster } from 'sonner';
import AgeVerificationModal from '@/components/AgeVerificationModal';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Guest from '@/pages/Guest';
import Dashboard from '@/pages/Dashboard';
import Match from '@/pages/Match';
import Premium from '@/pages/Premium';
import PremiumSuccess from '@/pages/PremiumSuccess';
import GameFeud from '@/pages/GameFeud';
import GameTruthOrDare from '@/pages/GameTruthOrDare';
import Admin from '@/pages/Admin';
import Profile from '@/pages/Profile';
import Terms from '@/pages/Terms';
import Privacy from '@/pages/Privacy';
import Guidelines from '@/pages/Guidelines';
import Refund from '@/pages/Refund';
import '@/App.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white text-xl" style={{ fontFamily: 'Manrope, sans-serif' }}>Loading...</div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/guest" element={<Guest />} />
      <Route path="/premium" element={<Premium />} />
      <Route path="/premium/success" element={<PremiumSuccess />} />
      
      {/* Legal Pages */}
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/guidelines" element={<Guidelines />} />
      <Route path="/refund" element={<Refund />} />
      
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/match" 
        element={
          <ProtectedRoute>
            <Match />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/game/feud" 
        element={
          <ProtectedRoute>
            <GameFeud />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/game/truth-or-dare" 
        element={
          <ProtectedRoute>
            <GameTruthOrDare />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <AgeVerificationModal />
            <AppRoutes />
            <Toaster 
              position="top-right"
              toastOptions={{
                style: {
                  background: 'rgba(18, 18, 18, 0.9)',
                  color: '#fff',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                  backdropFilter: 'blur(16px)',
                  fontFamily: 'Manrope, sans-serif'
                }
              }}
            />
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
