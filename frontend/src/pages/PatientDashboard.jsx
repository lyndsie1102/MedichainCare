import React, { useEffect, useState } from 'react';
import { Heart, User } from 'lucide-react';
import SymptomForm from '../components/SymptomForm';
import SubmissionHistory from '../components/SubmissionHistory';
import SubmissionViewModal from '../components/SubmissionViewModal';
import { getSymptomHistory, getPatientInfo, getMedicalLabs, getSymptom } from '../api';

const PatientDashboard = () => {
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [user, setUser] = useState(null);

  // Fetch the user information from localStorage or elsewhere
  const fetchUserInfo = async () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const data = await getPatientInfo(token); // Fetch patient details using the token
        setUser(data); // Store user data in state (e.g., name, etc.)
      } catch (err) {
        console.error('Failed to load user info', err);
      }
    } else {
      console.error('No access token found');
    }
  };

  // Function to fetch the symptom history for the patient
  const fetchSubmissions = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        const data = await getSymptomHistory(token);
        setSubmissions(data);
      } else {
        console.error('No access token found');
      }
    } catch (err) {
      console.error('Failed to load submissions', err);
    }
  };

  const handleViewClick = async (submission) => {
    try {
      const token = localStorage.getItem('access_token');
      const data = await getSymptom(submission.id, token);
      console.log("Selected Symptom Data: ", data);  // Log the data
      setSelectedSubmission(data);
    } catch (err) {
      console.error(['Failed to fetch symptom details:', err]);
    }
  };

  const handleCloseModal = () => {
    setSelectedSubmission(null);
  }


  useEffect(() => {
    // Fetch user info and submissions when the component mounts
    fetchUserInfo();
    fetchSubmissions();
  }, []); // Empty dependency array means it will only run once after the component mounts

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
        <div className="user-info">
          <div className="user-icon-patient">
            <User className="patient-user-icon" />
          </div>
          <div className="user-details">
            <p className="user-name">
              {user ? user.name : 'Loading...'}
            </p>
          </div>
        </div>
      </header>

      <main className="main-content-patient">
        {/* SymptomForm component that handles submission */}
        <SymptomForm onSubmitSuccess={fetchSubmissions} />

        {/* Submission history, which shows a list of previously submitted symptoms */}
        <SubmissionHistory
          submissions={submissions}
          handleViewClick={handleViewClick}
        />
      </main>

      { /* View Modal */}
      {selectedSubmission && (
        <SubmissionViewModal
          selectedSymptom={selectedSubmission}
          handleCloseModal={handleCloseModal}
        />
      )}
    </div>
  );
};

export default PatientDashboard;
