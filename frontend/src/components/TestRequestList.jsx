// components/TestRequestList.js
import React from 'react';
import {
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Upload,
  Clock,
  CheckCircle,
} from 'lucide-react';

const getStatusIcon = (status) => {
  switch (status) {
    case 'pending':
      return <Clock className="status-icon status-icon-red" />;
    case 'uploaded':
      return <CheckCircle className="status-icon status-icon-green" />;
    default:
      return <Clock className="status-icon status-icon-gray" />;
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'pending':
      return 'status-badge status-badge-red';
    case 'uploaded':
      return 'status-badge status-badge-green';
    default:
      return 'status-badge status-badge-gray';
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

const TestRequestList = ({ requests, onUploadClick }) => {
  if (!requests.length) {
    return (
      <div className="lab-empty-state">
        <div className="lab-empty-icon">
          <Clock className="lab-empty-search-icon" />
        </div>
        <h3 className="lab-empty-title">No test requests found</h3>
        <p className="lab-empty-text">Try adjusting your search or filter criteria.</p>
      </div>
    );
  }

  return (
    <div className="lab-requests-list">
      {requests.map((request) => (
        <div key={request.id} className="lab-request-card">
          <div className="lab-request-content">
            <div className="lab-request-main">
              {/* Header with Doctor and Status */}
              <div className="lab-card-header">
                <div className="lab-doctor-section">
                  <div className="lab-doctor-avatar">
                    <User className="lab-doctor-icon" />
                  </div>
                  <div className="lab-doctor-details">
                    <h3 className="lab-doctor-name">{request.doctor.name}</h3>
                    <p className="lab-doctor-specialty">{request.doctor.specialty}</p>
                    <div className="lab-request-time">
                      <Calendar className="lab-calendar-icon" />
                      <span>{formatDate(request.requestTime)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Test Information */}
              <div className="lab-test-info">
                <h4 className="lab-test-type">{request.testType}</h4>
              </div>

              {/* Patient Information */}
              <div className="lab-patient-info">
                <h4 className="lab-patient-header">Patient: {request.patient.name}, {request.patient.age} years</h4>
                <div className="lab-patient-contact">
                  <span className="lab-contact-item">
                    <Phone className="lab-contact-icon" />
                    {request.patient.phone}
                  </span>
                  <span className="lab-contact-item">
                    <Mail className="lab-contact-icon" />
                    {request.patient.email}
                  </span>
                  <span className="lab-contact-item">
                    <MapPin className="lab-contact-icon" />
                    {request.patient.location}
                  </span>
                </div>
              </div>
            </div>

            {/* Status and Action */}
            <div className="lab-status-action">
              <div className="lab-status-badge-container">
                <span className={getStatusColor(request.status)}>
                  {getStatusIcon(request.status)}
                  <span className="lab-status-text">{request.status}</span>
                </span>
              </div>
              <button
                onClick={() => onUploadClick(request)}
                disabled={request.status === 'uploaded'}
                className={`lab-upload-btn ${request.status === 'uploaded' ? 'lab-upload-btn-disabled' : ''}`}
              >
                <Upload className="lab-btn-icon" />
                Upload Results
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TestRequestList;
