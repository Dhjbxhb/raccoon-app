import React, { useState } from 'react';
import { 
  Flag, AlertCircle, CheckCircle, XCircle, Clock, 
  User, MessageSquare, ChevronLeft, ChevronRight, Eye
} from 'lucide-react';

const AdminReportsTable = ({ 
  reports, 
  pagination, 
  filter,
  stats,
  onFilterChange,
  onPageChange,
  onReportClick,
  loading
}) => {
  const filters = [
    { value: 'pending', label: 'Pending', icon: Clock, color: 'yellow' },
    { value: 'reviewed', label: 'Reviewed', icon: CheckCircle, color: 'green' },
    { value: 'actioned', label: 'Actioned', icon: AlertCircle, color: 'red' },
    { value: 'ignored', label: 'Ignored', icon: XCircle, color: 'gray' }
  ];

  const getStatusBadge = (status) => {
    const config = {
      pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock },
      reviewed: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle },
      actioned: { bg: 'bg-red-500/20', text: 'text-red-400', icon: AlertCircle },
      ignored: { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: XCircle }
    };
    const { bg, text, icon: Icon } = config[status] || config.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${bg} ${text} rounded-full text-xs font-medium`}>
        <Icon size={10} />
        {status?.toUpperCase()}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const config = {
      high: { bg: 'bg-red-500/20', text: 'text-red-400' },
      medium: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
      low: { bg: 'bg-blue-500/20', text: 'text-blue-400' }
    };
    const { bg, text } = config[priority] || config.medium;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 ${bg} ${text} rounded text-xs font-medium`}>
        {priority?.toUpperCase() || 'MEDIUM'}
      </span>
    );
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

  return (
    <div className="space-y-4" data-testid="admin-reports-table">
      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          {filters.map(({ value, label, icon: Icon, color }) => (
            <div 
              key={value}
              className={`p-3 rounded-xl bg-${color}-500/10 border border-${color}-500/20`}
            >
              <div className="flex items-center gap-2">
                <Icon size={16} className={`text-${color}-400`} />
                <span className="text-sm text-gray-400">{label}</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats[value] || 0}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {filters.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => onFilterChange(value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              filter === value
                ? 'bg-[#7c3aed] text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
            data-testid={`report-filter-${value}`}
          >
            <Icon size={14} />
            {label}
            {stats && stats[value] > 0 && (
              <span className={`ml-1 w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                filter === value ? 'bg-white/20' : 'bg-white/10'
              }`}>
                {stats[value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Reports List */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Flag size={40} className="mx-auto mb-4 opacity-50" />
            <p>No {filter} reports</p>
          </div>
        ) : (
          reports.map((report) => (
            <div
              key={report.report_id}
              onClick={() => onReportClick(report)}
              className="p-4 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl cursor-pointer transition-all border border-transparent hover:border-white/10"
              data-testid={`report-row-${report.report_id}`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: Report Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {getStatusBadge(report.status)}
                    {getPriorityBadge(report.priority)}
                    <span className="text-sm text-gray-400">{report.reason}</span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-red-400" />
                      <span className="text-gray-400">Reported:</span>
                      <span className="font-medium text-white">{report.reported_username || report.reported_id?.slice(0, 8)}</span>
                    </div>
                    <div className="w-px h-4 bg-white/10" />
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-blue-400" />
                      <span className="text-gray-400">By:</span>
                      <span className="text-gray-300">{report.reporter_username || report.reporter_id?.slice(0, 8)}</span>
                    </div>
                  </div>

                  {report.details && (
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">{report.details}</p>
                  )}
                </div>

                {/* Right: Date and Action */}
                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs text-gray-500">
                    {formatDate(report.created_at)}
                  </span>
                  <div className="p-2 hover:bg-white/10 rounded-lg transition-all">
                    <Eye size={16} className="text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Session Link */}
              {report.session_id && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5 text-xs text-gray-500">
                  <MessageSquare size={12} />
                  <span>Session: {report.session_id.slice(0, 12)}...</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <p className="text-sm text-gray-500">
            Showing {reports.length} of {pagination.total} reports
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            
            {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`w-10 h-10 rounded-xl text-sm font-medium transition-all ${
                  pagination.page === page
                    ? 'bg-[#7c3aed] text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {page}
              </button>
            ))}

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

export default AdminReportsTable;
