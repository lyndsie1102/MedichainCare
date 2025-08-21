import { Upload, Calendar, X, Clock, User, CalendarDays } from 'lucide-react';
import { getRequestStatusColor, getRequestStatusIcon, formatDate } from '../utils/Helpers'; // Assuming these functions are defined in utils/statusUtils.js



const TestRequestList = ({ filteredRequests, handleUploadClick, handleScheduleClick }) => {

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
                    <div className="lab-doctor-time-status">
                      <h3 className="lab-doctor-name">{request.doctor.name}</h3>
                      <div className="lab-status-badge-container">
                        <span className={getRequestStatusColor(request.status)}>
                          {getRequestStatusIcon(request.status)}
                          <span className="status-text">{request.status}</span>
                        </span>
                      </div>
                    </div>

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
                  Patient: {request.patient_name}, {request.patient_age} years
                </h4>
              </div>


              {/* Appointment Schedule Section */}
              <div className="lab-appointment-schedule">
                <div className="lab-appointment-schedule-header">
                  <span className="lab-appointment-label">Appointment Schedule</span>
                  <div className="lab-appointment-details">
                    {request.appointment_status === 'Scheduled' && request.appointment_schedule ? (
                      <span className="lab-appointment-scheduled">
                        <Calendar className="lab-appointment-icon" />
                        {new Date(request.appointment_schedule).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })} at {request.appointment_schedule.split('T')[1]?.substring(0, 5)}
                      </span>
                    ) : request.appointment_status === 'Cancelled' ? (
                      <span className="lab-appointment-cancelled">
                        <X className="lab-appointment-icon" />
                        Cancelled
                      </span>
                    ) : (
                      <span className="lab-appointment-not-confirmed">
                        <Clock className="lab-appointment-icon" />
                        Not confirmed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Status and Action */}
            <div className="lab-status-action">

              {/* Schedule Button */}
              <div className="lab-action-buttons">
                <button
                  onClick={() => handleScheduleClick(request)}
                  disabled={request.status === 'Uploaded'} // Disable when status is 'Uploaded'
                  className={`lab-schedule-btn ${request.status === 'Uploaded' ? 'lab-schedule-btn-disabled' : ''}`}
                >
                  <CalendarDays className="lab-btn-icon" />
                  {request.appointment_status === 'Scheduled' ? 'Cancel Appointment' : 'Schedule'}
                </button>

                {/* Upload Button */}
                <button
                  onClick={() => handleUploadClick(request)}
                  disabled={request.status === 'Uploaded' || request.appointment_status == null || request.appointment_status == 'Cancelled'}
                  className={`lab-upload-btn ${(request.status === 'Uploaded' || request.appointment_status == null || request.appointment_status == 'Cancelled')? 'lab-upload-btn-disabled' : ''}`}
                >
                  <Upload className="lab-btn-icon" />
                  Upload Results
                </button>
              </div>
            </div>
          </div>
        </div>
      ))

      }
    </div >
  );
};

export default TestRequestList;
