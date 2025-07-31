import React, { useState, useEffect } from 'react';
import {
    Heart,
    Stethoscope,
    Clock,
    AlertCircle,
    CheckCircle,
    BadgeCheck,
    Search,
    Filter,
    ArrowRight
} from 'lucide-react';
import '../DoctorDashboard.css';
import AssignModal from '../components/AssignModal';
import ReferModal from '../components/ReferModal';
import SubmissionList from '../components/SubmissionList';
import ViewModal from '../components/ViewModal';
import { getDoctorDashboard, getDoctorDetails, getSymptomDetails, createDiagnosis, createReferral } from '../api';


const DoctorDashboard = () => {
    const [submissions, setSubmissions] = useState([]);
    const [doctorInfo, setDoctorInfo] = useState(null);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [modalType, setModalType] = useState(null);
    const [analysis, setAnalysis] = useState('');
    const [showLabDropdown, setShowLabDropdown] = useState(false);
    const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
    const [selectedLab, setSelectedLab] = useState(null);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const data = await getDoctorDashboard(token, statusFilter, searchTerm);
                setSubmissions(data);
            } catch (err) {
                console.error('Error fetching doctor dashboard:', err);
            }
        };

        fetchDashboard();
    }, [statusFilter, searchTerm]);

    useEffect(() => {
        const fetchDoctor = async () => {
            try {
                const token = localStorage.getItem('access_token'); // or however you store it
                const doctor = await getDoctorDetails(token);
                setDoctorInfo(doctor);
            } catch (error) {
                console.error('Failed to fetch doctor info:', error);
            }
        };

        fetchDoctor();
    }, []);



    const getStatusIcon = (status) => {
        switch (status) {
            case 'Pending':
                return <Clock className="status-icon status-icon-pending" />;
            case 'Under Review':
                return <AlertCircle className="status-icon status-icon-review" />;
            case 'Diagnosed':
                return <CheckCircle className="status-icon status-icon-diagnosed" />;
            case 'Completed':
                return <BadgeCheck className="status-icon status-icon-completed" />;
            case 'Referred':
                return <ArrowRight className="status-icon status-icon-referred" />;
            default:
                return <Clock className="status-icon status-icon-gray" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending':
                return 'status-badge status-badge-pending';
            case 'Under Review':
                return 'status-badge status-badge-review';
            case 'Diagnosed':
                return 'status-badge status-badge-diagnosed';
            case 'Completed':
                return 'status-badge status-badge-completed';
            case 'Referred':
                return 'status-badge status-badge-referred';
            default:
                return 'status-badge status-badge-gray';
        }
    };

    const handleViewClick = async (submission) => {
        try {
            const token = localStorage.getItem('access_token');
            const data = await getSymptomDetails(submission.id, token);
            setSelectedSubmission(data);
            setModalType('view');
        } catch (err) {
            console.error('Failed to fetch symptom details:', err);
        }
    };


    const handleAssignClick = (submission) => {
        setSelectedSubmission(submission);
        setModalType('assign');
        setAnalysis('');
        setSelectedLab(null);
        setShowLabDropdown(false);
    };

    const handleReferClick = (submission) => {
        setSelectedSubmission(submission);
        setModalType('refer');
        setSelectedDoctor(null);
        setShowDoctorDropdown(false);
    };

    const handleCloseModal = () => {
        setModalType(null);
        setSelectedSubmission(null);
        setAnalysis('');
        setSelectedLab(null);
        setSelectedDoctor(null);
        setShowLabDropdown(false);
        setShowDoctorDropdown(false);
    };

    const handleAssignToLab = () => {
        if (selectedLab && selectedSubmission) {
            setSubmissions(prev =>
                prev.map(sub =>
                    sub.id === selectedSubmission.id
                        ? { ...sub, status: 'under_review' }
                        : sub
                )
            );

            alert(`Successfully assigned to ${selectedLab.name}`);
            handleCloseModal();
        }
    };

    const handleReferToDoctor = async () => {
        if (!selectedDoctor || !selectedSubmission) return;

        const token = localStorage.getItem('access_token');

        try {
            await createReferral(
                token,
                selectedSubmission.id, // this is the symptom_id
                selectedDoctor.id      // this is referral_doctor_id
            );

            // Update the submission status in the UI
            setSubmissions(prev =>
                prev.map(sub =>
                    sub.id === selectedSubmission.id
                        ? { ...sub, status: 'Referred' }
                        : sub
                )
            );

            alert(`Successfully referred to Dr. ${selectedDoctor.name}`);
            handleCloseModal();
        } catch (error) {
            console.error('Failed to refer:', error);
            alert('Referral failed. Please try again.');
        }
    };


    const handleAddDiagnosis = async () => {
        if (!analysis.trim() || !selectedSubmission) return;

        try {
            const token = localStorage.getItem('access_token');

            // Prepare data to send to backend
            const payload = {
                symptom_id: selectedSubmission.id,
                patient_id: selectedSubmission.patient.id,
                diagnosis_content: analysis.trim()
            };

            // Send to API
            const response = await createDiagnosis(payload, token);
            const newDiagnosis = response.diagnosis;

            // Update submission list
            setSubmissions(prev =>
                prev.map(sub =>
                    sub.id === selectedSubmission.id
                        ? {
                            ...sub,
                            diagnoses: [...sub.diagnoses, newDiagnosis],
                            status: 'diagnosed'
                        }
                        : sub
                )
            );

            // Update selected submission
            setSelectedSubmission(prev =>
                prev
                    ? {
                        ...prev,
                        diagnoses: [...prev.diagnoses, newDiagnosis],
                        status: 'diagnosed'
                    }
                    : null
            );

            setAnalysis('');
        } catch (error) {
            console.error('Failed to create diagnosis:', error);
            // Optional: show error message to user
        }
    };

    const filteredSubmissions = submissions.filter(submission => {
        const patientName = submission?.patient?.name?.toLowerCase() || '';
        const symptoms = submission?.symptoms?.toLowerCase() || '';
        const matchesSearch = patientName.includes(searchTerm.toLowerCase()) || symptoms.includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' ||
            submission.status?.toLowerCase() === statusFilter.toLowerCase();

        return matchesSearch && matchesStatus;
    });


    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="dashboard-container">
            {/* Header */}
            <header className="header">
                <div className="logo">
                    <Heart size={40} className="icon-heart" />
                    <div>
                        <h1>HealthCare Portal</h1>
                        <p>Doctor Dashboard</p>
                    </div>
                </div>
                {/* User Info */}
                <div className="user-info">
                    <div className="user-icon-doctor">
                        <Stethoscope className="stethoscope-icon" />
                    </div>
                    <div className="user-details-doctor">
                        <p className="user-name">
                            {doctorInfo ? `Dr. ${doctorInfo.name}` : 'Loading...'}
                        </p>
                        <p className="user-specialty">
                            {doctorInfo ? doctorInfo.specialty : ''}
                        </p>
                    </div>
                </div>
            </header >

            {/* Main Content */}
            < main className="main-content-doctor" >
                {/* Page Title and Filters */}
                < div className="page-header" >
                    <h2 className="page-title">Patient Symptom Submissions</h2>

                    <div className="filters-container">
                        {/* Search */}
                        <div className="search-container">
                            <Search className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search patients or symptoms..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="filter-container">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="status-filter"
                            >
                                <option value="all">All Status</option>
                                <option value="Pending">Pending</option>
                                <option value="Under Review">Under Review</option>
                                <option value="Diagnosed">Diagnosed</option>
                                <option value="Referred">Referred</option>
                                <option value="Completed">Completed</option>
                            </select>
                            <Filter className="filter-icon" />
                        </div>
                    </div>
                </div >

                {/* Submissions List */}
                {filteredSubmissions.length > 0 ? (
                    <SubmissionList
                        submissions={filteredSubmissions}
                        getStatusIcon={getStatusIcon}
                        getStatusColor={getStatusColor}
                        formatDate={formatDate}
                        handleViewClick={handleViewClick}
                        handleAssignClick={handleAssignClick}
                        handleReferClick={handleReferClick}
                    />
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <Search className="empty-search-icon" />
                        </div>
                        <h3 className="empty-title">No submissions found</h3>
                        <p className="empty-text">Try adjusting your search or filter criteria.</p>
                    </div>
                )}
            </main >

            {/* View Modal */}
            {modalType === 'view' && selectedSubmission && (
                <ViewModal
                    selectedSubmission={selectedSubmission}
                    analysis={analysis}
                    setAnalysis={setAnalysis}
                    handleAddDiagnosis={handleAddDiagnosis}
                    formatDate={formatDate}
                    handleCloseModal={handleCloseModal}
                    currentDoctor={doctorInfo}
                />
            )}

            {modalType === 'assign' && selectedSubmission && (
                <AssignModal
                    selectedSubmission={selectedSubmission}
                    selectedLab={selectedLab}
                    setSelectedLab={setSelectedLab}
                    showLabDropdown={showLabDropdown}
                    setShowLabDropdown={setShowLabDropdown}
                    handleAssignToLab={handleAssignToLab}
                    handleCloseModal={handleCloseModal}
                />
            )}

            {modalType === 'refer' && selectedSubmission && (
                <ReferModal
                    selectedSubmission={selectedSubmission}
                    selectedDoctor={selectedDoctor}
                    setSelectedDoctor={setSelectedDoctor}
                    showDoctorDropdown={showDoctorDropdown}
                    setShowDoctorDropdown={setShowDoctorDropdown}
                    handleReferToDoctor={handleReferToDoctor}
                    handleCloseModal={handleCloseModal}
                />
            )}
        </div >
    );
};

export default DoctorDashboard;