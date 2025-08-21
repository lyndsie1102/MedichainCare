import { Upload, X } from 'lucide-react';

const UploadResultsModal = ({ selectedRequest, onClose, onUpload, files,
    resultSummary, handleSummaryChange, summaryError, onFileChange }) => {
    return (
        <div className="modal-overlay">
            <div className="modal-container modal-large">
                <div className="modal-header modal-header-orange">
                    <h3 className="modal-title">Upload Test Results - {selectedRequest.patient_name}</h3>
                    <button onClick={onClose} className="modal-close">
                        <X className="lab-close-icon" />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="modal-content">
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
                                onChange={onFileChange}
                            />
                        </div>

                        {/* Summary Section */}
                        <div className="lab-summary-section">
                            <h4 className="lab-section-title">Test Result Summary</h4>
                            <div className="lab-summary-container">
                                <textarea
                                    value={resultSummary}
                                    onChange={handleSummaryChange}
                                    placeholder="Add a brief description of the test results (optional)"
                                    className="lab-summary-textarea"
                                    rows="4"
                                />
                                <div className="lab-summary-footer">
                                    <span className={`lab-character-count ${resultSummary.length > 450 ? 'lab-character-warning' : ''}`}>
                                        {resultSummary.length}/500 characters
                                    </span>
                                    {summaryError && (
                                        <span className="lab-summary-error">{summaryError}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Upload Button */}
                        <button
                            onClick={onUpload}
                            className="lab-btn lab-btn-confirm-upload"
                        >
                            <Upload className="lab-btn-icon" />
                            Confirm Upload
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UploadResultsModal;
