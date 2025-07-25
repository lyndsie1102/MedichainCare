import React from 'react';
import { Calendar, Camera, Clock, CheckCircle, AlertCircle, BadgeCheck, Eye } from 'lucide-react';

const getStatusClass = (status) => {
  switch (status) {
    case 'Pending': return 'status pending';
    case 'Diagnosed': return 'status reviewed';
    case 'Under Review': return 'status inprogress';
    case 'Completed': return 'status completed';
    default: return 'status';
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'Pending': return <Clock size={16} />;
    case 'Diagnosed': return <CheckCircle size={16} />;
    case 'Under Review': return <AlertCircle size={16} />;
    case 'Completed': return <BadgeCheck size={16} />;
    default: return <Clock size={16} />;
  }
};


const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};


const SubmissionHistory = ({ submissions, handleViewClick }) => {
  return (
    <section className="history-section">
      <h2>Submission History</h2>
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
                <div className={getStatusClass(s.status)}>
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
