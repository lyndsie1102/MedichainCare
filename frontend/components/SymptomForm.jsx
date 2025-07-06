import React, { useState } from 'react';
import { Send, Camera } from 'lucide-react';
import { uploadImage, submitSymptom } from '../api';

const SymptomForm = ({ onSubmitSuccess, patientId }) => {
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

    try {
      let imagePath = null;
      if (selectedImage) {
        const res = await uploadImage(selectedImage);
        imagePath = res.image_path;
      }

      await submitSymptom({ symptoms, image_path: imagePath, patient_id: patientId });
      setSymptoms('');
      setSelectedImage(null);
      onSubmitSuccess();
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
        <label>Describe Your Symptoms</label>
        <textarea
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          required
          placeholder="Please describe your symptoms in detail..."
        />

        <label>Optional: Upload Image</label>
        <input type="file" onChange={handleImageChange} accept="image/*" />
        {selectedImage && <div className="preview">Selected: {selectedImage.name}</div>}

        <button type="submit" disabled={isSubmitting || !symptoms.trim()}>
          {isSubmitting ? 'Submitting...' : <><Send size={16} /> Submit Symptoms</>}
        </button>
      </form>
    </section>
  );
};

export default SymptomForm;
