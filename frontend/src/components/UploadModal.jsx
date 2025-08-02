// components/UploadModal.jsx
import React from 'react';
import { Upload, X } from 'lucide-react';

const UploadModal = ({ request, onClose, onUpload }) => {
  if (!request) return null;

  return (
    <div className="lab-modal-overlay">
      <div className="lab-modal-container">
        <div className="lab-modal-header lab-modal-header-orange">
          <h3 className="lab-modal-title">
            Upload Test Results - {request.patient.name}
          </h3>
          <button onClick={onClose} className="lab-modal-close">
            <X className="lab-close-icon" />
          </button>
        </div>

        <div className="lab-modal-body">
          <div className="lab-modal-content">
            {/* Test Info */}
            <div className="lab-test-info-card">
              <h4 className="lab-section-title">Test Information</h4>
              <p className="lab-test-info-text">
                <strong>Test Type:</strong> {request.testType}
              </p>
              <p className="lab-test-info-text">
                <strong>Requested by:</strong> {request.doctor.name}
              </p>
              <p className="lab-test-info-text">
                <strong>Patient:</strong> {request.patient.name}
              </p>
            </div>

            {/* Upload Area */}
            <div className="lab-upload-area">
              <div className="lab-upload-icon-container">
                <Upload className="lab-upload-icon" />
              </div>
              <h4 className="lab-upload-title">Upload Test Results</h4>
              <p className="lab-upload-text">
                Click to select files or drag and drop your test result files here
              </p>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="lab-file-input"
              />
            </div>

            {/* Upload Button */}
            <button onClick={onUpload} className="lab-btn lab-btn-confirm-upload">
              <Upload className="lab-btn-icon" />
              Confirm Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
