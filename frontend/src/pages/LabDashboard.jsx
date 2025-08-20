import { useState, useEffect } from 'react';
import {
    TestTube,
    Heart,
    Search,
    Filter,
    ChevronDown,
    LogOut,
    X,
    Wallet,
    CopyIcon
} from 'lucide-react';
import LogoutModal from '../components/LogoutModal';  // Import your LogoutModal component
import { getTestRequests, uploadLabResult, getLabStaffInfo, appointmentSchedule, cancelAppointment } from '../api/lab-apis.js';  // Import your API functions
import { logout } from '../api/user-apis.js'
import UploadResultsModal from '../components/UploadResultsModal.jsx';  // Import the UploadResultsModal component
import TestRequestList from '../components/TestRequestList.jsx';
import ScheduleModal from '../components/ScheduleModal.jsx';
import { formatDate, getRequestStatusColor, getRequestStatusIcon } from '../utils/Helpers';  // Import utility functions for status color and icon
import { setupBlockchain, updateTestResultsOnBlockchain, getEthAddress } from '../utils/BlockchainInteract.js';
import { formatAddress, copyAddressToClipboard } from '../utils/Helpers';


const LabStaffDashboard = ({ accessToken }) => {
    const [labStaff, setLabStaff] = useState(null);
    const [testRequests, setTestRequests] = useState([]);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [modalType, setModalType] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [files, setFiles] = useState([]);
    const [resultSummary, setResultSummary] = useState('');
    const [summaryError, setSummaryError] = useState('');
    const [showAddressTooltip, setShowAddressTooltip] = useState(false);

    // Appointment scheduling states
    const [selectedDateTime, setSelectedDateTime] = useState('');
    const [isModifyingAppointment, setIsModifyingAppointment] = useState(false);
    const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);

    const token = localStorage.getItem('access_token');
    const eth_address = getEthAddress(token);
    const shortEthAddress = formatAddress(eth_address);


    // Fetch lab staff info
    useEffect(() => {
        const fetchLabStaffInfo = async () => {
            try {
                const labStaff = await getLabStaffInfo(token);
                setLabStaff(labStaff);
            } catch (error) {
                console.error("Error fetching lab staff info:", error);
            }
        };
        fetchLabStaffInfo();
    }, []);

    // Fetch test requests
    useEffect(() => {
        const fetchTestRequests = async () => {
            try {
                const response = await getTestRequests(token);
                setTestRequests(response);
            } catch (error) {
                console.error("Error fetching test requests:", error);
            }
        };

        fetchTestRequests();
    }, [accessToken]);


    //handle upload button click
    const handleUploadClick = (request) => {
        setSelectedRequest(request);
        setModalType('upload');
    };

    // Handle file selection
    const handleFileChange = (e) => {
        const fileList = e.target.files;  // This should be a FileList object
        setFiles(fileList);  // Save it in state
    };

    //Handle summary change
    const handleSummaryChange = (e) => {
        const value = e.target.value;
        if (value.length <= 500) {
            setResultSummary(value);
            setSummaryError('');
        } else {
            setSummaryError('Summary cannot exceed 500 characters');
        }
    };

    // Handle schedule appointment click
    const handleScheduleClick = (request) => {
        setSelectedRequest(request);
        setModalType('schedule');
        setIsModifyingAppointment(request.appointment_status === 'Scheduled');
        setSelectedDateTime('');

        // If modifying an existing appointment, pre-fill the datetime
        if (request.appointment_status === 'Scheduled') {
            const existingDateTime = `${request.appointment_schedule}`;
            setSelectedDateTime(existingDateTime);
        }
    };

    // Handle upload results
    const handleUploadResults = async () => {
        if (selectedRequest && selectedRequest.upload_token && files.length > 0) {
            const fileArray = Array.from(files);
            try {
                const response = await uploadLabResult(selectedRequest.upload_token, token, fileArray, resultSummary);
                alert(response.message);

                await setupBlockchain(token);

                await updateTestResultsOnBlockchain({
                    role: 'lab_staff'
                });

                setTestRequests(prev =>
                    prev.map(req => req.id === selectedRequest.id ? { ...req, status: 'Uploaded' } : req)
                );

                setModalType(null);
                setSelectedRequest(null);
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        } else {
            alert('Please select at least one file to upload.');
        }
    };


    // Handle logout modal actions
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

    const handleCloseModal = () => {
        setModalType(null);
        setSelectedRequest(null);
        setResultSummary('');
        setSummaryError('');
        setSelectedDateTime('');
        setIsModifyingAppointment(false);
        setShowCancelConfirmation(false);
    };

    const handleCancelAppointment = () => {
        setShowCancelConfirmation(true);
    };

    const handleConfirmCancelAppointment = async () => {
        if (selectedRequest) {
            try {
                // Call the cancel appointment API
                const response = await cancelAppointment(selectedRequest.appointment_id, token);  // Pass appointment ID and token

                // Update the request status to cancelled on the front end
                setTestRequests((prev) =>
                    prev.map((req) =>
                        req.id === selectedRequest.id
                            ? {
                                ...req,
                                appointment_status: 'Cancelled',
                                appointment_schedule: null,
                            }
                            : req
                    )
                );

                // Display success alert
                alert(`Appointment cancelled successfully for ${selectedRequest.patient_name}`);
                handleCloseModal();
            } catch (error) {
                console.error('Error cancelling appointment:', error);
                alert('There was an error canceling the appointment. Please try again later.');
                setShowCancelConfirmation(false);
            }
        }
    };

    const handleConfirmAppointment = async () => {
        if (selectedDateTime && selectedRequest) {
            const finalDate = selectedDateTime.split('T')[0];
            const finalTimeRaw = selectedDateTime.split('T')[1].substring(0, 5); // "HH:MM"
            try {
                // Call the backend API
                const response = await appointmentSchedule(selectedRequest.id, finalDate, finalTimeRaw, token);

                // Update UI only on success
                setTestRequests(prev =>
                    prev.map(req =>
                        req.id === selectedRequest.id
                            ? {
                                ...req,
                                appointment_status: 'Scheduled',
                                appointment_schedule: `${finalDate}T${finalTimeRaw}`, // Store full ISO format if needed
                            }
                            : req
                    )
                );

                alert(`✅ Appointment scheduled successfully!\n${response.message}`);

                const responseTestRequests = await getTestRequests(token);
                setTestRequests(responseTestRequests);

                handleCloseModal();
            } catch (error) {
                console.error("Failed to schedule appointment:", error);
                alert(`❌ Failed to schedule appointment.\n${error.response?.data?.detail || error.message}`);
            }
        }
    };


    const filteredRequests = testRequests.filter(request => {
        const matchesSearch = request.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            request.doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            request.testType.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
        return matchesSearch && matchesStatus;
    });


    return (
        <div className="lab-dashboard-container">
            <header className="header">
                <div className="logo">
                    <Heart size={40} className="icon-heart" />
                    <div>
                        <h1>HealthCare Portal</h1>
                        <p>Lab Dashboard</p>
                    </div>
                </div>

                {/* User Info */}
                <div className="user-info" onClick={() => setShowUserDropdown(!showUserDropdown)}>
                    <div className="lab-user-card lab-user-card-clickable">
                        <TestTube className="lab-user-icon" />
                        <div className="lab-user-details">
                            <p className="lab-user-name">
                                {labStaff ? `${labStaff.name}` : 'Loading...'}
                            </p>
                            <p className="lab-user-role">Lab Technician</p>
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
                        <ChevronDown className={`lab-user-dropdown-icon ${showUserDropdown ? 'lab-user-dropdown-icon-rotated' : ''}`} />
                    </div>
                    {/* User Dropdown */}
                    {showUserDropdown && (
                        <div className="lab-user-dropdown-menu">
                            <button
                                onClick={handleLogoutClick}
                                className="lab-user-dropdown-item lab-logout-item"
                            >
                                <LogOut className="lab-dropdown-item-icon" />
                                <span>Log Out</span>
                            </button>
                        </div>
                    )}
                </div>
            </header >

            {/* Main Content */}
            < main className="lab-main-content" >
                {/* Page Title and Filters */}
                < div className="lab-page-header" >
                    <h2 className="lab-page-title">Test Requests</h2>

                    <div className="lab-filters-container">
                        {/* Search */}
                        <div className="lab-search-container">
                            <Search className="lab-search-icon" />
                            <input
                                type="text"
                                placeholder="Search patients, doctors, or tests..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="lab-search-input"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="lab-filter-container">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="lab-status-filter"
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="uploaded">Uploaded</option>
                            </select>
                            <Filter className="lab-filter-icon" />
                        </div>
                    </div>
                </div >

                {/* Test Requests List */}
                < TestRequestList
                    filteredRequests={filteredRequests}
                    handleUploadClick={handleUploadClick}
                    handleScheduleClick={handleScheduleClick}
                    getStatusColor={getRequestStatusColor}
                    getStatusIcon={getRequestStatusIcon}
                />
            </main >

            {/* Modal for Uploading Test Results */}
            {
                modalType === 'upload' && selectedRequest && (
                    <UploadResultsModal
                        selectedRequest={selectedRequest}
                        onClose={handleCloseModal}
                        onFileChange={handleFileChange}
                        onUpload={handleUploadResults}
                        resultSummary={resultSummary}
                        handleSummaryChange={handleSummaryChange}
                        summaryError={summaryError}
                        files={files}
                    />
                )
            }

            {/* Schedule Appointment Modal */}
            {
                modalType == 'schedule' && selectedRequest && (
                    <ScheduleModal
                        selectedRequest={selectedRequest}
                        selectedDateTime={selectedDateTime}
                        setSelectedDateTime={setSelectedDateTime}
                        isModifyingAppointment={isModifyingAppointment}
                        handleConfirmAppointment={handleConfirmAppointment}
                        handleCancelAppointment={handleCancelAppointment}
                        handleCloseModal={handleCloseModal}
                    />
                )
            }

            {/* Logout Confirmation Modal */}
            <LogoutModal
                showModal={showLogoutModal}
                onConfirmLogout={handleLogoutConfirm}
                onCancelLogout={handleLogoutCancel}
            />

            {/* Cancel Appointment Confirmation Modal */}
            {
                showCancelConfirmation && (
                    <div className="lab-modal-overlay">
                        <div className="lab-modal-container lab-modal-small">
                            <div className="lab-modal-header lab-modal-header-red">
                                <h3 className="lab-modal-title">Cancel Appointment</h3>
                                <button
                                    onClick={() => setShowCancelConfirmation(false)}
                                    className="lab-modal-close"
                                >
                                    <X className="lab-close-icon" />
                                </button>
                            </div>

                            <div className="lab-modal-body">
                                <div className="lab-modal-content">
                                    <div className="lab-logout-confirmation">
                                        <div className="lab-logout-icon-container">
                                            <X className="lab-logout-icon" />
                                        </div>
                                        <p className="lab-logout-text">
                                            Are you sure you want to cancel this appointment for {selectedRequest?.patient_name}? This action cannot be undone.
                                        </p>

                                        <div className="lab-logout-actions">
                                            <button
                                                onClick={() => setShowCancelConfirmation(false)}
                                                className="lab-btn lab-btn-cancel"
                                            >
                                                Keep Appointment
                                            </button>
                                            <button
                                                onClick={handleConfirmCancelAppointment}
                                                className="lab-btn lab-btn-logout-confirm"
                                            >
                                                <X className="lab-btn-icon" />
                                                <span>Cancel Appointment</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};


export default LabStaffDashboard;
