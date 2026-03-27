import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { Toaster } from 'sonner';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Guest from '@/pages/Guest';
import AgeVerification from '@/pages/AgeVerification';
import Dashboard from '@/pages/Dashboard';
import Match from '@/pages/Match';
import Premium from '@/pages/Premium';
import PremiumSuccess from '@/pages/PremiumSuccess';
import Admin from '@/pages/Admin';
import Profile from '@/pages/Profile';
import Terms from '@/pages/Terms';
import Privacy from '@/pages/Privacy';
import Guidelines from '@/pages/Guidelines';
import Refund from '@/pages/Refund';
import '@/App.css';

// Remove external branding
const removeBranding = () => {
  const selectors = [
    '[class*="emergent" i]',
    '[id*="emergent" i]',
    'a[href*="emergent" i]',
    '[class*="watermark" i]',
    '[class*="badge" i]:not(.bg-yellow-500):not(.text-yellow-400)',
    'iframe',
  ];
  
  selectors.forEach(selector => {
    try {
      document.querySelectorAll(selector).forEach(el => {
        if (el.textContent?.toLowerCase().includes('emergent') || 
            el.href?.toLowerCase().includes('emergent') ||
            el.src?.toLowerCase().includes('emergent')) {
          el.style.display = 'none';
          el.style.visibility = 'hidden';
        }
      });
    } catch (e) {}
  });
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white text-xl" style={{ fontFamily: 'Manrope, sans-serif' }}>Loading...</div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/login" />;
  }

  // Authenticated but not age verified - redirect to age verification
  if (!user.age_verified) {
    return <Navigate to="/verify-age" />;
  }

  return children;
};

// Route that requires auth but NOT age verification (for the age verification page itself)
const AuthOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white text-xl" style={{ fontFamily: 'Manrope, sans-serif' }}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/guest" element={<Guest />} />
      <Route path="/premium" element={<Premium />} />
      <Route path="/premium/success" element={<PremiumSuccess />} />
      
      {/* Legal Pages - Public */}
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/guidelines" element={<Guidelines />} />
      <Route path="/refund" element={<Refund />} />
      
      {/* Age Verification - Requires auth but not age verification */}
      <Route 
        path="/verify-age" 
        element={
          <AuthOnlyRoute>
            <AgeVerification />
          </AuthOnlyRoute>
        } 
      />
      
      {/* Protected routes - Require auth AND age verification */}
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
      
      {/* Catch all - redirect to landing */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  // Remove branding on mount and periodically
  useEffect(() => {
    removeBranding();
    const interval = setInterval(removeBranding, 1000);
    
    // Also use MutationObserver to catch dynamically injected elements
    const observer = new MutationObserver(() => {
      removeBranding();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="App">
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
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
