import React, { useEffect, useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { getAllDoctors } from '../api';

const ReferModal = ({
    selectedSubmission,
    selectedDoctor,
    setSelectedDoctor,
    showDoctorDropdown,
    setShowDoctorDropdown,
    handleReferToDoctor,
    handleCloseModal
}) => {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const fetchedDoctors = await getAllDoctors(token);
                setDoctors(fetchedDoctors);
            } catch (err) {
                console.error('Failed to fetch doctors:', err);
                setError('Could not load doctors');
            } finally {
                setLoading(false);
            }
        };

        fetchDoctors();
    }, []);

    return (
        <div className="modal-overlay">
            <div className="modal-container">
                <div className="modal-header modal-header-blue">
                    <h3 className="modal-title">Refer Patient - {selectedSubmission.patient.name}</h3>
                    <button onClick={handleCloseModal} className="modal-close">
                        <X className="close-icon" />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="modal-content">
                        <div className="patient-summary-card">
                            <h4 className="section-title">Patient Summary</h4>
                            <p className="summary-text">{selectedSubmission.patient.name}, {selectedSubmission.patient.age} years old</p>
                            <p className="summary-symptoms">Symptoms: {selectedSubmission.symptoms.substring(0, 100)}...</p>
                        </div>

                        <div>
                            <h4 className="section-title">Select Doctor for Referral</h4>
                            <div className="dropdown-container">
                                <button
                                    onClick={() => setShowDoctorDropdown(!showDoctorDropdown)}
                                    className="dropdown-button dropdown-button-blue"
                                >
                                    <span>{selectedDoctor ? `Refer to ${selectedDoctor.name}` : 'Select Doctor'}</span>
                                    <ChevronDown className={`dropdown-icon ${showDoctorDropdown ? 'dropdown-icon-rotated' : ''}`} />
                                </button>

                                {showDoctorDropdown && (
                                    <div className="dropdown-menu">
                                        {loading && <div className="dropdown-item">Loading doctors...</div>}
                                        {error && <div className="dropdown-item error">{error}</div>}
                                        {!loading && !error && doctors.map((doctor) => (
                                            <button
                                                key={doctor.id}
                                                onClick={() => {
                                                    setSelectedDoctor(doctor);
                                                    setShowDoctorDropdown(false);
                                                }}
                                                className="dropdown-item"
                                            >
                                                <div className="doctor-name">{doctor.name}</div>
                                                <div className="doctor-specialty">{doctor.specialty}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedDoctor && (
                            <button onClick={handleReferToDoctor} className="btn btn-confirm">
                                Confirm Referral to {selectedDoctor.name}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReferModal;
