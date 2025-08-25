import { useEffect, useState } from 'react';
import { Heart, UserIcon, LogOut, ChevronDown, Wallet, CopyIcon } from 'lucide-react';
import SymptomForm from '../components/SymptomForm';
import SubmissionHistory from '../components/SubmissionHistory';
import SubmissionViewModal from '../components/SubmissionViewModal';
import LogoutModal from '../components/LogoutModal';
import { getSymptomHistory, getPatientInfo, getSymptom } from '../api/patient-apis';
import { logout } from '../api/user-apis';
import { getEthAddress } from '../utils/BlockchainInteract';
import { formatAddress, copyAddressToClipboard } from '../utils/Helpers';

const PatientDashboard = () => {
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [user, setUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showFullAddress, setShowFullAddress] = useState(false);
  const [showAddressTooltip, setShowAddressTooltip] = useState(false);

  const token = localStorage.getItem('access_token');
  const eth_address = getEthAddress(token);
  const shortEthAddress = formatAddress(eth_address);

  // Fetch user info once on mount
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!token) {
        console.error('No access token found');
        return;
      }
      try {
        const data = await getPatientInfo(token);
        setUser(data);
      } catch (err) {
        console.error('Failed to load user info', err);
      }
    };

    fetchUserInfo();
  }, []);

  // Fetch all submissions with filters (status, startDate, endDate)
  const fetchSubmissions = async () => {
    setLoading(true);
    setError(null); // Reset error state on new fetch

    try {
      if (!token) {
        setError('No access token found');
        return;
      }

      const data = await getSymptomHistory(token, statusFilter, startDate, endDate);
      setSubmissions(data);
    } catch (err) {
      console.error('Failed to load submissions', err);
      setError('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetchSubmissions whenever filters change
  useEffect(() => {
    fetchSubmissions();
  }, [statusFilter, startDate, endDate]); // Trigger refetch when any of the filters change

  // Filter submissions locally based on statusFilter, startDate, endDate
  const filteredSubmissions = submissions.filter(submission => {
    // Status filter
    const matchesStatus =
      statusFilter === 'all' || submission.status?.toLowerCase() === statusFilter.toLowerCase();

    // Date filters
    const submissionDate = new Date(submission.submitted_at);
    const matchesStartDate = startDate ? submissionDate >= new Date(startDate) : true;
    const matchesEndDate = endDate ? submissionDate <= new Date(endDate + 'T23:59:59') : true; // Make sure the end date includes the entire day

    return matchesStatus && matchesStartDate && matchesEndDate;
  });

  // Handle viewing a submission
  const handleViewClick = async (submission) => {
    try {
      const data = await getSymptom(submission.id, token);
      setSelectedSubmission(data);
    } catch (err) {
      console.error('Failed to fetch symptom details:', err);
    }
  };

  const handleCloseModal = () => {
    setSelectedSubmission(null);
  };

  // Callback function to refetch submissions after form submission
  const handleFormSubmitSuccess = async () => {
    // Refetch submissions after new symptom submission, using the current filter values
    await fetchSubmissions();
  };

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


  return (
    <div className="container">
      <header className="header">
        <div className="logo">
          <Heart size={40} className="icon-heart" />
          <div>
            <h1>HealthCare Portal</h1>
            <p>Patient Dashboard</p>
          </div>
        </div>
        {/* User Info */}
        <div className="user-info" onClick={() => setShowUserDropdown(!showUserDropdown)}
          data-testid="user-info-dropdown-toggle">
          <div className="patient-user-card patient-user-card-clickable">
            <UserIcon className="patient-user-icon" />
            <div className="user-details">
              <div className="name-address">
                <p className="user-name">
                  {user ? user.name : 'Loading...'}
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
      </header>


      <main className="main-content-patient">
        {/* Filters: add UI to update statusFilter, startDate, endDate */}
        <SymptomForm onSubmitSuccess={handleFormSubmitSuccess} />

        {loading ? (
          <p>Loading submissions...</p>
        ) : error ? (
          <p className="error-message">{error}</p> // This will render your error message
        ) : (
          <SubmissionHistory
            submissions={filteredSubmissions}
            handleViewClick={handleViewClick}
            setStatusFilter={setStatusFilter}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
          />
        )}
      </main>
      {
        selectedSubmission && (
          <SubmissionViewModal
            selectedSymptom={selectedSubmission}
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
    </div >
  );
};

export default PatientDashboard;