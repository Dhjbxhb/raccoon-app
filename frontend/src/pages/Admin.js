import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  ArrowLeft, Shield, Users, Ban, Star, Search, RefreshCcw, 
  AlertTriangle, CheckCircle, XCircle, Crown, Clock, TrendingUp, 
  MessageSquare, Activity, Zap, Eye, Flag, Settings, ChevronDown,
  ChevronUp, Calendar, Globe, Mail, Phone, User, X, Check,
  AlertCircle, FileText, BarChart3, UserX, UserCheck, Loader2,
  History
} from 'lucide-react';
import AdminActionLogs from '@/components/admin/AdminActionLogs';
import '@/styles/admin.css';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Tab components
const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'reports', label: 'Reports', icon: Flag },
  { id: 'premium', label: 'Premium', icon: Crown },
  { id: 'matches', label: 'Sessions', icon: Zap },
  { id: 'logs', label: 'Audit Log', icon: History },
];

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  
  // Dashboard state
  const [dashboardStats, setDashboardStats] = useState(null);
  
  // Users state
  const [users, setUsers] = useState([]);
  const [usersPagination, setUsersPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [usersFilter, setUsersFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  
  // Reports state
  const [reports, setReports] = useState([]);
  const [reportsPagination, setReportsPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [reportsFilter, setReportsFilter] = useState('pending');
  const [selectedReport, setSelectedReport] = useState(null);
  
  // Premium state
  const [premiumUsers, setPremiumUsers] = useState([]);
  const [premiumFilter, setPremiumFilter] = useState('active');
  
  // Matches state
  const [matches, setMatches] = useState([]);
  const [matchesPagination, setMatchesPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [sessionMessages, setSessionMessages] = useState(null);
  
  // Action modals
  const [banModal, setBanModal] = useState(null);
  const [premiumModal, setPremiumModal] = useState(null);

  // Check admin access
  useEffect(() => {
    if (!user) {
      navigate('/dashboard');
      toast.error('Please login first');
    } else if (!user.is_admin) {
      setAccessDenied(true);
      toast.error('Admin access required');
    }
  }, [user, navigate]);

  const getToken = () => localStorage.getItem('raccoon_token');

  // Fetch dashboard stats
  const fetchDashboard = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDashboardStats(data);
      } else if (response.status === 403) {
        setAccessDenied(true);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async (page = 1) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        filter: usersFilter,
        ...(searchQuery && { search: searchQuery })
      });
      
      const response = await fetch(`${API_URL}/api/admin/users?${params}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setUsersPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [usersFilter, searchQuery]);

  // Fetch user details
  const fetchUserDetails = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUserDetails(data);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  // Fetch reports
  const fetchReports = useCallback(async (page = 1) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(reportsFilter && { status: reportsFilter })
      });
      
      const response = await fetch(`${API_URL}/api/admin/reports?${params}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports);
        setReportsPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  }, [reportsFilter]);

  // Fetch premium users
  const fetchPremiumUsers = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/premium?filter=${premiumFilter}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPremiumUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching premium users:', error);
    }
  }, [premiumFilter]);

  // Fetch matches
  const fetchMatches = useCallback(async (page = 1) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/matches?page=${page}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMatches(data.matches);
        setMatchesPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  }, []);

  // Fetch session messages
  const fetchSessionMessages = async (sessionId) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/matches/${sessionId}/messages`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSessionMessages({ sessionId, messages: data.messages });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Actions
  const handleBanUser = async (userId, isBanned, durationHours = null, reason = null) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          is_banned: isBanned, 
          duration_hours: durationHours,
          reason: reason 
        })
      });
      
      if (response.ok) {
        toast.success(isBanned ? 'User banned' : 'User unbanned');
        setBanModal(null);
        fetchUsers(usersPagination.page);
        if (userDetails) fetchUserDetails(userId);
      }
    } catch (error) {
      toast.error('Action failed');
    }
  };

  const handleUpdatePremium = async (userId, isPremium, durationDays = null) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/premium`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          premium: isPremium, 
          duration_days: durationDays 
        })
      });
      
      if (response.ok) {
        toast.success(isPremium ? 'Premium granted' : 'Premium removed');
        setPremiumModal(null);
        fetchUsers(usersPagination.page);
        if (userDetails) fetchUserDetails(userId);
      }
    } catch (error) {
      toast.error('Action failed');
    }
  };

  const handleReportAction = async (reportId, status, banUser = false, banDuration = null, notes = null) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/reports/${reportId}/action`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          status,
          ban_user: banUser,
          ban_duration_hours: banDuration,
          admin_notes: notes
        })
      });
      
      if (response.ok) {
        toast.success('Report updated');
        setSelectedReport(null);
        fetchReports(reportsPagination.page);
      }
    } catch (error) {
      toast.error('Action failed');
    }
  };

  // Load data based on active tab
  useEffect(() => {
    if (!user?.is_admin) return;
    
    setLoading(true);
    switch (activeTab) {
      case 'dashboard':
        fetchDashboard();
        break;
      case 'users':
        fetchUsers();
        break;
      case 'reports':
        fetchReports();
        break;
      case 'premium':
        fetchPremiumUsers();
        break;
      case 'matches':
        fetchMatches();
        break;
      default:
        setLoading(false);
    }
  }, [activeTab, user, fetchDashboard, fetchUsers, fetchReports, fetchPremiumUsers, fetchMatches]);

  // Refetch on filter changes
  useEffect(() => {
    if (activeTab === 'users' && user?.is_admin) fetchUsers();
  }, [usersFilter, searchQuery, activeTab, user, fetchUsers]);

  useEffect(() => {
    if (activeTab === 'reports' && user?.is_admin) fetchReports();
  }, [reportsFilter, activeTab, user, fetchReports]);

  useEffect(() => {
    if (activeTab === 'premium' && user?.is_admin) fetchPremiumUsers();
  }, [premiumFilter, activeTab, user, fetchPremiumUsers]);

  if (!user) return null;

  // Access denied screen
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="fixed inset-0 z-0 bg-gradient-to-br from-[#0a0a0a] via-[#1a0a2e] to-[#0a0a0a]" />
        <div className="relative z-10 text-center px-6">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield size={40} className="text-red-500" />
          </div>
          <h1 className="text-3xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Access Denied
          </h1>
          <p className="text-gray-400 mb-8 max-w-md" style={{ fontFamily: 'Manrope, sans-serif' }}>
            You don't have permission to access the Admin Panel. 
            Only authorized administrators can view this page.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-8 py-3 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl font-semibold transition-all"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Stat Card Component
  const StatCard = ({ icon: Icon, label, value, change, color = "purple", subValue }) => (
    <div className="p-5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-white/[0.07] transition-all">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl bg-${color}-500/20`}>
          <Icon size={20} className={`text-${color}-400`} />
        </div>
        {change !== undefined && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            change >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {change >= 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <span className="text-2xl font-bold">{value?.toLocaleString() || 0}</span>
        {subValue && <span className="text-sm text-gray-500 ml-2">{subValue}</span>}
      </div>
      <p className="text-gray-400 text-sm mt-1">{label}</p>
    </div>
  );

  // User Row Component
  const UserRow = ({ userData, onClick }) => (
    <div 
      className="flex items-center gap-4 p-4 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl cursor-pointer transition-all border border-transparent hover:border-white/10"
      onClick={() => onClick(userData)}
    >
      <div className="w-10 h-10 bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] rounded-full flex items-center justify-center text-sm font-bold">
        {userData.username?.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{userData.username}</span>
          {userData.premium_status && <Crown size={14} className="text-yellow-400" />}
          {userData.is_banned && <Ban size={14} className="text-red-500" />}
          {userData.is_admin && <Shield size={14} className="text-blue-400" />}
        </div>
        <p className="text-sm text-gray-500 truncate">{userData.email || 'Guest User'}</p>
      </div>
      <div className="text-right hidden md:block">
        <p className="text-sm text-gray-400">{userData.country || 'Unknown'}</p>
        <p className="text-xs text-gray-600">{userData.gender || '-'}</p>
      </div>
      <Eye size={18} className="text-gray-500" />
    </div>
  );

  // Report Row Component
  const ReportRow = ({ report, onClick }) => (
    <div 
      className="p-4 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl cursor-pointer transition-all border border-transparent hover:border-white/10"
      onClick={() => onClick(report)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
              report.status === 'actioned' ? 'bg-red-500/20 text-red-400' :
              report.status === 'reviewed' ? 'bg-green-500/20 text-green-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {report.status?.toUpperCase()}
            </span>
            <span className="text-sm text-gray-500">{report.reason}</span>
          </div>
          <p className="text-sm">
            <span className="text-gray-400">Reported:</span>{' '}
            <span className="font-medium">{report.reported_username}</span>
          </p>
          <p className="text-xs text-gray-600 mt-1">
            by {report.reporter_username} • {new Date(report.created_at).toLocaleDateString()}
          </p>
        </div>
        <Flag size={18} className="text-red-400" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050508] text-white">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#050508] via-[#0a0515] to-[#050508]" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#7c3aed]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#4c1d95]/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-[#050508]/80 backdrop-blur-xl border-b border-white/5">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all"
                >
                  <ArrowLeft size={20} className="text-gray-400" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#7c3aed]/20 rounded-xl">
                    <Shield size={24} className="text-[#7c3aed]" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Admin Control Center
                    </h1>
                    <p className="text-sm text-gray-500">Full platform management</p>
                  </div>
                </div>
              </div>
              
              {/* Live indicator */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm text-green-400">
                    {dashboardStats?.live?.total_online || 0} Online
                  </span>
                </div>
                <button
                  onClick={() => {
                    setLoading(true);
                    fetchDashboard();
                  }}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all"
                >
                  <RefreshCcw size={18} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-4 overflow-x-auto pb-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#7c3aed] text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                  {tab.id === 'reports' && dashboardStats?.alerts?.pending_reports > 0 && (
                    <span className="w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                      {dashboardStats.alerts.pending_reports}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-6 py-6">
          {loading && activeTab === 'dashboard' ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-[#7c3aed] animate-spin" />
            </div>
          ) : (
            <>
              {/* Dashboard Tab */}
              {activeTab === 'dashboard' && dashboardStats && (
                <div className="space-y-6">
                  {/* Overview Stats */}
                  <div>
                    <h2 className="text-lg font-semibold mb-4 text-gray-300">Platform Overview</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                      <StatCard icon={Users} label="Total Users" value={dashboardStats.overview.total_users} color="purple" />
                      <StatCard icon={User} label="Guests" value={dashboardStats.overview.total_guests} color="blue" />
                      <StatCard icon={Crown} label="Premium" value={dashboardStats.overview.premium_users} color="yellow" />
                      <StatCard icon={Ban} label="Banned" value={dashboardStats.overview.banned_users} color="red" />
                      <StatCard icon={Zap} label="Total Matches" value={dashboardStats.overview.total_matches} color="orange" />
                      <StatCard icon={MessageSquare} label="Messages" value={dashboardStats.overview.total_messages} color="cyan" />
                      <StatCard icon={Flag} label="Reports" value={dashboardStats.overview.total_reports} color="pink" />
                    </div>
                  </div>

                  {/* Live Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-6 bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-2xl">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                        <h3 className="font-semibold text-green-400">Live Now</h3>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold">{dashboardStats.live.total_online}</span>
                        <span className="text-gray-500">users online</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        {dashboardStats.live.online_users} registered, {dashboardStats.live.online_guests} guests
                      </p>
                    </div>

                    <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                      <h3 className="font-semibold text-gray-300 mb-4">Today vs Yesterday</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Active Users</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{dashboardStats.today.active_users}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              dashboardStats.comparisons.active_users_change >= 0 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {dashboardStats.comparisons.active_users_change >= 0 ? '+' : ''}{dashboardStats.comparisons.active_users_change}%
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Matches</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{dashboardStats.today.matches}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              dashboardStats.comparisons.matches_change >= 0 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {dashboardStats.comparisons.matches_change >= 0 ? '+' : ''}{dashboardStats.comparisons.matches_change}%
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Messages</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{dashboardStats.today.messages}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              dashboardStats.comparisons.messages_change >= 0 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {dashboardStats.comparisons.messages_change >= 0 ? '+' : ''}{dashboardStats.comparisons.messages_change}%
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">New Signups</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{dashboardStats.today.new_signups}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              dashboardStats.comparisons.signups_change >= 0 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {dashboardStats.comparisons.signups_change >= 0 ? '+' : ''}{dashboardStats.comparisons.signups_change}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                      <h3 className="font-semibold text-gray-300 mb-4">Alerts</h3>
                      <div className="space-y-3">
                        {dashboardStats.alerts.pending_reports > 0 && (
                          <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <AlertCircle size={18} className="text-red-400" />
                            <div>
                              <p className="font-medium text-red-400">{dashboardStats.alerts.pending_reports} Pending Reports</p>
                              <p className="text-xs text-gray-500">Requires review</p>
                            </div>
                          </div>
                        )}
                        {dashboardStats.alerts.premium_expiring_soon > 0 && (
                          <div className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                            <Clock size={18} className="text-yellow-400" />
                            <div>
                              <p className="font-medium text-yellow-400">{dashboardStats.alerts.premium_expiring_soon} Expiring Soon</p>
                              <p className="text-xs text-gray-500">Premium expires in 7 days</p>
                            </div>
                          </div>
                        )}
                        {dashboardStats.alerts.pending_reports === 0 && dashboardStats.alerts.premium_expiring_soon === 0 && (
                          <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                            <CheckCircle size={18} className="text-green-400" />
                            <p className="text-green-400">All clear!</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Users Tab */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  {/* Search and Filters */}
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                      <input
                        type="text"
                        placeholder="Search users by name, email, or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl h-12 pl-12 pr-4 text-white placeholder:text-gray-500 outline-none focus:border-[#7c3aed]/50"
                      />
                    </div>
                    <div className="flex gap-2">
                      {['all', 'premium', 'banned', 'guests'].map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setUsersFilter(filter)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            usersFilter === filter
                              ? 'bg-[#7c3aed] text-white'
                              : 'bg-white/5 text-gray-400 hover:bg-white/10'
                          }`}
                        >
                          {filter.charAt(0).toUpperCase() + filter.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Users List */}
                  <div className="space-y-2">
                    {users.map((userData) => (
                      <UserRow 
                        key={userData.user_id} 
                        userData={userData}
                        onClick={(u) => {
                          setSelectedUser(u);
                          fetchUserDetails(u.user_id);
                        }}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {usersPagination.pages > 1 && (
                    <div className="flex justify-center gap-2 pt-4">
                      {Array.from({ length: Math.min(usersPagination.pages, 5) }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => fetchUsers(page)}
                          className={`w-10 h-10 rounded-xl text-sm font-medium transition-all ${
                            usersPagination.page === page
                              ? 'bg-[#7c3aed] text-white'
                              : 'bg-white/5 text-gray-400 hover:bg-white/10'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Reports Tab */}
              {activeTab === 'reports' && (
                <div className="space-y-4">
                  {/* Filters */}
                  <div className="flex gap-2">
                    {['pending', 'reviewed', 'actioned', 'ignored'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setReportsFilter(filter)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          reportsFilter === filter
                            ? 'bg-[#7c3aed] text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* Reports List */}
                  <div className="space-y-2">
                    {reports.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Flag size={40} className="mx-auto mb-4 opacity-50" />
                        <p>No {reportsFilter} reports</p>
                      </div>
                    ) : (
                      reports.map((report) => (
                        <ReportRow 
                          key={report.report_id} 
                          report={report}
                          onClick={setSelectedReport}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Premium Tab */}
              {activeTab === 'premium' && (
                <div className="space-y-4">
                  {/* Filters */}
                  <div className="flex gap-2">
                    {['active', 'expiring', 'expired'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setPremiumFilter(filter)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          premiumFilter === filter
                            ? 'bg-[#7c3aed] text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* Premium Users List */}
                  <div className="space-y-2">
                    {premiumUsers.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Crown size={40} className="mx-auto mb-4 opacity-50" />
                        <p>No {premiumFilter} premium users</p>
                      </div>
                    ) : (
                      premiumUsers.map((userData) => (
                        <div 
                          key={userData.user_id}
                          className="flex items-center gap-4 p-4 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl transition-all border border-white/5"
                        >
                          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-sm font-bold text-black">
                            {userData.username?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{userData.username}</p>
                            <p className="text-sm text-gray-500">{userData.email}</p>
                          </div>
                          <div className="text-right">
                            {userData.premium_expires_at ? (
                              <>
                                <p className="text-sm text-gray-400">Expires</p>
                                <p className="text-sm font-medium">{new Date(userData.premium_expires_at).toLocaleDateString()}</p>
                              </>
                            ) : (
                              <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Lifetime</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Sessions/Matches Tab */}
              {activeTab === 'matches' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {matches.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Zap size={40} className="mx-auto mb-4 opacity-50" />
                        <p>No matches yet</p>
                      </div>
                    ) : (
                      matches.map((match) => (
                        <div 
                          key={match.session_id}
                          className="p-4 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl transition-all border border-white/5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <Zap size={18} className="text-[#7c3aed]" />
                              <div>
                                <p className="font-medium">
                                  {match.user1_id?.slice(0, 8)}... ↔ {match.user2_id?.slice(0, 8)}...
                                </p>
                                <p className="text-sm text-gray-500">
                                  {new Date(match.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => fetchSessionMessages(match.session_id)}
                              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-all"
                            >
                              View Chat
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Audit Logs Tab */}
              {activeTab === 'logs' && (
                <AdminActionLogs token={localStorage.getItem('raccoon_token')} />
              )}
            </>
          )}
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && userDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { setSelectedUser(null); setUserDetails(null); }} />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0a0a15] border border-white/10 rounded-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 p-6 border-b border-white/10 bg-[#0a0a15]">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] rounded-2xl flex items-center justify-center text-2xl font-bold">
                    {userDetails.user.username?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold">{userDetails.user.username}</h2>
                      {userDetails.user.premium_status && <Crown size={18} className="text-yellow-400" />}
                      {userDetails.user.is_banned && <Ban size={18} className="text-red-500" />}
                      {userDetails.user.is_admin && <Shield size={18} className="text-blue-400" />}
                    </div>
                    <p className="text-gray-500">{userDetails.user.email || 'Guest User'}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedUser(null); setUserDetails(null); }}
                  className="p-2 hover:bg-white/10 rounded-xl"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white/5 rounded-xl text-center">
                  <p className="text-2xl font-bold">{userDetails.stats.total_matches}</p>
                  <p className="text-sm text-gray-500">Matches</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl text-center">
                  <p className="text-2xl font-bold">{userDetails.stats.total_messages}</p>
                  <p className="text-sm text-gray-500">Messages</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl text-center">
                  <p className="text-2xl font-bold">{userDetails.stats.reports_received}</p>
                  <p className="text-sm text-gray-500">Reports</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl text-center">
                  <p className="text-2xl font-bold">{userDetails.stats.days_on_platform}</p>
                  <p className="text-sm text-gray-500">Days</p>
                </div>
              </div>

              {/* User Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Globe size={16} className="text-gray-500" />
                    <span className="text-gray-400">Country:</span>
                    <span>{userDetails.user.country || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <User size={16} className="text-gray-500" />
                    <span className="text-gray-400">Gender:</span>
                    <span>{userDetails.user.gender || '-'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar size={16} className="text-gray-500" />
                    <span className="text-gray-400">Joined:</span>
                    <span>{userDetails.user.created_at ? new Date(userDetails.user.created_at).toLocaleDateString() : '-'}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Clock size={16} className="text-gray-500" />
                    <span className="text-gray-400">Last Active:</span>
                    <span>{userDetails.user.last_active ? new Date(userDetails.user.last_active).toLocaleString() : '-'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Activity size={16} className="text-gray-500" />
                    <span className="text-gray-400">Sessions:</span>
                    <span>{userDetails.user.total_sessions || 0}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Mail size={16} className="text-gray-500" />
                    <span className="text-gray-400">Auth:</span>
                    <span>{userDetails.user.auth_provider || 'email'}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-white/10">
                {userDetails.user.is_banned ? (
                  <button
                    onClick={() => handleBanUser(userDetails.user.user_id, false)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl transition-all"
                  >
                    <UserCheck size={18} />
                    Unban User
                  </button>
                ) : (
                  <button
                    onClick={() => setBanModal(userDetails.user)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-all"
                  >
                    <Ban size={18} />
                    Ban User
                  </button>
                )}
                
                {userDetails.user.premium_status ? (
                  <button
                    onClick={() => handleUpdatePremium(userDetails.user.user_id, false)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 rounded-xl transition-all"
                  >
                    <Crown size={18} />
                    Remove Premium
                  </button>
                ) : (
                  <button
                    onClick={() => setPremiumModal(userDetails.user)}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-xl transition-all"
                  >
                    <Crown size={18} />
                    Grant Premium
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {banModal && (
        <BanModal 
          user={banModal}
          onClose={() => setBanModal(null)}
          onBan={handleBanUser}
        />
      )}

      {/* Premium Modal */}
      {premiumModal && (
        <PremiumModal 
          user={premiumModal}
          onClose={() => setPremiumModal(null)}
          onGrant={handleUpdatePremium}
        />
      )}

      {/* Report Details Modal */}
      {selectedReport && (
        <ReportModal 
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onAction={handleReportAction}
        />
      )}

      {/* Session Messages Modal */}
      {sessionMessages && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSessionMessages(null)} />
          <div className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-[#0a0a15] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Session Messages</h3>
              <button onClick={() => setSessionMessages(null)} className="p-2 hover:bg-white/10 rounded-xl">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="space-y-3">
              {sessionMessages.messages.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No messages in this session</p>
              ) : (
                sessionMessages.messages.map((msg, i) => (
                  <div key={i} className="p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-[#7c3aed]">{msg.sender_id?.slice(0, 8)}...</span>
                      <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Ban Modal Component
const BanModal = ({ user, onClose, onBan }) => {
  const [duration, setDuration] = useState('permanent');
  const [customHours, setCustomHours] = useState(24);
  const [reason, setReason] = useState('');

  const handleBan = () => {
    const hours = duration === 'permanent' ? null : 
      duration === 'custom' ? customHours :
      duration === '1h' ? 1 :
      duration === '24h' ? 24 :
      duration === '7d' ? 168 :
      duration === '30d' ? 720 : null;
    
    onBan(user.user_id, true, hours, reason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#0a0a15] border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Ban size={20} className="text-red-400" />
          Ban {user.username}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Duration</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: '1h', label: '1 Hour' },
                { value: '24h', label: '24 Hours' },
                { value: '7d', label: '7 Days' },
                { value: '30d', label: '30 Days' },
                { value: 'custom', label: 'Custom' },
                { value: 'permanent', label: 'Permanent' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDuration(opt.value)}
                  className={`p-2 rounded-xl text-sm transition-all ${
                    duration === opt.value
                      ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                      : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          
          {duration === 'custom' && (
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Hours</label>
              <input
                type="number"
                value={customHours}
                onChange={(e) => setCustomHours(parseInt(e.target.value) || 1)}
                className="w-full bg-white/5 border border-white/10 rounded-xl h-10 px-4 text-white outline-none"
              />
            </div>
          )}
          
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Reason (optional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter ban reason..."
              className="w-full bg-white/5 border border-white/10 rounded-xl h-10 px-4 text-white placeholder:text-gray-600 outline-none"
            />
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all">
            Cancel
          </button>
          <button onClick={handleBan} className="flex-1 py-2 bg-red-500 hover:bg-red-600 rounded-xl transition-all font-semibold">
            Ban User
          </button>
        </div>
      </div>
    </div>
  );
};

// Premium Modal Component
const PremiumModal = ({ user, onClose, onGrant }) => {
  const [duration, setDuration] = useState('permanent');
  const [customDays, setCustomDays] = useState(30);

  const handleGrant = () => {
    const days = duration === 'permanent' ? null : 
      duration === 'custom' ? customDays :
      duration === '7d' ? 7 :
      duration === '30d' ? 30 :
      duration === '90d' ? 90 :
      duration === '365d' ? 365 : null;
    
    onGrant(user.user_id, true, days);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#0a0a15] border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Crown size={20} className="text-yellow-400" />
          Grant Premium to {user.username}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Duration</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: '7d', label: '7 Days' },
                { value: '30d', label: '30 Days' },
                { value: '90d', label: '90 Days' },
                { value: '365d', label: '1 Year' },
                { value: 'custom', label: 'Custom' },
                { value: 'permanent', label: 'Lifetime' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDuration(opt.value)}
                  className={`p-2 rounded-xl text-sm transition-all ${
                    duration === opt.value
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                      : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          
          {duration === 'custom' && (
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Days</label>
              <input
                type="number"
                value={customDays}
                onChange={(e) => setCustomDays(parseInt(e.target.value) || 1)}
                className="w-full bg-white/5 border border-white/10 rounded-xl h-10 px-4 text-white outline-none"
              />
            </div>
          )}
        </div>
        
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all">
            Cancel
          </button>
          <button onClick={handleGrant} className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-xl transition-all font-semibold">
            Grant Premium
          </button>
        </div>
      </div>
    </div>
  );
};

// Report Modal Component
const ReportModal = ({ report, onClose, onAction }) => {
  const [action, setAction] = useState('reviewed');
  const [banUser, setBanUser] = useState(false);
  const [banDuration, setBanDuration] = useState(24);
  const [notes, setNotes] = useState('');

  const handleAction = () => {
    onAction(report.report_id, action, banUser, banUser ? banDuration : null, notes);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0a0a15] border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Flag size={20} className="text-red-400" />
          Report Details
        </h3>
        
        <div className="space-y-4 mb-6">
          <div className="p-4 bg-white/5 rounded-xl">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Reported User:</span>
                <p className="font-medium">{report.reported_username}</p>
              </div>
              <div>
                <span className="text-gray-500">Reporter:</span>
                <p className="font-medium">{report.reporter_username}</p>
              </div>
              <div>
                <span className="text-gray-500">Reason:</span>
                <p className="font-medium">{report.reason}</p>
              </div>
              <div>
                <span className="text-gray-500">Date:</span>
                <p className="font-medium">{new Date(report.created_at).toLocaleString()}</p>
              </div>
            </div>
            {report.details && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <span className="text-gray-500 text-sm">Details:</span>
                <p className="mt-1">{report.details}</p>
              </div>
            )}
          </div>
          
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Action</label>
            <div className="grid grid-cols-3 gap-2">
              {['reviewed', 'actioned', 'ignored'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setAction(opt)}
                  className={`p-2 rounded-xl text-sm transition-all ${
                    action === opt
                      ? 'bg-[#7c3aed]/20 text-[#7c3aed] border border-[#7c3aed]/50'
                      : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
                  }`}
                >
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="banUser"
              checked={banUser}
              onChange={(e) => setBanUser(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="banUser" className="text-sm">Ban reported user</label>
          </div>
          
          {banUser && (
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Ban Duration (hours)</label>
              <input
                type="number"
                value={banDuration}
                onChange={(e) => setBanDuration(parseInt(e.target.value) || 1)}
                className="w-full bg-white/5 border border-white/10 rounded-xl h-10 px-4 text-white outline-none"
              />
            </div>
          )}
          
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Admin Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this report..."
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder:text-gray-600 outline-none resize-none h-20"
            />
          </div>
        </div>
        
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all">
            Cancel
          </button>
          <button onClick={handleAction} className="flex-1 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl transition-all font-semibold">
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default Admin;
