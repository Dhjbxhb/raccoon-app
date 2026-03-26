import React, { useState, useEffect, useCallback } from 'react';
import { Flag, X, Loader2, CheckCircle, AlertTriangle, Shield } from 'lucide-react';
import { toast } from 'sonner';
import '@/styles/modals.css';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Report Modal - Premium UI for reporting users
 * 
 * Features:
 * - Animated entrance/exit
 * - Categorized report reasons with icons
 * - Optional details field with character count
 * - Success/error feedback
 * - Keyboard accessible (Escape to close)
 */
const ReportModal = ({ 
  partner, 
  sessionId, 
  onClose,
  onSuccess 
}) => {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [isClosing, setIsClosing] = useState(false);

  // Report reasons with icons and severity
  const REPORT_REASONS = [
    { id: 'harassment', label: 'Harassment', icon: '😠', severity: 'high' },
    { id: 'spam', label: 'Spam', icon: '📢', severity: 'low' },
    { id: 'nudity_sexual', label: 'Nudity/Sexual', icon: '🔞', severity: 'high' },
    { id: 'hate_speech', label: 'Hate Speech', icon: '🚫', severity: 'high' },
    { id: 'underage', label: 'Underage User', icon: '⚠️', severity: 'critical' },
    { id: 'scam_fraud', label: 'Scam/Fraud', icon: '💰', severity: 'high' },
    { id: 'fake_profile', label: 'Fake Profile', icon: '🎭', severity: 'normal' },
    { id: 'inappropriate_behavior', label: 'Inappropriate', icon: '👎', severity: 'normal' },
    { id: 'violence', label: 'Violence', icon: '⚔️', severity: 'critical' },
    { id: 'other', label: 'Other', icon: '❓', severity: 'low' }
  ];

  // Animated close - defined first so useEffect can use it
  const handleClose = useCallback(() => {
    if (submitting) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  }, [submitting, onClose]);

  // Handle keyboard escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) {
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [submitting, handleClose]);

  // Submit report
  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Please select a reason for reporting');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('raccoon_token');
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_URL}/api/reports/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reported_id: partner.user_id || partner.guest_id,
          reason: REPORT_REASONS.find(r => r.id === reason)?.label || reason,
          details: details.trim() || null,
          session_id: sessionId || null
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitted(true);
        toast.success('Report submitted successfully');
        
        // Call success callback if provided
        if (onSuccess) {
          onSuccess(data);
        }
        
        // Auto-close after success animation
        setTimeout(() => {
          handleClose();
        }, 1500);
      } else {
        // Handle specific errors
        if (response.status === 429) {
          setError('You recently reported this user. Please wait before reporting again.');
        } else if (response.status === 404) {
          setError('User not found. They may have already left.');
        } else {
          setError(data.detail || 'Failed to submit report. Please try again.');
        }
        toast.error(error || data.detail || 'Failed to submit report');
      }
    } catch (err) {
      console.error('Report submission error:', err);
      setError('Connection error. Please check your internet and try again.');
      toast.error('Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  // Get severity color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'border-red-500/50 bg-red-500/10';
      case 'high': return 'border-orange-500/50 bg-orange-500/10';
      case 'normal': return 'border-yellow-500/50 bg-yellow-500/10';
      default: return 'border-gray-500/50 bg-gray-500/10';
    }
  };

  // Success state
  if (submitted) {
    return (
      <div className={`report-modal ${isClosing ? 'report-modal--closing' : ''}`} data-testid="report-modal">
        <div className="report-modal__backdrop" />
        <div className="report-modal__container report-modal__container--success">
          <div className="report-modal__success">
            <div className="report-modal__success-icon">
              <CheckCircle size={48} className="text-green-400" />
            </div>
            <h3 className="report-modal__success-title">Report Submitted</h3>
            <p className="report-modal__success-text">
              Thank you for helping keep Raccoon safe. Our team will review this report.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`report-modal ${isClosing ? 'report-modal--closing' : ''}`} data-testid="report-modal">
      {/* Backdrop */}
      <div className="report-modal__backdrop" onClick={handleClose} />
      
      {/* Modal Content */}
      <div className="report-modal__container">
        {/* Header */}
        <div className="report-modal__header">
          <div className="report-modal__header-content">
            <div className="report-modal__header-icon">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="report-modal__title">Report User</h2>
              <p className="report-modal__subtitle">
                Reporting <span className="text-white font-medium">{partner?.username || 'User'}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="report-modal__close"
            disabled={submitting}
            data-testid="close-report-modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="report-modal__body">
          {/* Error message */}
          {error && (
            <div className="report-modal__error">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Reason selection */}
          <div className="report-modal__section">
            <label className="report-modal__label">
              Why are you reporting this user? <span className="text-red-400">*</span>
            </label>
            <div className="report-modal__reasons">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setReason(r.id)}
                  disabled={submitting}
                  className={`report-modal__reason ${
                    reason === r.id 
                      ? 'report-modal__reason--selected' 
                      : ''
                  } ${reason === r.id ? getSeverityColor(r.severity) : ''}`}
                  data-testid={`reason-${r.id}`}
                >
                  <span className="report-modal__reason-icon">{r.icon}</span>
                  <span className="report-modal__reason-label">{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Details field */}
          <div className="report-modal__section">
            <label className="report-modal__label">
              Additional details <span className="text-gray-500">(optional)</span>
            </label>
            <div className="report-modal__textarea-wrapper">
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 500))}
                placeholder="Please provide any additional context that might help our team..."
                className="report-modal__textarea"
                disabled={submitting}
                rows={3}
                data-testid="report-details"
              />
              <span className="report-modal__char-count">
                {details.length}/500
              </span>
            </div>
          </div>

          {/* Privacy note */}
          <p className="report-modal__privacy">
            <Shield size={12} />
            Your report is confidential. The reported user won't know who reported them.
          </p>
        </div>

        {/* Footer */}
        <div className="report-modal__footer">
          <button 
            onClick={handleClose}
            className="report-modal__btn report-modal__btn--cancel"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason || submitting}
            className="report-modal__btn report-modal__btn--submit"
            data-testid="submit-report"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Flag size={16} />
                <span>Submit Report</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
