import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import LabDashboard from './pages/LabDashboard';
import LandingPage from './pages/LandingPage';
import './App.css';

function App() {
  const user = JSON.parse(localStorage.getItem('user'));

  return (
    <Router>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Dashboards */}
        <Route path="/dashboard/patient" element={<PatientDashboard />} />
        <Route path="/dashboard/doctor" element={<DoctorDashboard />} />
        <Route path="/dashboard/lab" element={<LabDashboard />} />

        {/* Optional: Auto-redirect user based on role if already logged in */}
        <Route
          path="/dashboard"
          element={
            user?.role === 'patient' ? (
              <Navigate to="/dashboard/patient" />
            ) : user?.role === 'doctor' ? (
              <Navigate to="/dashboard/doctor" />
            ) : user?.role === 'lab_staff' ? (
              <Navigate to="/dashboard/lab" />
            ) : (
              <Navigate to="/" />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
