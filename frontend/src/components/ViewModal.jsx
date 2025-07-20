// components/DiagnosisModal.jsx
import React from 'react';
import { X, User, Phone, Mail, MapPin, Shield } from 'lucide-react';

const ViewModal = ({
    selectedSubmission,
    analysis,
    setAnalysis,
    handleAddDiagnosis,
    formatDate,
    handleCloseModal,
    currentDoctor
}) => {
    return (
        <div className="modal-overlay">
            <div className="modal-container modal-large">
                {/* Modal Header */}
                <div className="modal-header modal-header-orange">
                    <h3 className="modal-title">Patient Details - {selectedSubmission.patient.name}</h3>
                    <button onClick={handleCloseModal} className="modal-close">
                        <X className="close-icon" />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="modal-content">
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

                        {/* Consent Information */}
                        <div>
                            <h4 className="section-title">Patient Consent</h4>
                            <div className="consent-container">
                                <div className="consent-item">
                                    <Shield className="consent-icon" />
                                    <span className="consent-label">Treatment:</span>
                                    <span className={`consent-status ${selectedSubmission.consent.treatment ? 'consent-granted' : 'consent-denied'}`}>
                                        {selectedSubmission.consent.treatment ? 'Granted' : 'Not Granted'}
                                    </span>
                                </div>
                                <div className="consent-item">
                                    <Shield className="consent-icon" />
                                    <span className="consent-label">Referral:</span>
                                    <span className={`consent-status ${selectedSubmission.consent.referral ? 'consent-granted' : 'consent-denied'}`}>
                                        {selectedSubmission.consent.referral ? 'Granted' : 'Not Granted'}
                                    </span>
                                </div>
                                <div className="consent-item">
                                    <Shield className="consent-icon" />
                                    <span className="consent-label">Research:</span>
                                    <span className={`consent-status ${selectedSubmission.consent.research ? 'consent-granted' : 'consent-denied'}`}>
                                        {selectedSubmission.consent.research ? 'Granted' : 'Not Granted'}
                                    </span>
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
                        {selectedSubmission.image_path && selectedSubmission.image_path.length > 0 && (
                            <div>
                                <h4 className="section-title">Uploaded Images</h4>
                                <div className="modal-images-grid">
                                    {selectedSubmission.image_path.map((image, index) => (
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
                                    />
                                    <button
                                        onClick={handleAddDiagnosis}
                                        disabled={!analysis.trim()}
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
