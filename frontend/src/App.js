import React, { useEffect, lazy, Suspense, memo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { RoomLobbyProvider } from '@/contexts/RoomLobbyContext';
import { Toaster } from 'sonner';
import '@/App.css';

// PERFORMANCE: Lazy load all page components for faster initial load
const Landing = lazy(() => import('@/pages/Landing'));
const Login = lazy(() => import('@/pages/Login'));
const Signup = lazy(() => import('@/pages/Signup'));
const Guest = lazy(() => import('@/pages/Guest'));
const AgeVerification = lazy(() => import('@/pages/AgeVerification'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Match = lazy(() => import('@/pages/Match'));
const Premium = lazy(() => import('@/pages/Premium'));
const PremiumSuccess = lazy(() => import('@/pages/PremiumSuccess'));
const Admin = lazy(() => import('@/pages/Admin'));
const Profile = lazy(() => import('@/pages/Profile'));
const Terms = lazy(() => import('@/pages/Terms'));
const Privacy = lazy(() => import('@/pages/Privacy'));
const Guidelines = lazy(() => import('@/pages/Guidelines'));
const Refund = lazy(() => import('@/pages/Refund'));
const PrivateRoom = lazy(() => import('@/pages/PrivateRoom'));

// PERFORMANCE: Minimal loading fallback - no heavy spinners
const PageLoader = memo(() => (
  <div className="min-h-screen bg-[#0a0818] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
  </div>
));

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
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #020205 0%, #050510 30%, #0a0818 60%, #050510 100%)' }}>
        {/* Space glow effects */}
        <div 
          className="absolute w-[600px] h-[600px] opacity-30"
          style={{
            top: '10%',
            left: '20%',
            background: 'radial-gradient(ellipse, rgba(88, 28, 135, 0.3) 0%, transparent 60%)',
            filter: 'blur(100px)'
          }}
        />
        <div 
          className="absolute w-[400px] h-[400px] opacity-20"
          style={{
            bottom: '20%',
            right: '15%',
            background: 'radial-gradient(ellipse, rgba(124, 58, 237, 0.25) 0%, transparent 55%)',
            filter: 'blur(80px)'
          }}
        />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
          <p className="text-white/70 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>Loading...</p>
        </div>
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
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #020205 0%, #050510 30%, #0a0818 60%, #050510 100%)' }}>
        {/* Space glow effects */}
        <div 
          className="absolute w-[600px] h-[600px] opacity-30"
          style={{
            top: '10%',
            left: '20%',
            background: 'radial-gradient(ellipse, rgba(88, 28, 135, 0.3) 0%, transparent 60%)',
            filter: 'blur(100px)'
          }}
        />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
          <p className="text-white/70 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>Loading...</p>
        </div>
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
    <Suspense fallback={<PageLoader />}>
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
      <Route 
        path="/private-room" 
        element={
          <ProtectedRoute>
            <PrivateRoom />
          </ProtectedRoute>
        } 
      />
      
      {/* Catch all - redirect to landing */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
    </Suspense>
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
          <RoomLobbyProvider>
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
          </RoomLobbyProvider>
        </SocketProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
