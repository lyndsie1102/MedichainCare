import React from 'react';
import { Calendar, Camera, Clock, CheckCircle, AlertCircle, BadgeCheck } from 'lucide-react';

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

const SubmissionHistory = ({ submissions }) => (
  <section className="history-section">
    <h2>Submission History</h2>
    {submissions.map((s) => (
      <div key={s.id} className="submission-card">
        <div className="submission-header">
          <div className="date-time">
            <Calendar size={16} />
            <span>{s.date} at {s.time}</span>
            {s.hasImage && (
              <div className="image-tag"><Camera size={14} /> Image attached</div>
            )}
          </div>
          <div className={getStatusClass(s.status)}>
            {getStatusIcon(s.status)} <span>{s.status}</span>
          </div>
        </div>
        <p>{s.symptoms}</p>
      </div>
    ))}
  </section>
);

export default SubmissionHistory;
