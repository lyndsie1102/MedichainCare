import { useState, useEffect } from 'react';
import {
    Heart,
    Stethoscope,
    Search,
    Filter,
    ChevronDown,
    LogOut,
    Wallet,
    CopyIcon
} from 'lucide-react';
import '../styles/DoctorDashboard.css';
import AssignModal from '../components/AssignModal';
import ReferModal from '../components/ReferModal';
import SubmissionList from '../components/SubmissionList';
import ViewModal from '../components/ViewModal';
import LogoutModal from '../components/LogoutModal';
import { getDoctorDashboard, getDoctorDetails, getSymptomDetails, createDiagnosis, createReferral, createTestRequest } from '../api/doctor-apis';
import { logout } from '../api/user-apis.js'
import { getSymptomStatusColor, getSymptomStatusIcon, formatDate } from '../utils/Helpers';
import { setupBlockchain, addDiagnosisToBlockchain, referToDoctorOnBlockchain, assignTestToLabBlockchain, getEthAddress } from '../utils/BlockchainInteract';
import { formatAddress, copyAddressToClipboard } from '../utils/Helpers';

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
    const [showAddressTooltip, setShowAddressTooltip] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const token = localStorage.getItem('access_token');
    const eth_address = getEthAddress(token);
    const shortEthAddress = formatAddress(eth_address);

    const fetchDashboard = async () => {
        try {
            const data = await getDoctorDashboard(token, statusFilter, searchTerm);
            setSubmissions(data);
        } catch (err) {
            console.error('Error fetching doctor dashboard:', err);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, [statusFilter, searchTerm]);

    useEffect(() => {
        const fetchDoctor = async () => {
            try {
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


    // Handle assigning test to lab and integrating with blockchain
    const handleAssignToLab = async () => {
        if (isLoading || !selectedTestType || !selectedLab || !selectedSubmission) return;

        setIsLoading(true); // Disable further clicks

        try {
            // Call blockchain setup before assign to lab
            try {
                await setupBlockchain(token);
            } catch (blockchainError) {
                console.error("Blockchain setup failed:", blockchainError);
                alert("Please connect to Metamask or correct account.")
                return;
            }

            // Call blockchain function after blockchain setup
            try {
                await assignTestToLabBlockchain({ role: 'doctor' });
            } catch (blockchainError) {
                console.error("Blockchain setup failed:", blockchainError);
                alert("Please sign transaction to continue assigning test to lab.");
                return;
            }

            // Assign test to lab
            await createTestRequest(token, {
                symptom_id: selectedSubmission.id,
                lab_id: selectedLab.id,
                test_type_id: selectedTestType.id
            });

            setSubmissions(prev =>
                prev.map(sub =>
                    sub.id === selectedSubmission.id
                        ? { ...sub, status: 'Assigned to Lab' }
                        : sub
                )
            );

            alert(`Successfully assigned to ${selectedLab.name}`);
            handleCloseModal();
        } catch (error) {
            console.error('Failed to assign to lab:', error);
            alert('Lab assignment failed. Please try again.');
        } finally {
            setIsLoading(false); // Enable button again
        }
    };


    // Handle referring to another doctor and integrating with blockchain
    const handleReferToDoctor = async () => {
        if (isLoading || !selectedDoctor || !selectedSubmission) return;

        setIsLoading(true); // Disable further clicks

        try {
            // Call blockchain setup before refer to doctor
            try {
                await setupBlockchain(token);
            } catch (blockchainError) {
                console.error("Blockchain setup failed:", blockchainError);
                alert("Please connect to Metamask or correct account.")
                return;
            }

            // Call blockchain function after blockchain setup
            try {
                await referToDoctorOnBlockchain({ role: 'doctor' });
            } catch (blockchainError) {
                console.error("Blockchain setup failed:", blockchainError);
                alert("Please sign the contraction to continue referring doctor.");
                return;
            }

            await createReferral(token, selectedSubmission.id, selectedDoctor.id);

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
        } finally {
            setIsLoading(false); // Enable button again
        }
    };

    // Handle adding diagnosis and integrating with blockchain
    const handleAddDiagnosis = async () => {
        if (isLoading || !analysis.trim() || !selectedSubmission) return;

        setIsLoading(true); // Disable further clicks

        try {
            // Call blockchain setup before submitting the symptom
            try {
                await setupBlockchain(token);
            } catch (blockchainError) {
                console.error("Blockchain setup failed:", blockchainError);
                alert("Please connect to Metamask or correct account.")
                return;
            }

            // Call blockchain function after blockchain setup
            try {
                await addDiagnosisToBlockchain({ role: 'doctor' });
            } catch (blockchainError) {
                console.error("Blockchain setup failed:", blockchainError);
                alert("Please sign the contraction to continue adding diagnosis.")
                return;
            }

            const payload = {
                symptom_id: selectedSubmission.id,
                patient_id: selectedSubmission.patient.id,
                diagnosis_content: analysis.trim()
            };

            const response = await createDiagnosis(payload, token);
            const newDiagnosis = response.diagnosis;

            setSubmissions(prev =>
                prev.map(sub =>
                    sub.id === selectedSubmission.id
                        ? { ...sub, diagnoses: [...sub.diagnoses, newDiagnosis], status: 'Diagnosed' }
                        : sub
                )
            );

            setSelectedSubmission(prev =>
                prev ? { ...prev, diagnoses: [...prev.diagnoses, newDiagnosis], status: 'Diagnosed' } : null
            );

            // Fetch the updated submissions again
            await fetchDashboard(); // Refresh the list of submissions

            setAnalysis('');
        } catch (error) {
            console.error('Failed to create diagnosis:', error);
            alert('Diagnosis creation failed. Please try again.');
        } finally {
            setIsLoading(false); // Enable button again
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
                    <div className="doctor-user-card doctor-user-card-clickable">
                        <Stethoscope className="doctor-user-icon" />
                        <div className="user-details-doctor">
                            <p className="user-name">
                                {doctorInfo ? `Dr. ${doctorInfo.name}` : 'Loading...'}
                            </p>
                            <p className="user-specialty">
                                {doctorInfo ? doctorInfo.specialty : ''}
                            </p>
                            <div
                                className="eth-address-container"
                                onMouseEnter={() => setShowAddressTooltip(true)}
                                onMouseLeave={() => setShowAddressTooltip(false)}
                            >
                                <Wallet className="eth-address-icon" />
                                <span className="eth-address-short">{shortEthAddress}</span>
                                {showAddressTooltip && (
                                    <div className="eth-address-tooltip">
                                        <div className="tooltip-content">
                                            <span className="full-address">{eth_address}</span>
                                            <button
                                                className="copy-button"
                                                onClick={copyAddressToClipboard(eth_address)}
                                            >
                                                <CopyIcon className="copy-icon" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <ChevronDown className={`user-dropdown-icon ${showUserDropdown ? 'user-dropdown-icon-rotated' : ''}`} />
                    </div>

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
            < main className="main-content doctor" >
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
                                <option value="Assigned to Lab">Assigned to Lab</option>
                                <option value="Tested">Tested</option>
                                <option value="Diagnosed">Diagnosed</option>
                                <option value="Referred">Referred</option>
                                <option value="Waiting for Test">Waiting for Test</option>
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