import React from 'react'
import { X, FileText, Shield } from 'lucide-react'

const SubmissionViewModal = (
    selectedSymptom,
    formatDate,
    handleCloseModal
) => {
    return (
        <div className="modal-overlay">
            <div className="modal-container modal-large">
                { /* Modal Header */}
                <div className="modal-header modal-header-orange">
                    <div className="title">
                        <h3 className="modal-title">Symptom Record Details</h3>
                        <p className="modal-subtitle">Submitted at {selectedSymptom.submitted_at}</p>
                    </div>
                    <button onClick={handleCloseModal} className="modal-close">
                        <X className="close-icon" />
                    </button>
                </div>


                { /* Modal body */}
                <div className="modal-body">
                    <div className="modal-content">

                        {/* Consent Information */}
                        <div>
                            <h4 className="section-title">Consent</h4>
                            <div className="consent-container">
                                <div className="consent-item">
                                    <Shield className="consent-icon" />
                                    <span className="consent-label">Treatment:</span>
                                    <span className={`consent-status ${selectedSymptom.consent.treatment ? 'consent-granted' : 'consent-denied'}`}>
                                        {selectedSymptom.consent.treatment ? 'Granted' : 'Not Granted'}
                                    </span>
                                </div>
                                <div className="consent-item">
                                    <Shield className="consent-icon" />
                                    <span className="consent-label">Referral:</span>
                                    <span className={`consent-status ${selectedSymptom.consent.referral ? 'consent-granted' : 'consent-denied'}`}>
                                        {selectedSymptom.consent.referral ? 'Granted' : 'Not Granted'}
                                    </span>
                                </div>
                                <div className="consent-item">
                                    <Shield className="consent-icon" />
                                    <span className="consent-label">Research:</span>
                                    <span className={`consent-status ${selectedSymptom.consent.research ? 'consent-granted' : 'consent-denied'}`}>
                                        {selectedSymptom.consent.research ? 'Granted' : 'Not Granted'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        { /* Symptom description */}
                        <div>
                            <h4 className="section-title">Symptom Description</h4>
                            <div className="symptoms-card">
                                <p className="symptoms-details">{selectedSymptom.symptoms}</p>
                            </div>
                        </div>

                        { /* Images */}
                        {selectedSymptom.image_path && selectedSymptom.image_path.length > 0 && (
                            <div>
                                <h4 className="section-title">Uploaded Images</h4>
                                <div className="modal-images-grid">
                                    {selectedSymptom.image_path.map((image, index) => (
                                        <img
                                            key={index}
                                            src={image}
                                            alt={`Symptom ${index + 1}`}
                                            className="modal-image"
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        { /* Test Results Section */}
                        {selectedSymptom.testResults && selectedSymptom.testResults.length > 0 && (
                            <div>
                                <h4 className="section-title">Test Results</h4>
                                <div className="test-results-card">
                                    {selectedSymptom.testResults.map((testResult, index) => (
                                        <div key={index} className="test-results">
                                            <div className="test-results-header">
                                                <div className="test-results-info">
                                                    <h5 className="test-results-type">{selectedSymptom.testType?.name}</h5>
                                                    <p className="test-results-date">
                                                        <Calendar className="test-results-icon" />
                                                        Results uploaded: {formatDate(testResult.uploadedAt)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="test-results-summary">
                                                <h6 className="test-results-summary-title">Summary:</h6>
                                                <p className="test-results-summary-text">{testResult.summary}</p>
                                            </div>

                                            <div className="test-results-files">
                                                <h6 className="test-results-files-title">Attached Files:</h6>
                                                <div className="test-results-files-list">
                                                    {testResult.files.map((file, fileIndex) => (
                                                        <div key={fileIndex} className="test-results-file">
                                                            <FileText className="test-results-file-icon" />
                                                            <div className="test-results-file-info">
                                                                <span className="test-results-file-name">{file.name}</span>
                                                                <span className="test-results-file-type">{file.type}</span>

                                                                {/* Open the file in a new tab */}
                                                                <a
                                                                    href={file.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="file-preview-button"
                                                                >
                                                                    View
                                                                </a>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        { /* Doctor Diagnosis */}
                        <div>
                            <h4 className="section-title">Doctor Diagnoses</h4>
                            <div className="diagnosis-list">
                                {selectedSymptom.diagnoses.map((diagnosis) => (
                                    <div key={diagnosis.id} className="diagnosis-card">
                                        <div className="diagnosis-header">
                                            <h5 className="diagnosis-doctor">{diagnosis.doctorName}</h5>
                                            <span className="diagnosis-date">{formatDate(diagnosis.createdAt)}</span>
                                        </div>
                                        <p className="diagnosis-text">{diagnosis.analysis}</p>
                                    </div>
                                ))}

                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubmissionViewModal