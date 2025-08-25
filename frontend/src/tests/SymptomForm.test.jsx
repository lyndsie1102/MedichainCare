import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SymptomForm from '../components/SymptomForm'; // Adjust path if necessary

// ---- Mock External Dependencies ----
class MockDataTransfer {
  constructor() {
    this.files = [];
    this.items = {
      add: (file) => {
        this.files.push(file);
      },
    };
  }
}

const mockSetSelectedImages = jest.fn();

global.DataTransfer = MockDataTransfer;

// Mock the API module
import * as api from '../api/patient-apis';
jest.mock('../api/patient-apis');

// Mock the Blockchain module
import * as blockchain from '../utils/BlockchainInteract';
jest.mock('../utils/BlockchainInteract');

// Mock globals like localStorage and alert
// 3. Mock localStorage
const localStorageMock = {
  getItem: jest.fn().mockReturnValue('fake-token'),
};

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(window, 'alert', { value: jest.fn() });

// Mock URL.createObjectURL for file previews
window.URL.createObjectURL = jest.fn((file) => `mock-url-for-${file.name}`);
window.URL.revokeObjectURL = jest.fn();


describe('SymptomForm Component', () => {
  // Define mock functions for props and APIs
  const mockOnSubmitSuccess = jest.fn();
  const mockUploadImage = api.uploadImage;
  const mockSubmitSymptom = api.submitSymptom;
  const mockSetupBlockchain = blockchain.setupBlockchain;
  const mockSubmitSymptomToBlockchain = blockchain.submitSymptomToBlockchain;

  // Clear all mock history before each test
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('fake-token');
    
  });

  const renderComponent = () => {
    return render(<SymptomForm onSubmitSuccess={mockOnSubmitSuccess} patientId={123} />);
  };

  test('renders the form with initial disabled submit button', () => {
    renderComponent();
    expect(screen.getByRole('heading', { name: /submit new symptoms/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/describe your symptoms/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit symptoms/i })).toBeDisabled();
  });

  test('enables the submit button only when symptoms and required consents are provided', () => {
    renderComponent();
    const submitButton = screen.getByRole('button', { name: /submit symptoms/i });
    const symptomTextarea = screen.getByPlaceholderText(/describe your symptoms/i);
    const treatmentCheckbox = screen.getByLabelText(/consent to sharing my data with the doctor/i);
    const referralCheckbox = screen.getByLabelText(/consent to sharing my medical records with the referring doctor/i);

    // Initial state: disabled
    expect(submitButton).toBeDisabled();

    // Fill in symptoms: still disabled
    fireEvent.change(symptomTextarea, { target: { value: 'Feeling unwell' } });
    expect(submitButton).toBeDisabled();

    // Check one consent: still disabled
    fireEvent.click(treatmentCheckbox);
    expect(submitButton).toBeDisabled();

    // Check both required consents: now enabled
    fireEvent.click(referralCheckbox);
    expect(submitButton).toBeEnabled();
  });

  test('allows adding and removing images', () => {
    renderComponent();
    const fileInput = screen.getByLabelText(/optional: upload image/i);
    const file1 = new File(['(⌐□_□)'], 'test1.png', { type: 'image/png' });
    const file2 = new File(['( O.O)'], 'test2.png', { type: 'image/png' });

    // Add files
    fireEvent.change(fileInput, { target: { files: [file1, file2] } });

    // Check that previews are rendered
    expect(screen.getByText(/Selected Images: test1.png, test2.png/i)).toBeInTheDocument();
    expect(screen.getByText(/test1/i)).toBeInTheDocument();
    expect(screen.getByText(/test2/i)).toBeInTheDocument();

    // Remove the first image (the remove icon is a text node `&times;`)
    const removeIcons = screen.getAllByText('×');
    console.log(removeIcons);
    fireEvent.click(removeIcons[0]);

    // Check that the first image is gone and the second remains
    waitFor(() => {
        // Assert that the first image is now gone
        expect(screen.queryByAltText('test1.png')).not.toBeInTheDocument();

        // Assert that the second image remains
        expect(screen.getByAltText('test2.png')).toBeInTheDocument();
        
        // Assert that the summary text has updated correctly
        expect(screen.getByText(/Selected Images: test2.png/i)).toBeInTheDocument();
    });
  });

  test('handles successful submission with images', async () => {
    // Mock successful API responses
    mockUploadImage.mockResolvedValue({ image_paths: ['path/to/image.png'] });
    mockSubmitSymptom.mockResolvedValue({ message: 'Symptom submitted' });
    mockSetupBlockchain.mockResolvedValue(true);
    mockSubmitSymptomToBlockchain.mockResolvedValue(true);

    renderComponent();
    const symptomTextarea = screen.getByPlaceholderText(/describe your symptoms/i);
    const fileInput = screen.getByLabelText(/optional: upload image/i);
    const treatmentCheckbox = screen.getByLabelText(/consent to sharing my data with the doctor/i);
    const referralCheckbox = screen.getByLabelText(/consent to sharing my medical records with the referring doctor/i);
    const researchCheckbox = screen.getByLabelText(/consent to share my data with researchers/i);
    const submitButton = screen.getByRole('button', { name: /submit symptoms/i });
    const file = new File(['content'], 'image.png', { type: 'image/png' });

    // Fill the form
    fireEvent.change(symptomTextarea, { target: { value: 'Coughing' } });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(treatmentCheckbox);
    fireEvent.click(referralCheckbox);
    fireEvent.click(researchCheckbox);

    // Submit
    fireEvent.click(submitButton);

    // Check submitting state
    const submittingButton = await screen.findByRole('button', { name: /submitting.../i });
    expect(submittingButton).toBeDisabled();

    // Wait for all async operations to finish
    await waitFor(() => {
      // 1. Blockchain setup was called
      expect(mockSetupBlockchain).toHaveBeenCalledWith('fake-token');

      // 2. Blockchain submission was called
      expect(mockSubmitSymptomToBlockchain).toHaveBeenCalledWith({
        consent_type: { treatment: true, referral: true, research: true },
        role: 'patient',
      });

      // 3. Image was uploaded
      expect(mockUploadImage).toHaveBeenCalledWith([file]);

      // 4. Main symptom data was submitted
      expect(mockSubmitSymptom).toHaveBeenCalledWith({
        symptoms: 'Coughing',
        image_paths: ['path/to/image.png'],
        patient_id: 123,
        consent_type: { treatment: true, referral: true, research: true },
      }, 'fake-token');

      // 5. Success callback was triggered
      expect(mockOnSubmitSuccess).toHaveBeenCalledTimes(1);
    });

    // 6. Form is reset
    expect(symptomTextarea.value).toBe('');
    expect(treatmentCheckbox.checked).toBe(false);
    expect(researchCheckbox.checked).toBe(false);
  });

  test('stops submission if blockchain setup fails', async () => {
    // Mock blockchain setup failure
    mockSetupBlockchain.mockRejectedValue(new Error('MetaMask connection failed'));

    renderComponent();
    // Fill the form to enable submission
    fireEvent.change(screen.getByPlaceholderText(/describe your symptoms/i), { target: { value: 'Headache' } });
    fireEvent.click(screen.getByLabelText(/consent to sharing my data with the doctor/i));
    fireEvent.click(screen.getByLabelText(/consent to sharing my medical records with the referring doctor/i));

    fireEvent.click(screen.getByRole('button', { name: /submit symptoms/i }));

    await waitFor(() => {
      // Check that alert was called and submission was halted
      expect(window.alert).toHaveBeenCalledWith("Please connect to Metamask or correct account.");
      expect(mockSubmitSymptomToBlockchain).not.toHaveBeenCalled();
      expect(mockSubmitSymptom).not.toHaveBeenCalled();
    });

    // Button should be re-enabled
    expect(screen.getByRole('button', { name: /submit symptoms/i })).toBeEnabled();
  });
});