import React, { useEffect, useState } from 'react';
import { Heart, User } from 'lucide-react';
import SymptomForm from '../components/SymptomForm';
import SubmissionHistory from '../components/SubmissionHistory';
import { getSymptomHistory } from '../api';

const PatientDashboard = () => {
  const [submissions, setSubmissions] = useState([]);
  const user = JSON.parse(localStorage.getItem('user'));
  const patientId = user?.id || 1;

  const fetchSubmissions = async () => {
    try {
      const data = await getSymptomHistory(patientId);
      setSubmissions(data);
    } catch (err) {
      console.error('Failed to load submissions', err);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

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
        <div className="user-info">
          <User size={16} />
          <span>{user?.username || 'Patient'}</span>
        </div>
      </header>

      <main className="main-content-patient">
        <SymptomForm onSubmitSuccess={fetchSubmissions} patientId={patientId} />
        <SubmissionHistory submissions={submissions} />
      </main>
    </div>
  );
};


export default PatientDashboard;
