import React, { useState, useEffect } from 'react';
import { Calendar, Camera, Clock, CheckCircle, AlertCircle, BadgeCheck, Eye, ArrowRight } from 'lucide-react';

// Updated getStatusIcon to include the new status "Referred" and respective class names
const getStatusIcon = (status) => {
  switch (status) {
    case 'Pending':
      return <Clock className="status-icon status-icon-pending" />;
    case 'Under Review':
      return <AlertCircle className="status-icon status-icon-review" />;
    case 'Diagnosed':
      return <CheckCircle className="status-icon status-icon-diagnosed" />;
    case 'Completed':
      return <BadgeCheck className="status-icon status-icon-completed" />;
    case 'Referred':
      return <ArrowRight className="status-icon status-icon-referred" />;
    default:
      return <Clock className="status-icon status-icon-gray" />;
  }
};

// Updated getStatusColor to apply different color classes based on the status
const getStatusColor = (status) => {
  switch (status) {
    case 'Pending':
      return 'status-badge status-badge-pending';
    case 'Under Review':
      return 'status-badge status-badge-review';
    case 'Diagnosed':
      return 'status-badge status-badge-diagnosed';
    case 'Completed':
      return 'status-badge status-badge-completed';
    case 'Referred':
      return 'status-badge status-badge-referred';
    default:
      return 'status-badge status-badge-gray';
  }
};

// Format the date and time into a human-readable format
const formatDate = (dateString) => {
  if (!dateString.endsWith('Z')) {
    dateString += 'Z';
  }
  const utcDate = new Date(dateString);  // Parse the date string in UTC
  const options = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone  // Use the browser's local time zone, which takes DST into account
  };

  // Format the date in the user's local time zone (with DST adjustments)
  return new Intl.DateTimeFormat('en-US', options).format(utcDate);
};



const SubmissionHistory = ({ submissions, handleViewClick, fetchFilteredSubmissions }) => {
  // States for filter/search
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Trigger search every time a filter changes
  useEffect(() => {
    const start = startDate ? new Date(startDate).toISOString().split('T')[0] : '';
    const end = endDate ? new Date(endDate).toISOString().split('T')[0] : '';
    fetchFilteredSubmissions({ status: statusFilter, startDate: start, endDate: end });
  }, [statusFilter, startDate, endDate, fetchFilteredSubmissions]);


  return (
    <section className="history-section">
      <h2>Submission History</h2>

      {/* Filter section */}
      <div className="filter-section">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All</option>
          <option value="Pending">Pending</option>
          <option value="Under Review">Under Review</option>
          <option value="Diagnosed">Diagnosed</option>
          <option value="Completed">Completed</option>
          <option value="Referred">Referred</option>
        </select>

        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

      </div>

      {submissions.length === 0 ? (
        <p>No submissions yet. Submit your symptoms above!</p>
      ) : (
        submissions.map((s) => (
          <div key={s.id} className="submission-card">
            <div className="submission-header">
              <div className="date-time">
                <Calendar size={16} />
                <span>{formatDate(s.submitted_at)}</span>
                {s.images && s.images.length > 0 && (
                  <div className="image-tag"><Camera size={14} /> Image attached</div>
                )}
              </div>
              <div className="status-action">
                <div className={getStatusColor(s.status)}>
                  {getStatusIcon(s.status)} <span>{s.status}</span>
                </div>
                <button
                  onClick={() => handleViewClick(s)}
                  className="btn btn-view"
                >
                  <Eye className="btn-icon" />
                  <span>View</span>
                </button>
              </div>
            </div>
            <p>{s.symptoms}</p>
          </div>
        ))
      )}
    </section>
  );
};

export default SubmissionHistory;
