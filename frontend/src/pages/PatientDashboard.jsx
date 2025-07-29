import React, { useEffect, useState } from 'react';
import { Heart, UserIcon } from 'lucide-react';
import SymptomForm from '../components/SymptomForm';
import SubmissionHistory from '../components/SubmissionHistory';
import SubmissionViewModal from '../components/SubmissionViewModal';
import { getSymptomHistory, getPatientInfo, getMedicalLabs, getSymptom } from '../api';

const PatientDashboard = () => {
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [user, setUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // Fetch user info once on mount
  useEffect(() => {
    const fetchUserInfo = async () => {
      const token = localStorage.getItem('access_token');
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

  // Fetch all submissions once on mount or optionally refetch periodically or on demand
  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          console.error('No access token found');
          return;
        }
        const data = await getSymptomHistory(token); // no filters here
        setSubmissions(data);
      } catch (err) {
        console.error('Failed to load submissions', err);
      }
    };

    fetchSubmissions();
  }, []);

  // Filter submissions locally based on statusFilter, startDate, endDate
  const filteredSubmissions = submissions.filter(submission => {
    // Status filter
    const matchesStatus =
      statusFilter === 'all' || submission.status?.toLowerCase() === statusFilter.toLowerCase();

    // Date filters
    const submissionDate = new Date(submission.submitted_at);
    const matchesStartDate = startDate ? submissionDate >= new Date(startDate) : true;
    const matchesEndDate = endDate ? submissionDate <= new Date(endDate) : true;

    return matchesStatus && matchesStartDate && matchesEndDate;
  });

  // Handle viewing a submission
  const handleViewClick = async (submission) => {
    try {
      const token = localStorage.getItem('access_token');
      const data = await getSymptom(submission.id, token);
      setSelectedSubmission(data);
    } catch (err) {
      console.error('Failed to fetch symptom details:', err);
    }
  };

  const handleCloseModal = () => {
    setSelectedSubmission(null);
  };

  return (
    <div className="container">
      {/* Header and User info as before */}
      {/* Filters: add UI to update statusFilter, startDate, endDate */}

      <SymptomForm onSubmitSuccess={async () => {
        // Refetch submissions after a new submission
        const token = localStorage.getItem('access_token');
        if (token) {
          const data = await getSymptomHistory(token);
          setSubmissions(data);
        }
      }} />

      <SubmissionHistory
        submissions={filteredSubmissions}
        handleViewClick={handleViewClick}
      />


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