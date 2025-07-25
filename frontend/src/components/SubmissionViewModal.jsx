import React from 'react'
import { X, FileText, Shield } from 'lucide-react'

const SubmissionViewModal = (
    selectedSymptom
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

                        { /* Test Results Section */ }
                        
                    </div>
                </div>



            </div>
        </div>
    );
};

export default SubmissionViewModal