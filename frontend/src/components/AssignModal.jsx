import React, { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { getMedicalLabs } from '../api';

const AssignModal = ({
    selectedSubmission,
    selectedLab,
    setSelectedLab,
    showLabDropdown,
    setShowLabDropdown,
    handleAssignToLab,
    handleCloseModal
}) => {
    const [labs, setLabs] = useState([]);

    useEffect(() => {
        const fetchLabs = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const data = await getMedicalLabs(token);
                setLabs(data);
            } catch (err) {
                console.error('Error fetching labs:', err);
            }
        };

        fetchLabs();
    }, []);

    return (
        <div className="modal-overlay">
            <div className="modal-container assign-modal">
                <div className="modal-header modal-header-orange">
                    <h3 className="modal-title">Assign to Lab - Patient: {selectedSubmission.patient.name}</h3>
                    <button onClick={handleCloseModal} className="modal-close">
                        <X className="close-icon" />
                    </button>
                </div>
                <div className="modal-body">
                    <div className="modal-content">
                        <h4 className="section-title">Select Lab for Assignment</h4>
                        <div className="dropdown-container">
                            <button
                                onClick={() => setShowLabDropdown(!showLabDropdown)}
                                className="dropdown-button dropdown-button-orange"
                            >
                                <span>{selectedLab ? `Selected: ${selectedLab.name}` : 'Select Lab'}</span>
                                <ChevronDown className={`dropdown-icon ${showLabDropdown ? 'dropdown-icon-rotated' : ''}`} />
                            </button>

                            {showLabDropdown && (
                                <div className="dropdown-menu">
                                    {labs.map((lab) => (
                                        <button
                                            key={lab.id}
                                            onClick={() => {
                                                setSelectedLab(lab);
                                                setShowLabDropdown(false);
                                            }}
                                            className="dropdown-item"
                                        >
                                            <div className="lab-name">{lab.name}</div>
                                            <div className="lab-location">{lab.location}</div>
                                            <div className="lab-specialties">{lab.specialties.join(', ')}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedLab && (
                            <button onClick={handleAssignToLab} className="btn btn-confirm">
                                Confirm Assignment to {selectedLab.name}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssignModal;
