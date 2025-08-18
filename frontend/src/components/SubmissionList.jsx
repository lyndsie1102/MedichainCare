import { User, Calendar, Eye, UserCheck } from 'lucide-react';

const SubmissionList = ({
    submissions,
    getStatusIcon,
    getStatusColor,
    formatDate,
    handleViewClick,
    handleAssignClick,
    handleReferClick
}) => {
    return (
        <div className="submissions-list">
            {submissions.map((submission) => (
                <div key={submission.id} className="submission-card">
                    <div className="submission-content">
                        <div className="submission-main">
                            <div className="patient-header">
                                <div className="patient-info">
                                    <div className="patient-avatar">
                                        <User className="patient-icon" />
                                    </div>
                                    <div>
                                        <h3 className="patient-name">{submission.patient.name}</h3>
                                        <p className="patient-details">{submission.patient.age} years • {submission.patient.gender}</p>
                                    </div>
                                </div>

                                <div className="status-container">
                                    <span className={getStatusColor(submission.status)}>
                                        {getStatusIcon(submission.status)}
                                        <span className="status-text">{submission.status.replace('_', ' ')}</span>
                                    </span>
                                </div>
                            </div>

                            <div className="symptoms-section">
                                <h4 className="symptoms-title">Symptoms:</h4>
                                <p className="symptoms-text">{submission.symptoms}</p>
                            </div>

                            {submission.image_path && submission.image_path.length > 0 && (
                                <div className="images-section">
                                    <h4 className="images-title">Uploaded Images:</h4>
                                    <div className="images-grid">
                                        {submission.image_path.map((image, index) => (
                                            <img
                                                key={index}
                                                src={image}
                                                alt={`Symptom ${index + 1}`}
                                                className="symptom-image"
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="submission-date">
                                <Calendar className="calendar-icon" />
                                <span>Submitted: {formatDate(submission.submitted_at)}</span>
                            </div>
                        </div>

                        <div className="action-buttons">
                            <button
                                onClick={() => handleViewClick(submission)}
                                className="btn btn-view"
                            >
                                <Eye className="btn-icon" />
                                <span>View</span>
                            </button>
                            <button
                                onClick={() => handleAssignClick(submission)}
                                className="btn btn-assign"
                                disabled={!['Pending', 'Referred'].includes(submission.status)}
                            >
                                Assign
                            </button>
                            <button
                                onClick={() => handleReferClick(submission)}
                                className="btn btn-refer"
                                disabled={submission.status !== 'diagnosed'}
                            >
                                <UserCheck className="btn-icon" />
                                <span>Refer</span>
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SubmissionList;
