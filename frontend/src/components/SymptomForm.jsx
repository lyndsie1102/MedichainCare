import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { uploadImage, submitSymptom } from '../api';
import { initializeWeb3, loadAccount, loadContract, setAccount, signAndSendTransaction } from '../blockchainInteract/interact';
import Web3 from 'web3';

const SymptomForm = ({ onSubmitSuccess, patientId }) => {
  const [symptoms, setSymptoms] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [treatmentConsent, setTreatmentConsent] = useState(false);
  const [referralConsent, setReferralConsent] = useState(false);
  const [researchConsent, setResearchConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(); // ⬅️ file input reference
  const [account, setAccount] = useState(); // State to hold current account

  const token = localStorage.getItem('access_token'); // Get token from local storage
  const handleImageChange = (e) => {
    const files = e.target.files;
    if (files?.length) {
      const arr = Array.from(files).map(file => ({
        id: URL.createObjectURL(file),
        file,
        preview: URL.createObjectURL(file),
      }));
      setSelectedImages(prev => [...prev, ...arr]);
    }
  };

  const removeImage = (id) => {
    setSelectedImages(prev => {
      const filtered = prev.filter(img => img.id !== id);
      return filtered;
    });
  };

  /*
  useEffect(() => {
    const setupBlockchain = async () => {
      try {
        // Initialize Web3 and get the web3 instance
        const web3Instance = await initializeWeb3();

        // Use web3 instance to interact with the blockchain
        const accounts = await web3Instance.eth.getAccounts();
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          alert("No accounts found");
        }

        // Load other contract details if needed
        await loadContract();
      } catch (error) {
        console.error("Blockchain setup failed:", error);
        alert("Error initializing Web3 or loading blockchain data.");
      }
    };

    setupBlockchain();
  }, []); // Empty dependency array ensures it runs only once

  */

  
  const web3 = new Web3(window.ethereum || "http://localhost:7545");
  useEffect(() => {
    const setupBlockchain = async () => {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        setAccount(accounts[0]);
      } catch (error) {
        console.error("Error initializing Web3:", error);
      }
    };

    setupBlockchain();
  }, []);



  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if required consents are given
    if (!symptoms.trim() || !treatmentConsent || !referralConsent) {
      alert('Please agree to the required consents (Treatment and Referral)');
      return;
    }

    setIsSubmitting(true);

    try {
      let uploadedPaths = [];
      if (selectedImages.length) {
        // Pass only the file objects to uploadImage
        const res = await uploadImage(selectedImages.map(img => img.file));
        uploadedPaths = res.image_paths; // should be array returned by API
      }

      const consentType = {
        treatment: treatmentConsent,
        referral: referralConsent,
        research: researchConsent,
      };

      // Submit symptom along with consents
      const response = await submitSymptom({
        symptoms,
        image_paths: uploadedPaths,
        patient_id: patientId,
        consent_type: consentType,
      }, token);

      if (response.message === 'Symptom submitted') {
        // Reset form fields after submission
        setSymptoms('');
        setSelectedImages([]);  // Reset selected images
        fileInputRef.current.value = '';  // Clear file input
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

  useEffect(() => {
    return () => {
      selectedImages.forEach(img => URL.revokeObjectURL(img.preview));
    };
  }, [selectedImages]);

  return (
    <section className="form-container">
      <div className="form-header">
        <h2>Submit New Symptoms</h2>
        <p>Describe your symptoms in detail to help our medical team</p>
      </div>
      <form onSubmit={handleSubmit} className="form-section">
        <label className="required-label">
          Describe Your Symptoms
          <span className="required"> *</span>
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
          multiple
          ref={fileInputRef} // ⬅️ attach ref
        />
        {selectedImages.length > 0 && (
          <div className="preview">
            Selected Images: {selectedImages.map(img => img.file.name).join(', ')}
          </div>
        )}


        <div className="image-previews">
          {selectedImages.map(img => (
            <div key={img.id} className="preview-item">
              <img src={img.preview} alt={img.file.name} />
              <span className="remove-icon" onClick={() => removeImage(img.id)}>
                &times; {/* You can also use an icon here, e.g., Font Awesome or any SVG */}
              </span>
            </div>
          ))}
        </div>


        {/* Consent checkboxes */}
        <div className="consent-section">
          <label>
            <input
              type="checkbox"
              checked={referralConsent}
              onChange={() => setReferralConsent(!referralConsent)}
              required
            />
            By ticking this checkbox I consent to sharing my medical records with the referring doctor if necessary.
            <span className="required"> (Required)*</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={treatmentConsent}
              onChange={() => setTreatmentConsent(!treatmentConsent)}
              required
            />
            By ticking this checkbox I consent to sharing my data with the doctor for the purpose of diagnosis and treatment.
            <span className="required"> (Required)*</span>
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
