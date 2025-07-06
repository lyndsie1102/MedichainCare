import React from 'react';
import { Heart, Stethoscope, User, TestTube, Shield, Clock, Users, ArrowRight } from 'lucide-react';
import '../App.css';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
    const navigate = useNavigate();

    const handleLogin = (userType) => {
        const handleLogin = (userType) => {
            // Simulate setting user after login
            const userInfo = {
                id: 1,
                username: `${userType} User`,
                role:
                    userType === 'Patient'
                        ? 'patient'
                        : userType === 'Doctor'
                            ? 'doctor'
                            : 'lab_staff',
            };
            localStorage.setItem('user', JSON.stringify(userInfo));

            // Navigate to dashboard
            navigate('/dashboard');
            alert(`Redirecting to ${userType} login page...`);
            // In real app, use: navigate(`/login/${userType.toLowerCase()}`)
        };
    }
    return (
        <div className="container-landing">
            {/* Header */}
            <header className="header">
                <div className="logo">
                    <div className="icon-heart">
                        <Heart size={20} />
                    </div>
                    <div>
                        <h1>HealthConnect</h1>
                        <p>Secure Healthcare Portal</p>
                    </div>
                </div>
                <nav className="nav">
                    <a href="#">Home</a>
                    <a href="#">About</a>
                    <a href="#">Contact</a>
                </nav>
            </header>

            {/* Hero */}
            <section className="hero">
                <div className="hero-icon">
                    <Heart size={40} />
                </div>
                <h1>Welcome to <span className="text-orange">HealthConnect</span></h1>
                <p className="subtitle">Secure Login for Patients, Doctors & Lab Staff</p>
                <p className="description">
                    Access your healthcare portal with confidence. Choose your role below to get started.
                </p>
            </section>

            {/* Role Cards */}
            <div className="role-cards">
                {[
                    {
                        icon: <User />,
                        title: 'Patient Login',
                        desc: 'Access your health records and appointments',
                        color: 'orange',
                        features: ['View medical history', 'Schedule appointments', 'Access test results', 'Submit symptoms'],
                    },
                    {
                        icon: <Stethoscope />,
                        title: 'Doctor Login',
                        desc: 'Manage patients and medical records',
                        color: 'blue',
                        features: ['Patient management', 'Review symptoms', 'Prescribe medications', 'Schedule consultations'],
                    },
                    {
                        icon: <TestTube />,
                        title: 'Lab Staff Login',
                        desc: 'Process tests and manage lab results',
                        color: 'green',
                        features: ['Process lab tests', 'Upload test results', 'Quality control', 'Sample tracking'],
                    },
                ].map((role, index) => (
                    <div key={index} className={`card card-${role.color}`}>
                        <div className="card-header">
                            <div className="card-icon">{role.icon}</div>
                            <h3>{role.title}</h3>
                            <p>{role.desc}</p>
                        </div>
                        <ul>
                            {role.features.map((f, i) => (
                                <li key={i}>• {f}</li>
                            ))}
                        </ul>
                        <button onClick={() => handleLogin(role.title.split(' ')[0])}>
                            Login as {role.title.split(' ')[0]} <ArrowRight size={14} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Feature Highlights */}
            <section className="features">
                <h2>Why Choose HealthConnect?</h2>
                <p>Our secure platform provides comprehensive healthcare management for all stakeholders</p>
                <div className="feature-grid">
                    <div className="feature-item">
                        <Shield size={24} />
                        <h3>Secure & Private</h3>
                        <p>HIPAA-compliant security ensures your health data is protected</p>
                    </div>
                    <div className="feature-item">
                        <Clock size={24} />
                        <h3>24/7 Access</h3>
                        <p>Access your healthcare information anytime, anywhere</p>
                    </div>
                    <div className="feature-item">
                        <Users size={24} />
                        <h3>Collaborative Care</h3>
                        <p>Seamless communication between patients, doctors, and lab staff</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer">
                <div className="footer-top">
                    <div className="footer-left">
                        <div className="logo">
                            <div className="icon-heart"><Heart size={16} /></div>
                            <div>
                                <h3>HealthConnect</h3>
                                <p>Secure Healthcare Portal</p>
                            </div>
                        </div>
                        <p>Connecting patients, doctors, and lab staff through a secure,
                            comprehensive healthcare management platform.</p>
                    </div>
                    <div className="footer-links">
                        <div>
                            <h4>Quick Links</h4>
                            <ul>
                                <li><a href="#">About Us</a></li>
                                <li><a href="#">Services</a></li>
                                <li><a href="#">Support</a></li>
                                <li><a href="#">Contact</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4>Legal</h4>
                            <ul>
                                <li><a href="#">Privacy Policy</a></li>
                                <li><a href="#">Terms of Use</a></li>
                                <li><a href="#">HIPAA Compliance</a></li>
                                <li><a href="#">Accessibility</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="copyright">
                    © 2024 HealthConnect. All rights reserved.
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
