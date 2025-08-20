import { User, TestTube, Clock, Calendar, CalendarDays, X } from 'lucide-react';

const ScheduleAppointmentModal = ({
  selectedRequest,
  selectedDateTime,
  setSelectedDateTime,
  isModifyingAppointment,
  handleCloseModal,
  handleCancelAppointment,
  handleConfirmAppointment
}) => {
  return (
    <div className="lab-modal-overlay">
      <div className="lab-modal-container lab-modal-large">
        <div className="lab-modal-header lab-modal-header-orange">
          <h3 className="lab-modal-title">
            {isModifyingAppointment ? 'Cancel' : 'Schedule'} Appointment for {selectedRequest.patient_name}
          </h3>
          <button onClick={handleCloseModal} className="lab-modal-close">
            <X className="lab-close-icon" />
          </button>
        </div>

        <div className="lab-modal-body">
          <div className="lab-modal-content">
            {/* Patient and Test Info */}
            <div className="lab-appointment-info-card">
              <h4 className="lab-section-title">Appointment Details</h4>
              <div className="lab-appointment-info-grid">
                <div className="lab-appointment-info-item">
                  <User className="lab-info-icon" />
                  <span><strong>Patient:</strong> {selectedRequest.patient_name}</span>
                </div>
                <div className="lab-appointment-info-item">
                  <TestTube className="lab-info-icon" />
                  <span><strong>Test:</strong> {selectedRequest.test_type}</span>
                </div>
                <div className="lab-appointment-info-item">
                  <Clock className="lab-info-icon" />
                  <span><strong>Status:</strong> {selectedRequest.status}</span>
                </div>
              </div>
            </div>

            {/* Date and Time Picker */}
            <div className="lab-date-picker-section">
              <h4 className="lab-section-title">Select date and time for appointment</h4>
              <div className="lab-datetime-picker-container">
                <label className="lab-picker-label">Date & Time:</label>
                <input
                  type="datetime-local"
                  value={selectedDateTime}
                  onChange={(e) => setSelectedDateTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="lab-datetime-input"
                />
              </div>
            </div>

            {/* Selected Appointment Summary */}
            {selectedDateTime && (
              <div className="lab-appointment-summary">
                <h4 className="lab-section-title">Selected Appointment</h4>
                <div className="lab-appointment-summary-card">
                  <div className="lab-appointment-summary-item">
                    <Calendar className="lab-appointment-summary-icon" />
                    <span><strong>Date:</strong> {selectedDateTime.split('T')[0]}</span>
                  </div>
                  <div className="lab-appointment-summary-item">
                    <Clock className="lab-appointment-summary-icon" />
                    <span><strong>Time:</strong> {
                      new Date(selectedDateTime).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit', 
                        hour12: true 
                      })
                    }</span>
                  </div>
                  <div className="lab-appointment-summary-item">
                    <User className="lab-appointment-summary-icon" />
                    <span><strong>Patient:</strong> {selectedRequest.patient_name}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="lab-modal-actions">
              <button onClick={handleCloseModal} className="lab-btn lab-btn-cancel">
                Cancel
              </button>
              {isModifyingAppointment ? (
                <button onClick={handleCancelAppointment} className="lab-btn lab-btn-cancel-appointment">
                  <X className="lab-btn-icon" />
                  Cancel Appointment
                </button>
              ) : (
                <button
                  onClick={handleConfirmAppointment}
                  disabled={!selectedDateTime}
                  className="lab-btn lab-btn-confirm-appointment"
                >
                  <CalendarDays className="lab-btn-icon" />
                  Confirm Appointment
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleAppointmentModal;
