import React, { useState, useRef } from 'react';
import { Send } from 'lucide-react';
import { uploadImage, submitSymptom } from '../api';

const SymptomForm = ({ onSubmitSuccess, patientId }) => {
  const [symptoms, setSymptoms] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [treatmentConsent, setTreatmentConsent] = useState(false);
  const [referralConsent, setReferralConsent] = useState(false);
  const [researchConsent, setResearchConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(); // ⬅️ file input reference

  const token = localStorage.getItem('access_token'); // Get token from local storage
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if required consents are given
    if (!symptoms.trim() || !treatmentConsent || !referralConsent) {
      alert('Please agree to the required consents (Treatment and Referral)');
      return;
    }

    setIsSubmitting(true);

    try {
      let imagePath = null;
      if (selectedImage) {
        const res = await uploadImage(selectedImage);
        imagePath = res.image_path;
      }

      const consentType = {
        treatment: treatmentConsent,
        referral: referralConsent,
        research: researchConsent,
      };

      // Submit symptom along with consents
      const response = await submitSymptom({
        symptoms,
        image_path: imagePath,
        patient_id: patientId,
        consent_type: consentType,
      },
        token);

      if (response.message === 'Symptom submitted') {
        // Reset form fields after submission
        setSymptoms('');
        setSelectedImage(null);
        fileInputRef.current.value = ''; // ⬅️ clear file input
        setTreatmentConsent(false);
        setReferralConsent(false);
        setResearchConsent(false);
        onSubmitSuccess();
      }
    } catch (err) {
      console.error("Submission failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="form-container">
      <div className="form-header">
        <h2>Submit New Symptoms</h2>
        <p>Describe your symptoms in detail to help our medical team</p>
      </div>
      <form onSubmit={handleSubmit} className="form-section">
        <label className="required-label">
          Describe Your Symptoms
          <span className="required">*</span>
        </label>
        <textarea
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          required
          placeholder="Please describe your symptoms in detail, including when they started, severity, and any triggers you've noticed..."
        />

        <label>Optional: Upload Image</label>
        <input
          type="file"
          onChange={handleImageChange}
          accept="image/*"
          ref={fileInputRef} // ⬅️ attach ref
        />
        {selectedImage && <div className="preview">Selected: {selectedImage.name}</div>}

        {/* Consent checkboxes */}
        <div className="consent-section">
          <label>
            <input
              type="checkbox"
              checked={referralConsent}
              onChange={() => setReferralConsent(!referralConsent)}
              required
            />
            By ticking this checkbox I consent to sharing my medical records with the referring doctor if necessary. (Required)
            <span className="required">*</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={treatmentConsent}
              onChange={() => setTreatmentConsent(!treatmentConsent)}
              required
            />
            By ticking this checkbox I consent to sharing my data with the doctor for the purpose of diagnosis and treatment. (Required)
            <span className="required">*</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={researchConsent}
              onChange={() => setResearchConsent(!researchConsent)}
            />
            By ticking this checkbox I consent to share my data with researchers for medical research purposes. (Optional)
          </label>
        </div>

        <button type="submit" disabled={isSubmitting || !symptoms.trim() || !treatmentConsent || !referralConsent}>
          {isSubmitting ? 'Submitting...' : <><Send size={16} /> Submit Symptoms</>}
        </button>
      </form>
    </section>
  );
};

export default SymptomForm;
