import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import LabDashboard from './pages/LabDashboard';
import LandingPage from './pages/LandingPage';
import LoginForm from './components/LoginForm';
import './LabStaffDashboard.css';

const DashboardRouter = () => {
  const user = JSON.parse(localStorage.getItem('user'));

  if (!user || !user.role) {
    return <Navigate to="/" />;
  }

  switch (user.role) {
    case 'patient':
      return <PatientDashboard />;
    case 'doctor':
      return <DoctorDashboard />;
    case 'lab_staff':
      return <LabDashboard />;
    default:
      return <Navigate to="/" />;
  }
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login/:role" element={<LoginForm />} />
        <Route path="/dashboard" element={<DashboardRouter />} />
        <Route path="*" element={<Navigate to="/" />} /> {/* Catch-all redirect */}
      </Routes>
    </Router>
  );
}

export default App;
