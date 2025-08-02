import React, { useState } from 'react';
import {
    TestTube,
    Heart,
    Search,
    Filter,
    Upload,
    Clock,
    CheckCircle,
    User,
    Phone,
    Mail,
    MapPin,
    Calendar,
    ChevronDown,
    X,
    LogOut,
    FileText
} from 'lucide-react';
import TestRequestList from '../components/TestRequestList';
import LogoutModal from '../components/LogoutModal';
import UploadModal from '../components/UploadModal';

const mockTestRequests = [
    {
        id: 'req1',
        doctor: {
            name: 'Dr. Sarah Mitchell',
            specialty: 'Internal Medicine'
        },
        requestTime: '2024-01-15T09:30:00Z',
        patient: {
            name: 'John Anderson',
            age: 45,
            phone: '+1 (555) 123-4567',
            email: 'john.anderson@email.com',
            location: 'New York, NY'
        },
        testType: 'Complete Blood Count (CBC)',
        status: 'pending',
        notes: 'Patient reports fatigue and weakness. Please check for anemia.'
    },
    {
        id: 'req2',
        doctor: {
            name: 'Dr. Michael Chen',
            specialty: 'Cardiology'
        },
        requestTime: '2024-01-15T11:15:00Z',
        patient: {
            name: 'Maria Rodriguez',
            age: 38,
            phone: '+1 (555) 987-6543',
            email: 'maria.rodriguez@email.com',
            location: 'Los Angeles, CA'
        },
        testType: 'Lipid Panel',
        status: 'uploaded',
        notes: 'Routine cholesterol screening for cardiovascular risk assessment.'
    },
    {
        id: 'req3',
        doctor: {
            name: 'Dr. Emily Johnson',
            specialty: 'Endocrinology'
        },
        requestTime: '2024-01-15T14:20:00Z',
        patient: {
            name: 'Robert Kim',
            age: 52,
            phone: '+1 (555) 456-7890',
            email: 'robert.kim@email.com',
            location: 'Chicago, IL'
        },
        testType: 'HbA1c & Glucose',
        status: 'pending',
        notes: 'Diabetic patient with recent symptoms.'
    },
    {
        id: 'req4',
        doctor: {
            name: 'Dr. Lisa Thompson',
            specialty: 'Family Medicine'
        },
        requestTime: '2024-01-14T16:45:00Z',
        patient: {
            name: 'Jennifer Davis',
            age: 29,
            phone: '+1 (555) 321-0987',
            email: 'jennifer.davis@email.com',
            location: 'Houston, TX'
        },
        testType: 'Thyroid Function Panel',
        status: 'uploaded',
        notes: 'Patient experiencing fatigue and weight changes.'
    },
    {
        id: 'req5',
        doctor: {
            name: 'Dr. David Wilson',
            specialty: 'Gastroenterology'
        },
        requestTime: '2024-01-14T13:10:00Z',
        patient: {
            name: 'Thomas Brown',
            age: 41,
            phone: '+1 (555) 654-3210',
            email: 'thomas.brown@email.com',
            location: 'Phoenix, AZ'
        },
        testType: 'Liver Function Tests',
        status: 'pending',
        notes: 'Follow-up testing after abnormal results last month.'
    }
];

const LabStaffDashboard = () => {
    const [testRequests, setTestRequests] = useState(mockTestRequests);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [modalType, setModalType] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);


    const handleUploadClick = (request) => {
        setSelectedRequest(request);
        setModalType('upload');
    };


    const handleCloseModal = () => {
        setModalType(null);
        setSelectedRequest(null);
    };

    const handleUploadResults = () => {
        if (selectedRequest) {
            setTestRequests(prev =>
                prev.map(req =>
                    req.id === selectedRequest.id
                        ? { ...req, status: 'uploaded' }
                        : req
                )
            );

            alert(`Test results uploaded successfully for ${selectedRequest.patient.name}`);
            handleCloseModal();
        }
    };

    const handleLogoutClick = () => {
        setShowUserDropdown(false);
        setShowLogoutModal(true);
    };

    const handleLogoutCancel = () => {
        setShowLogoutModal(false);
    };

    const handleLogoutConfirm = () => {
        setShowLogoutModal(false);
        alert('Successfully logged out. Redirecting to login page...');
    };

    const filteredRequests = testRequests.filter(request => {
        const matchesSearch = request.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            request.doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            request.testType.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
        return matchesSearch && matchesStatus;
    });


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
                                    <p className="lab-user-name">Alex Johnson</p>
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

                { /*Test Request List*/}
                <TestRequestList
                    requests={filteredRequests}
                    onUploadClick={handleUploadClick}
                />


                {filteredRequests.length === 0 && (
                    <div className="lab-empty-state">
                        <div className="lab-empty-icon">
                            <Search className="lab-empty-search-icon" />
                        </div>
                        <h3 className="lab-empty-title">No test requests found</h3>
                        <p className="lab-empty-text">Try adjusting your search or filter criteria.</p>
                    </div>
                )}
            </main>

            {/* Upload Modal */}
            <UploadModal
                request={modalType === 'upload' ? selectedRequest : null}
                onClose={handleCloseModal}
                onUpload={handleUploadResults}
            />


            {/* Logout Confirmation Modal */}
            <LogoutModal
                showModal={showLogoutModal}
                onConfirmLogout={handleLogoutConfirm}
                onCancelLogout={handleLogoutCancel}
            />
        </div>
    );
};

export default LabStaffDashboard;