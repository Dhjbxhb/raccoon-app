import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  ArrowLeft, Shield, Users, Ban, Star, Search, 
  RefreshCcw, AlertTriangle, CheckCircle, XCircle,
  Crown, Clock, TrendingUp, MessageSquare, Activity, Zap
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0, premium: 0, banned: 0, active: 0 });
  const [platformStats, setPlatformStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, premium, banned
  const [selectedUser, setSelectedUser] = useState(null);

  // Check admin access - ONLY admin users can access
  useEffect(() => {
    if (!user) {
      navigate('/dashboard');
      toast.error('Please login first');
    } else if (!user.is_admin) {
      setAccessDenied(true);
      toast.error('Admin access required');
    }
  }, [user, navigate]);

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('raccoon_token');
      
      if (!token) {
        toast.error('Please login first');
        navigate('/login');
        return;
      }
      
      const response = await fetch(`${API_URL}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setStats(data.stats || { total: 0, premium: 0, banned: 0, active: 0 });
      } else if (response.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/login');
      } else if (response.status === 403) {
        setAccessDenied(true);
        toast.error('Admin access required');
      } else {
        toast.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch platform stats
  const fetchPlatformStats = async () => {
    try {
      const token = localStorage.getItem('raccoon_token');
      const response = await fetch(`${API_URL}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPlatformStats(data);
      }
    } catch (error) {
      console.error('Error fetching platform stats:', error);
    }
  };

  useEffect(() => {
    if (user && user.is_admin) {
      fetchUsers();
      fetchPlatformStats();
    }
  }, [user]);

  // Ban user
  const handleBan = async (userId, username) => {
    if (!window.confirm(`Ban user ${username}?`)) return;
    
    try {
      const token = localStorage.getItem('raccoon_token');
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success(`${username} has been banned`);
        fetchUsers();
      } else {
        toast.error('Failed to ban user');
      }
    } catch (error) {
      toast.error('Error banning user');
    }
  };

  // Unban user
  const handleUnban = async (userId, username) => {
    try {
      const token = localStorage.getItem('raccoon_token');
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/unban`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success(`${username} has been unbanned`);
        fetchUsers();
      } else {
        toast.error('Failed to unban user');
      }
    } catch (error) {
      toast.error('Error unbanning user');
    }
  };

  // Toggle premium
  const handleTogglePremium = async (userId, username, currentStatus) => {
    try {
      const token = localStorage.getItem('raccoon_token');
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/premium`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ premium: !currentStatus })
      });
      
      if (response.ok) {
        toast.success(`${username} premium status updated`);
        fetchUsers();
      } else {
        toast.error('Failed to update premium status');
      }
    } catch (error) {
      toast.error('Error updating premium');
    }
  };

  // Filter users
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === 'premium') return matchesSearch && u.premium_status;
    if (filter === 'banned') return matchesSearch && u.is_banned;
    return matchesSearch;
  });

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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-[#0a0a0a] via-[#1a0a2e] to-[#0a0a0a]" />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 backdrop-blur-md bg-black/50">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-white/10 rounded-full transition-all"
              >
                <ArrowLeft size={24} />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <Shield size={24} className="text-red-500" />
                </div>
                <h1 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Admin Panel
                </h1>
              </div>
            </div>
            <button
              onClick={fetchUsers}
              className="p-2 hover:bg-white/10 rounded-full transition-all"
              disabled={loading}
            >
              <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          {/* Platform Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
            <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <Users size={20} className="text-[#7c3aed]" />
                <span className="text-3xl font-bold">{stats.total}</span>
              </div>
              <p className="text-gray-400 text-sm">Total Users</p>
            </div>
            <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <Crown size={20} className="text-yellow-400" />
                <span className="text-3xl font-bold">{stats.premium}</span>
              </div>
              <p className="text-gray-400 text-sm">Premium Users</p>
            </div>
            <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <Ban size={20} className="text-red-500" />
                <span className="text-3xl font-bold">{stats.banned}</span>
              </div>
              <p className="text-gray-400 text-sm">Banned Users</p>
            </div>
            <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <Activity size={20} className="text-green-500" />
                <span className="text-3xl font-bold">{platformStats?.active_sessions || 0}</span>
              </div>
              <p className="text-gray-400 text-sm">Active Today</p>
            </div>
            <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <Zap size={20} className="text-orange-400" />
                <span className="text-3xl font-bold">{platformStats?.total_matches || 0}</span>
              </div>
              <p className="text-gray-400 text-sm">Total Matches</p>
            </div>
            <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <MessageSquare size={20} className="text-blue-400" />
                <span className="text-3xl font-bold">{platformStats?.messages_today || 0}</span>
              </div>
              <p className="text-gray-400 text-sm">Messages Today</p>
            </div>
            <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp size={20} className="text-cyan-400" />
                <span className="text-3xl font-bold">{platformStats?.total_guests || 0}</span>
              </div>
              <p className="text-gray-400 text-sm">Guest Users</p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full bg-white/5 border border-white/10 rounded-xl h-12 pl-12 pr-4 text-white placeholder:text-white/30 outline-none focus:border-[#7c3aed]/50 transition-all"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'premium', 'banned'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl transition-all capitalize ${
                    filter === f 
                      ? 'bg-[#7c3aed] text-white' 
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">User</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Country</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Joined</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                        <RefreshCcw size={24} className="animate-spin mx-auto mb-2" />
                        Loading...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.user_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#7c3aed]/20 rounded-full flex items-center justify-center">
                              {u.username?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold flex items-center gap-2">
                                {u.username}
                                {u.premium_status && <Star size={14} className="text-yellow-400 fill-yellow-400" />}
                              </p>
                              <p className="text-sm text-gray-400">{u.gender || 'N/A'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-300">{u.email || 'N/A'}</td>
                        <td className="px-6 py-4">
                          {u.is_banned ? (
                            <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm flex items-center gap-1 w-fit">
                              <XCircle size={14} /> Banned
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm flex items-center gap-1 w-fit">
                              <CheckCircle size={14} /> Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-300">{u.country || 'Unknown'}</td>
                        <td className="px-6 py-4 text-gray-400 text-sm">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleTogglePremium(u.user_id, u.username, u.premium_status)}
                              className={`p-2 rounded-lg transition-all ${
                                u.premium_status 
                                  ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' 
                                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
                              }`}
                              title={u.premium_status ? 'Remove Premium' : 'Grant Premium'}
                            >
                              <Crown size={18} />
                            </button>
                            {u.is_banned ? (
                              <button
                                onClick={() => handleUnban(u.user_id, u.username)}
                                className="p-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-all"
                                title="Unban User"
                              >
                                <CheckCircle size={18} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleBan(u.user_id, u.username)}
                                className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-all"
                                title="Ban User"
                              >
                                <Ban size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
