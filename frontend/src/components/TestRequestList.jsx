// components/TestRequestList.jsx
import React from 'react';
import { Upload, Calendar, Phone, Mail, MapPin, User, CalendarDays } from 'lucide-react';
import { getStatusColor, getStatusIcon } from '../utils/Helpers'; // Assuming these functions are defined in utils/statusUtils.js



const TestRequestList = ({ filteredRequests, handleUploadClick, handleScheduleClick }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="lab-requests-list">
      {filteredRequests.map((request) => (
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
                      <span>{formatDate(request.request_time)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Test Information */}
              <div className="lab-test-info">
                <h4 className="lab-test-type">{request.test_type}</h4>
              </div>

              {/* Patient Information */}
              <div className="lab-patient-info">
                <h4 className="lab-patient-header">
                  Patient: {request.patient.name}, {request.patient.age} years
                </h4>
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
                onClick={() => handleScheduleClick(request)}
                className="lab-schedule-btn"
              >
                <CalendarDays className="lab-btn-icon" />
                Schedule
              </button>
              <button
                onClick={() => handleUploadClick(request)}
                disabled={request.status === 'Uploaded'}
                className={`lab-upload-btn ${request.status === 'Uploaded' ? 'lab-upload-btn-disabled' : ''}`}
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
