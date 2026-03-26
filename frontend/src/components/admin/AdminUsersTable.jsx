import React, { useState } from 'react';
import { 
  Users, Crown, Ban, Shield, Search, Eye, UserCheck, UserX,
  Clock, Globe, Calendar, ChevronLeft, ChevronRight
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminUsersTable = ({ 
  users, 
  pagination, 
  filter, 
  searchQuery,
  onFilterChange,
  onSearchChange,
  onPageChange,
  onUserClick,
  loading
}) => {
  const [localSearch, setLocalSearch] = useState(searchQuery || '');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onSearchChange(localSearch);
  };

  const filters = [
    { value: 'all', label: 'All Users', icon: Users },
    { value: 'premium', label: 'Premium', icon: Crown },
    { value: 'banned', label: 'Banned', icon: Ban },
    { value: 'guests', label: 'Guests', icon: UserCheck }
  ];

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return '-';
    }
  };

  const getStatusBadges = (user) => {
    const badges = [];
    if (user.premium_status) {
      badges.push(
        <span key="premium" className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
          <Crown size={10} />
          Premium
        </span>
      );
    }
    if (user.is_banned) {
      badges.push(
        <span key="banned" className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-xs">
          <Ban size={10} />
          Banned
        </span>
      );
    }
    if (user.is_admin) {
      badges.push(
        <span key="admin" className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs">
          <Shield size={10} />
          Admin
        </span>
      );
    }
    return badges;
  };

  return (
    <div className="space-y-4" data-testid="admin-users-table">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Search users by name, email, or ID..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl h-12 pl-12 pr-4 text-white placeholder:text-gray-500 outline-none focus:border-[#7c3aed]/50 transition-all"
            data-testid="user-search-input"
          />
        </form>
        <div className="flex gap-2 overflow-x-auto">
          {filters.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => onFilterChange(value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                filter === value
                  ? 'bg-[#7c3aed] text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
              data-testid={`filter-${value}`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users size={40} className="mx-auto mb-4 opacity-50" />
            <p>No users found</p>
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.user_id || user.guest_id}
              onClick={() => onUserClick(user)}
              className="flex items-center gap-4 p-4 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl cursor-pointer transition-all border border-transparent hover:border-white/10"
              data-testid={`user-row-${user.user_id || user.guest_id}`}
            >
              {/* Avatar */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${
                user.premium_status 
                  ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-black'
                  : user.is_banned
                  ? 'bg-gradient-to-br from-red-500 to-red-700 text-white'
                  : 'bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] text-white'
              }`}>
                {(user.username || 'U').charAt(0).toUpperCase()}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{user.username}</span>
                  {getStatusBadges(user)}
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {user.email || user.guest_id || 'No email'}
                </p>
              </div>

              {/* Location & Gender */}
              <div className="hidden md:flex items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Globe size={14} />
                  <span>{user.country || 'Unknown'}</span>
                </div>
                <div className="w-px h-4 bg-white/10" />
                <span className="capitalize">{user.gender || '-'}</span>
              </div>

              {/* Join Date */}
              <div className="hidden lg:flex items-center gap-1 text-sm text-gray-500">
                <Calendar size={14} />
                <span>{formatDate(user.created_at)}</span>
              </div>

              {/* View Button */}
              <div className="p-2 hover:bg-white/10 rounded-lg transition-all">
                <Eye size={18} className="text-gray-400" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <p className="text-sm text-gray-500">
            Showing {users.length} of {pagination.total} users
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            
            {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
              let pageNum;
              if (pagination.pages <= 5) {
                pageNum = i + 1;
              } else if (pagination.page <= 3) {
                pageNum = i + 1;
              } else if (pagination.page >= pagination.pages - 2) {
                pageNum = pagination.pages - 4 + i;
              } else {
                pageNum = pagination.page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`w-10 h-10 rounded-xl text-sm font-medium transition-all ${
                    pagination.page === pageNum
                      ? 'bg-[#7c3aed] text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersTable;
