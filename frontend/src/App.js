import React, { useState } from 'react';
import './App.css';
import { Heart, User, Calendar, Camera, Send, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const sampleSubmissions = [
  {
    id: 1,
    date: '2024-01-15',
    time: '14:30',
    symptoms: 'Persistent headache with mild nausea...',
    hasImage: false,
    status: 'reviewed',
  },
  {
    id: 2,
    date: '2024-01-12',
    time: '09:15',
    symptoms: 'Skin rash on forearm...',
    hasImage: true,
    status: 'in-progress',
  },
  {
    id: 3,
    date: '2024-01-10',
    time: '16:45',
    symptoms: 'Chest tightness and shortness of breath...',
    hasImage: false,
    status: 'pending',
  },
  {
    id: 4,
    date: '2025-01-22',
    time: '16:45',
    symptoms: 'Cough...',
    hasImage: false,
    status: 'under review',
  },
];

function App() {
  const [symptoms, setSymptoms] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!symptoms.trim()) return;

    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));
    setSymptoms('');
    setSelectedImage(null);
    setIsSubmitting(false);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending': return 'status pending';
      case 'reviewed': return 'status reviewed';
      case 'in-progress': return 'status inprogress';
      default: return 'status';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock size={16} />;
      case 'reviewed': return <CheckCircle size={16} />;
      case 'in-progress': return <AlertCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  return (
    <div className="container">
      <header className="header">
        <div className="logo">
          <Heart size={24} className="icon-heart" />
          <div>
            <h1>HealthCare Portal</h1>
            <p>Patient Dashboard</p>
          </div>
        </div>
        <div className="user-info">
          <User size={16} />
          <span>Sarah Johnson</span>
        </div>
      </header>

      <main className="main-content">
        <section className="form-container">
          <div className="form-header">
            <h2>Submit New Symptoms</h2>
            <p>Describe your symptoms in detail to help our medical team</p>
          </div>
          <form onSubmit={handleSubmit} className="form-section">
            <label>Describe Your Symptoms</label>
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="Please describe your symptoms in detail, 
including when they started, severity, and 
any triggers you've noticed..."
              required
            />

            <label>Optional: Upload Image</label>
            <input type="file" id="image" onChange={handleImageChange} accept="image/*" />
            {selectedImage && <div className="preview">Selected: {selectedImage.name}</div>}

            <button type="submit" disabled={isSubmitting || !symptoms.trim()}>
              {isSubmitting ? 'Submitting...' : <><Send size={16} /> Submit Symptoms</>}
            </button>
          </form>
        </section>

        <section className="history-section">
          <h2>Submission History</h2>
          {sampleSubmissions.map((s) => (
            <div key={s.id} className="submission-card">
              <div className="submission-header">
                <div className="date-time">
                  <Calendar size={16} />
                  <span>{s.date} at {s.time}</span>
                  {s.hasImage && (
                    <div className="image-tag"><Camera size={14} /> Image attached</div>
                  )}
                </div>
                <div className={getStatusClass(s.status)}>
                  {getStatusIcon(s.status)} <span>{s.status.replace('-', ' ')}</span>
                </div>
              </div>
              <p>{s.symptoms}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

export default App;
