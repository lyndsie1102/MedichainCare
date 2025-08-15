import { useState, useEffect } from 'react';
import {
    Heart,
    Stethoscope,
    Search,
    Filter,
    ChevronDown,
    LogOut
} from 'lucide-react';
import '../DoctorDashboard.css';
import AssignModal from '../components/AssignModal';
import ReferModal from '../components/ReferModal';
import SubmissionList from '../components/SubmissionList';
import ViewModal from '../components/ViewModal';
import LogoutModal from '../components/LogoutModal';
import { getDoctorDashboard, getDoctorDetails, getSymptomDetails, createDiagnosis, createReferral, logout, createTestRequest } from '../api';
import { getSymptomStatusColor, getSymptomStatusIcon, formatDate } from '../utils/Helpers';

const DoctorDashboard = () => {
    const [submissions, setSubmissions] = useState([]);
    const [doctorInfo, setDoctorInfo] = useState(null);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [modalType, setModalType] = useState(null);
    const [analysis, setAnalysis] = useState('');
    const [showLabDropdown, setShowLabDropdown] = useState(false);
    const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
    const [showTestTypeDropdown, setShowTestTypeDropdown] = useState(false);
    const [selectedLab, setSelectedLab] = useState(null);
    const [selectedTestType, setSelectedTestType] = useState('');
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

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

    const handleLogoutClick = () => {
        setShowUserDropdown(false);
        setShowLogoutModal(true);
    };

    const handleLogoutCancel = () => {
        setShowLogoutModal(false);
    };

    const handleLogoutConfirm = async () => {
        setShowLogoutModal(false);
        const token = localStorage.getItem('access_token');

        try {
            const res = await logout(token);

            if (res.status !== 200) {
                throw new Error('Logout failed on server');
            }

            // Clear client-side session
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');

            window.location.href = '/login';
        } catch (error) {
            console.error('Logout error:', error);
            alert('Logout failed. Please try again.');
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
        setSelectedTestType(null);
        setShowLabDropdown(false);
        setShowTestTypeDropdown(false);
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
        setShowTestTypeDropdown(false);
        setSelectedTestType('');
    };




    const handleAssignToLab = async () => {

        console.log("handleAssignToLab triggered");
        console.log("selectedTestType", selectedTestType);
        console.log("selectedLab", selectedLab);
        console.log("selectedSubmission", selectedSubmission);


        if (selectedTestType && selectedLab && selectedSubmission) {
            const token = localStorage.getItem('access_token');
            console.log("Token:", token); // Token should be logged here

            if (!token) {
                console.error("No access token found");
                alert("You are not authorized. Please log in again.");
                window.location.href = "/login";
                return;
            }

            try {
                // Call the API to assign the symptom to the lab
                console.log('Assigning test request...');
                const response = await createTestRequest(token, {
                    symptom_id: selectedSubmission.id,
                    lab_id: selectedLab.id,
                    test_type_id: selectedTestType.id
                });

                // Update the submission list and the status of the submission
                setSubmissions(prev =>
                    prev.map(sub =>
                        sub.id === selectedSubmission.id
                            ? { ...sub, status: 'Assigned to Lab' }
                            : sub
                    )
                );

                // Close the modal after successful assignment
                alert(`Successfully assigned to ${selectedLab.name}`);
                handleCloseModal();
            } catch (error) {
                console.error('Failed to assign to lab:', error);
                alert('Lab assignment failed. Please try again.');
            }
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
                            status: 'Diagnosed'
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
                <div className="user-info" onClick={() => setShowUserDropdown(!showUserDropdown)}>
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
                    <ChevronDown className={`user-dropdown-icon ${showUserDropdown ? 'user-dropdown-icon-rotated' : ''}`} />

                    {/* User Dropdown */}
                    {showUserDropdown && (
                        <div className="user-dropdown-menu">
                            <button
                                onClick={handleLogoutClick}
                                className="user-dropdown-item logout-item"
                            >
                                <LogOut className="dropdown-item-icon" />
                                <span>Log Out</span>
                            </button>
                        </div>
                    )}
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
                                <option value="Assigned">Assigned to Lab</option>
                                <option value="Tested">Tested</option>
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
                        getStatusIcon={getSymptomStatusIcon}
                        getStatusColor={getSymptomStatusColor}
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
                    selectedTestType={selectedTestType}
                    setSelectedTestType={setSelectedTestType}
                    showLabDropdown={showLabDropdown}
                    setShowLabDropdown={setShowLabDropdown}
                    showTestTypeDropdown={showTestTypeDropdown}
                    setShowTestTypeDropdown={setShowTestTypeDropdown}
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

            {/* Logout Confirmation Modal */}
            <LogoutModal
                showModal={showLogoutModal}
                onConfirmLogout={handleLogoutConfirm}
                onCancelLogout={handleLogoutCancel}
            />
        </div >
    );
};

export default DoctorDashboard;