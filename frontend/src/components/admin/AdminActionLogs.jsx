import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, Ban, Crown, Shield, Flag, Clock, User, 
  ChevronLeft, ChevronRight, RefreshCcw, Filter
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminActionLogs = ({ token }) => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState(null);

  const fetchLogs = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '30',
        ...(filterType && { action_type: filterType })
      });

      const response = await fetch(`${API_URL}/api/admin/logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  }, [token, filterType]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionIcon = (actionType) => {
    const icons = {
      ban_user: Ban,
      unban_user: Ban,
      temp_ban_user: Clock,
      grant_premium: Crown,
      remove_premium: Crown,
      grant_admin: Shield,
      remove_admin: Shield,
      review_report: Flag,
      action_report: Flag,
      dismiss_report: Flag
    };
    return icons[actionType] || FileText;
  };

  const getActionColor = (actionType) => {
    const colors = {
      ban_user: 'text-red-400 bg-red-500/20',
      unban_user: 'text-green-400 bg-green-500/20',
      temp_ban_user: 'text-orange-400 bg-orange-500/20',
      grant_premium: 'text-yellow-400 bg-yellow-500/20',
      remove_premium: 'text-gray-400 bg-gray-500/20',
      grant_admin: 'text-blue-400 bg-blue-500/20',
      remove_admin: 'text-blue-400 bg-blue-500/20',
      review_report: 'text-purple-400 bg-purple-500/20',
      action_report: 'text-red-400 bg-red-500/20',
      dismiss_report: 'text-gray-400 bg-gray-500/20'
    };
    return colors[actionType] || 'text-gray-400 bg-gray-500/20';
  };

  const formatActionType = (type) => {
    return type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Unknown';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '-';
    }
  };

  const actionTypes = [
    { value: null, label: 'All Actions' },
    { value: 'ban_user', label: 'Bans' },
    { value: 'unban_user', label: 'Unbans' },
    { value: 'grant_premium', label: 'Premium Grants' },
    { value: 'remove_premium', label: 'Premium Removals' },
    { value: 'action_report', label: 'Report Actions' }
  ];

  return (
    <div className="space-y-4" data-testid="admin-action-logs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText size={20} className="text-[#7c3aed]" />
          Admin Action Audit Log
        </h3>
        <button
          onClick={() => fetchLogs(pagination.page)}
          className="p-2 hover:bg-white/10 rounded-lg transition-all"
          disabled={loading}
        >
          <RefreshCcw size={18} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter size={14} className="text-gray-500" />
        {actionTypes.map(({ value, label }) => (
          <button
            key={value || 'all'}
            onClick={() => setFilterType(value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              filterType === value
                ? 'bg-[#7c3aed] text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Logs List */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText size={40} className="mx-auto mb-4 opacity-50" />
            <p>No admin actions logged yet</p>
          </div>
        ) : (
          logs.map((log) => {
            const Icon = getActionIcon(log.action_type);
            const colorClass = getActionColor(log.action_type);
            
            return (
              <div
                key={log.log_id}
                className="flex items-start gap-3 p-3 bg-white/[0.02] hover:bg-white/[0.04] rounded-xl transition-all border border-white/5"
              >
                {/* Icon */}
                <div className={`p-2 rounded-lg ${colorClass}`}>
                  <Icon size={16} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{formatActionType(log.action_type)}</span>
                    <span className="text-gray-500 text-xs">by</span>
                    <span className="text-[#7c3aed] text-sm">{log.admin_username}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                    <User size={12} />
                    <span>Target: {log.target_username || log.target_id?.slice(0, 8)}</span>
                    {log.details?.reason && (
                      <>
                        <span className="text-gray-600">•</span>
                        <span className="truncate">{log.details.reason}</span>
                      </>
                    )}
                  </div>

                  {log.details?.duration_hours && (
                    <div className="text-xs text-orange-400 mt-1">
                      Duration: {log.details.duration_hours}h
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <div className="text-xs text-gray-500 whitespace-nowrap">
                  {formatDate(log.created_at)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4 border-t border-white/10">
          <button
            onClick={() => fetchLogs(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          
          <span className="text-sm text-gray-400">
            Page {pagination.page} of {pagination.pages}
          </span>

          <button
            onClick={() => fetchLogs(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
            className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminActionLogs;
