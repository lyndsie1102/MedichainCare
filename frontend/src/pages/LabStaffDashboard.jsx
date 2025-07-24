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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="status-icon status-icon-red" />;
      case 'uploaded':
        return <CheckCircle className="status-icon status-icon-green" />;
      default:
        return <Clock className="status-icon status-icon-gray" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'status-badge status-badge-red';
      case 'uploaded':
        return 'status-badge status-badge-green';
      default:
        return 'status-badge status-badge-gray';
    }
  };

  const handleUploadClick = (request) => {
    setSelectedRequest(request);
    setModalType('upload');
  };

  const handleViewClick = (request) => {
    setSelectedRequest(request);
    setModalType('view');
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
                          <span>{formatDate(request.requestTime)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Test Information */}
                  <div className="lab-test-info">
                    <h4 className="lab-test-type">{request.testType}</h4>
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
                <div className="lab-status-action">
                  <div className="lab-status-badge-container">
                    <span className={getStatusColor(request.status)}>
                      {getStatusIcon(request.status)}
                      <span className="lab-status-text">{request.status}</span>
                    </span>
                  </div>
                  <button
                    onClick={() => handleUploadClick(request)}
                    disabled={request.status === 'uploaded'}
                    className={`lab-upload-btn ${request.status === 'uploaded' ? 'lab-upload-btn-disabled' : ''}`}
                  >
                    <Upload className="lab-btn-icon" />
                    Upload Results
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

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
                {/* Test Info */}
                <div className="lab-test-info-card">
                  <h4 className="lab-section-title">Test Information</h4>
                  <p className="lab-test-info-text">
                    <strong>Test Type:</strong> {selectedRequest.testType}
                  </p>
                  <p className="lab-test-info-text">
                    <strong>Requested by:</strong> {selectedRequest.doctor.name}
                  </p>
                  <p className="lab-test-info-text">
                    <strong>Patient:</strong> {selectedRequest.patient.name}
                  </p>
                </div>

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

      {/* View Modal */}
      {modalType === 'view' && selectedRequest && (
        <div className="lab-modal-overlay">
          <div className="lab-modal-container lab-modal-large">
            <div className="lab-modal-header lab-modal-header-orange">
              <h3 className="lab-modal-title">Test Request Details - {selectedRequest.patient.name}</h3>
              <button
                onClick={handleCloseModal}
                className="lab-modal-close"
              >
                <X className="lab-close-icon" />
              </button>
            </div>

            <div className="lab-modal-body">
              <div className="lab-modal-content">
                {/* Doctor Information */}
                <div className="lab-info-card">
                  <h4 className="lab-section-title">Requesting Doctor</h4>
                  <div className="lab-info-grid">
                    <div className="lab-info-item">
                      <User className="lab-info-icon" />
                      <span>{selectedRequest.doctor.name}</span>
                    </div>
                    <div className="lab-info-item">
                      <span className="lab-info-label">Specialty:</span>
                      <span>{selectedRequest.doctor.specialty}</span>
                    </div>
                    <div className="lab-info-item">
                      <Calendar className="lab-info-icon" />
                      <span>Requested: {formatDate(selectedRequest.requestTime)}</span>
                    </div>
                  </div>
                </div>

                {/* Patient Information */}
                <div className="lab-info-card">
                  <h4 className="lab-section-title">Patient Information</h4>
                  <div className="lab-info-grid">
                    <div className="lab-info-item">
                      <User className="lab-info-icon" />
                      <span>{selectedRequest.patient.name}, {selectedRequest.patient.age} years</span>
                    </div>
                    <div className="lab-info-item">
                      <Phone className="lab-info-icon" />
                      <span>{selectedRequest.patient.phone}</span>
                    </div>
                    <div className="lab-info-item">
                      <Mail className="lab-info-icon" />
                      <span>{selectedRequest.patient.email}</span>
                    </div>
                    <div className="lab-info-item">
                      <MapPin className="lab-info-icon" />
                      <span>{selectedRequest.patient.location}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="lab-modal-overlay">
          <div className="lab-modal-container lab-modal-small">
            <div className="lab-modal-header lab-modal-header-red">
              <h3 className="lab-modal-title">Confirm Logout</h3>
              <button
                onClick={handleLogoutCancel}
                className="lab-modal-close"
              >
                <X className="lab-close-icon" />
              </button>
            </div>

            <div className="lab-modal-body">
              <div className="lab-modal-content">
                <div className="lab-logout-confirmation">
                  <div className="lab-logout-icon-container">
                    <LogOut className="lab-logout-confirmation-icon" />
                  </div>
                  <p className="lab-logout-message">
                    Are you sure you want to log out? You will need to sign in again to access the dashboard.
                  </p>
                  
                  <div className="lab-logout-actions">
                    <button
                      onClick={handleLogoutCancel}
                      className="lab-btn lab-btn-cancel"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleLogoutConfirm}
                      className="lab-btn lab-btn-logout-confirm"
                    >
                      <LogOut className="lab-btn-icon" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabStaffDashboard;