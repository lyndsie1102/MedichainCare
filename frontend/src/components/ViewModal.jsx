import React from 'react';
import { X, User, Phone, Mail, MapPin, Shield, Calendar, FileText } from 'lucide-react';

const ViewModal = ({
    selectedSubmission,
    analysis,
    setAnalysis,
    handleAddDiagnosis,
    formatDate,
    handleCloseModal,
    currentDoctor
}) => {
    const isSymptomWaitingTest = selectedSubmission?.status === 'Waiting for Test';
    const consentIsReferralOrResearch = selectedSubmission.consent === 'referral' || selectedSubmission.consent === 'research';
    
    return (
        <div className="modal-overlay">
            <div className="modal-container modal-large">
                {/* Modal Header */}
                <div className="modal-header modal-header-orange">
                    <h3 className="modal-title">Patient Details {selectedSubmission?.patient?.name ? ` - ${selectedSubmission.patient.name}` : ''}</h3>
                    <button onClick={handleCloseModal} className="modal-close">
                        <X className="close-icon" />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="modal-content">

                        {/* Patient Information */}
                        {!consentIsReferralOrResearch && (
                            <div className="patient-details-card">
                                <h4 className="section-title">Patient Information</h4>
                                <div className="patient-info-list">
                                    <div className="info-item">
                                        <User className="info-icon" />
                                        <span className="info-text">Age: {selectedSubmission.patient.age} • {selectedSubmission.patient.gender}</span>
                                    </div>
                                    <div className="info-item">
                                        <Phone className="info-icon" />
                                        <span className="info-text">{selectedSubmission.patient.phone}</span>
                                    </div>
                                    <div className="info-item">
                                        <Mail className="info-icon" />
                                        <span className="info-text">{selectedSubmission.patient.email}</span>
                                    </div>
                                    <div className="info-item">
                                        <MapPin className="info-icon" />
                                        <span className="info-text">{selectedSubmission.patient.address}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Consent Information */}
                        <div>
                            <h4 className="section-title">Patient Consent</h4>
                            <div className="consent-container">
                                <div className="consent-item">
                                    <Shield className="consent-icon" />
                                    <span className="consent-label">Consent: {selectedSubmission.consent}</span>
                                </div>
                            </div>
                        </div>

                        {/* Symptoms */}
                        <div>
                            <h4 className="section-title">Reported Symptoms</h4>
                            <div className="symptoms-card">
                                <p className="symptoms-detail">{selectedSubmission.symptoms}</p>
                            </div>
                        </div>

                        {/* Images */}
                        {selectedSubmission.images && selectedSubmission.images.length > 0 && (
                            <div>
                                <h4 className="section-title">Uploaded Images</h4>
                                <div className="modal-images-grid">
                                    {selectedSubmission.images.map((image, index) => (
                                        <img
                                            key={index}
                                            src={`http://localhost:8000/${image}`}
                                            alt={`Symptom ${index + 1}`}
                                            className="modal-image"
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Test Results Section */}
                        {selectedSubmission.testResults && selectedSubmission.testResults.length > 0 && (
                            <div>
                                <h4 className="section-title">Test Results</h4>
                                <div className="test-results-card">
                                    <h5 className="test-results-type">{selectedSubmission.testType}</h5>
                                    <p className="test-results-date">
                                        <Calendar className="test-results-icon" />
                                        Results uploaded: {formatDate(selectedSubmission.testResults[0].uploadedAt)}
                                    </p>
                                    <div className="test-results-summary">
                                        <h6 className="test-results-summary-title">Summary:</h6>
                                        <p className="test-results-summary-text">{selectedSubmission.testResults[0].summary ? 
                                        selectedSubmission.testResults[0].summary : 'N/A'}</p>
                                    </div>
                                    {selectedSubmission.testResults.map((testResult, index) => (
                                        <div key={index} className="test-results">
                                            <div className="test-results-header">
                                                <div className="test-results-info"></div>
                                            </div>
                                            <div className="test-results-files">
                                                <div className="test-results-files-list">
                                                    {testResult.files.map((file, fileIndex) => (
                                                        <div key={fileIndex} className="test-results-file">
                                                            <FileText className="test-results-file-icon" />
                                                            <div className="test-results-file-info">
                                                                <span className="test-results-file-name">{file.name}</span>
                                                                {/* Open the file in a new tab */}
                                                                <a
                                                                    href={`http://localhost:8000/${file.path}`}
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

                        {/* Doctor Diagnoses */}
                        <div>
                            <h4 className="section-title">Doctor Diagnoses</h4>
                            <div className="diagnoses-list">
                                {selectedSubmission.diagnoses.map((diagnosis) => (
                                    <div key={diagnosis.id} className="diagnosis-card">
                                        <div className="diagnosis-header">
                                            <h5 className="diagnosis-doctor">{diagnosis.doctorName}</h5>
                                            <span className="diagnosis-date">{formatDate(diagnosis.createdAt)}</span>
                                        </div>
                                        <p className="diagnosis-text">{diagnosis.analysis}</p>
                                    </div>
                                ))}

                                {/* New Diagnosis Section */}
                                <div className="new-diagnosis-card">
                                    <h5 className="new-diagnosis-title">
                                        Add New Diagnosis - Dr. {currentDoctor?.name || 'Unknown'}
                                    </h5>
                                    <textarea
                                        value={analysis}
                                        onChange={(e) => setAnalysis(e.target.value)}
                                        placeholder="Enter your diagnosis and recommendations..."
                                        className="diagnosis-textarea"
                                        disabled={isSymptomWaitingTest} // Disable the textarea if symptom is not tested
                                    />
                                    <button
                                        onClick={handleAddDiagnosis}
                                        disabled={!analysis.trim() || isSymptomWaitingTest} // Disable the button if analysis is empty or symptom is not tested
                                        className="btn btn-add-diagnosis"
                                    >
                                        Add Diagnosis
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewModal;
