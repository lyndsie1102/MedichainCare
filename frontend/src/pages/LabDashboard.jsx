import React, { useState, useEffect } from 'react';
import {
    TestTube,
    Heart,
    Search,
    Filter,
    Upload,
    Calendar,
    ChevronDown,
    LogOut,
    User,
    Phone,
    Mail,
    MapPin,
    Clock,
    FileCheck,
    FlaskRound,
    CheckCircle,
    BadgeCheck,
    ArrowRight,
    X,
    Hand
} from 'lucide-react';
import { getTestRequests, uploadLabResult, logout, getLabStaffInfo } from '../api.js';  // Import your API functions

const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending':
        return <Clock className="status-icon status-icon-red" />;
      case 'Uploaded':
        return <CheckCircle className="status-icon status-icon-green" />;
      default:
        return <Clock className="status-icon status-icon-gray" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'status-badge status-badge-red';
      case 'Uploaded':
        return 'status-badge status-badge-green';
      default:
        return 'status-badge status-badge-gray';
    }
  };

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

    // Fetch lab staff info
    useEffect(() => {
        const fetchLabStaffInfo = async () => {
            try {
                const token = localStorage.getItem('access_token');
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
                const token = localStorage.getItem('access_token');
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
        console.log(fileList);  // Check if this is a FileList
        setFiles(fileList);  // Save it in state
    };

    // Handle file upload
    const handleUploadResults = async () => {
        const token = localStorage.getItem('access_token');
        if (selectedRequest && selectedRequest.upload_token && files.length > 0) {
            console.log('Selected Files:', files);  // Ensure files is a FileList or Array

            // Convert FileList to an array (if it's not already)
            const fileArray = Array.from(files);

            try {
                const response = await uploadLabResult(selectedRequest.upload_token, token, fileArray);
                alert(response.message); // Notify user on success

                // Update test request status after successful upload
                setTestRequests(prev =>
                    prev.map(req => req.id === selectedRequest.id
                        ? { ...req, status: 'Uploaded' } : req
                    )
                );

                // Close the modal and reset the selected request
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

    const handleCloseModal = () => {
        setModalType(null);
        setSelectedRequest(null);
    };

    const filteredRequests = testRequests.filter(request => {
        const matchesSearch = request.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            request.doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            request.testType.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
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
        <div className="lab-dashboard-container">
            {/* Header */}
            <header className="lab-header">
                <div className="lab-header-content">
                    <div className="lab-header-inner">
                        <div className="lab-header-left">
                            <div className="lab-logo-section">
                                <div className="lab-logo-icon">
                                    <Heart className="lab-logo-heart" />
                                </div>
                                <div>
                                    <h1 className="lab-logo-title">HealthConnect</h1>
                                    <p className="lab-logo-subtitle">Lab Staff Dashboard</p>
                                </div>
                            </div>
                        </div>

                        {/* User Info with TestTube Icon */}
                        <div className="lab-user-info" onClick={() => setShowUserDropdown(!showUserDropdown)}>
                            <div className="lab-user-card lab-user-card-clickable">
                                <div className="lab-user-icon">
                                    <TestTube className="lab-testtube-icon" />
                                </div>
                                <div className="lab-user-details">
                                    <p className="lab-user-name">
                                        {labStaff ? `${labStaff.name}` : 'Loading...'}
                                    </p>
                                    <p className="lab-user-role">Lab Technician</p>
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
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="lab-main-content">
                {/* Page Title and Filters */}
                <div className="lab-page-header">
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
                </div>

                {/* Test Requests List */}
                <div className="lab-requests-list">
                    {filteredRequests.map((request) => (
                        <div key={request.id} className="lab-request-card">
                            <div className="lab-request-content">
                                <div className="lab-request-main">
                                    {/* Header with Doctor and Status */}
                                    <div className="lab-card-header">
                                        <div className="lab-doctor-section">
                                            <div className="lab-doctor-avatar">
                                                <User className="lab-doctor-icon" />
                                            </div>
                                            <div className="lab-doctor-details">
                                                <h3 className="lab-doctor-name">{request.doctor.name}</h3>
                                                <p className="lab-doctor-specialty">{request.doctor.specialty}</p>
                                                <div className="lab-request-time">
                                                    <Calendar className="lab-calendar-icon" />
                                                    <span>{formatDate(request.request_time)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Test Information */}
                                    <div className="lab-test-info">
                                        <h4 className="lab-test-type">{request.test_type}</h4>
                                    </div>

                                    {/* Patient Information */}
                                    <div className="lab-patient-info">
                                        <h4 className="lab-patient-header">Patient: {request.patient.name}, {request.patient.age} years</h4>
                                        <div className="lab-patient-contact">
                                            <span className="lab-contact-item">
                                                <Phone className="lab-contact-icon" />
                                                {request.patient.phone}
                                            </span>
                                            <span className="lab-contact-item">
                                                <Mail className="lab-contact-icon" />
                                                {request.patient.email}
                                            </span>
                                            <span className="lab-contact-item">
                                                <MapPin className="lab-contact-icon" />
                                                {request.patient.location}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Status and Action */}
                                {/* Status and Action */}
                                <div className="lab-status-action">
                                    <div className="lab-status-badge-container">
                                        <span className={getStatusColor(request.status)}>
                                            {getStatusIcon(request.status)}
                                            <span className="lab-status-text">{request.status}</span>
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleUploadClick(request)}
                                        disabled={request.status === 'Uploaded'}
                                        className={`lab-upload-btn ${request.status === 'Uploaded' ? 'lab-upload-btn-disabled' : ''}`}
                                    >
                                        <Upload className="lab-btn-icon" />
                                        Upload Results
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main >

            {/* Modal for Uploading Test Results */}
            {/* Upload Modal */}
            {modalType === 'upload' && selectedRequest && (
                <div className="lab-modal-overlay">
                    <div className="lab-modal-container">
                        <div className="lab-modal-header lab-modal-header-orange">
                            <h3 className="lab-modal-title">Upload Test Results - {selectedRequest.patient.name}</h3>
                            <button
                                onClick={handleCloseModal}
                                className="lab-modal-close"
                            >
                                <X className="lab-close-icon" />
                            </button>
                        </div>

                        <div className="lab-modal-body">
                            <div className="lab-modal-content">
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
                                        onChange={handleFileChange}
                                    />
                                </div>

                                {/* Upload Button */}
                                <button
                                    onClick={handleUploadResults}
                                    className="lab-btn lab-btn-confirm-upload"
                                >
                                    <Upload className="lab-btn-icon" />
                                    Confirm Upload
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div >
    );
};

export default LabStaffDashboard;
