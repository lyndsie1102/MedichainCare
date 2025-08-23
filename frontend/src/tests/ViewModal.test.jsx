import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ViewModal from '../components/ViewModal';


jest.mock('../utils/Helpers', () => ({
  formatDate: (date) => new Date(date).toLocaleString(),
}));

// --- Mock Data ---

const mockSubmissionTreatment = {
  status: 'Diagnosed',
  consent: 'treatment',
  symptoms: 'Severe headache and dizziness.',
  images: ['/path/image1.jpg'],
  testResults: [{
    uploadedAt: '2023-11-10T09:00:00Z',
    summary: 'Blood pressure slightly elevated.',
    files: [{ name: 'results.pdf', path: '/files/results.pdf' }],
  }],
  diagnoses: [{ id: 1, doctorName: 'Dr. Smith', createdAt: '2023-11-09T10:00:00Z', analysis: 'Likely a migraine.' }],
  patient: { name: 'John Doe', age: 42, gender: 'Male', phone: '555-1234', email: 'john.doe@email.com', address: '123 Main St' },
};

const mockSubmissionResearch = {
  ...mockSubmissionTreatment,
  consent: 'research',
  images: [],
};

const mockSubmissionWaitingForTest = {
  ...mockSubmissionTreatment,
  status: 'Waiting for Test', 
};

const mockCurrentDoctor = { name: 'Evelyn Reed' };

describe('ViewModal Component', () => {
  const defaultProps = {
    analysis: '',
    setAnalysis: jest.fn(),
    handleAddDiagnosis: jest.fn(),
    formatDate: jest.fn((date) => new Date(date).toLocaleString()), // Use the mock directly in props too
    handleCloseModal: jest.fn(),
    currentDoctor: mockCurrentDoctor,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(<ViewModal {...defaultProps} {...props} />);
  };

  test('renders all sections with full data when consent is for treatment', () => {
    renderComponent({ selectedSubmission: mockSubmissionTreatment });

    // Patient Information section should be visible
    const patientInfoSection = screen.getByRole('heading', { name: /patient information/i }).closest('.patient-details-card');
    expect(patientInfoSection).toBeInTheDocument();
    expect(within(patientInfoSection).getByText(/age: 42 • male/i)).toBeInTheDocument();
    expect(within(patientInfoSection).getByText('555-1234')).toBeInTheDocument();

    // Other sections
    expect(screen.getByText(/severe headache and dizziness/i)).toBeInTheDocument();
    expect(screen.getByAltText('Symptom 1')).toBeInTheDocument();
    expect(screen.getByText(/blood pressure slightly elevated/i)).toBeInTheDocument();
    expect(screen.getByText('results.pdf')).toBeInTheDocument();
    expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
    expect(screen.getByText(/likely a migraine/i)).toBeInTheDocument();
  });

  test('hides patient information when consent is for research', () => {
    renderComponent({ selectedSubmission: mockSubmissionResearch });

    // Patient Information section should NOT be visible
    expect(screen.queryByRole('heading', { name: /patient information/i })).not.toBeInTheDocument();
    expect(screen.queryByText('555-1234')).not.toBeInTheDocument();

    // Check that other sections still render
    expect(screen.getByRole('heading', { name: /patient consent/i })).toBeInTheDocument();
    expect(screen.getByText(/consent: research/i)).toBeInTheDocument();
  });

  test('disables diagnosis textarea and button when status is "Waiting for Test"', () => {
    renderComponent({ selectedSubmission: mockSubmissionWaitingForTest });

    const diagnosisTextarea = screen.getByPlaceholderText(/enter your diagnosis/i);
    const addDiagnosisButton = screen.getByRole('button', { name: /add diagnosis/i });

    expect(diagnosisTextarea).toBeDisabled();
    expect(addDiagnosisButton).toBeDisabled();
  });
  
  test('enables diagnosis textarea and button when status is not "Waiting for Test"', () => {
    renderComponent({ selectedSubmission: mockSubmissionTreatment }); // Status is 'Diagnosed'

    const diagnosisTextarea = screen.getByPlaceholderText(/enter your diagnosis/i);
    const addDiagnosisButton = screen.getByRole('button', { name: /add diagnosis/i });

    expect(diagnosisTextarea).toBeEnabled();
    // Button is still disabled because analysis text is empty
    expect(addDiagnosisButton).toBeDisabled();
  });

  test('calls handleCloseModal when the close button is clicked', () => {
    renderComponent({ selectedSubmission: mockSubmissionTreatment });
    const closeButton = screen.getByRole('button', { name: '' }); // The 'X' button has no accessible name
    fireEvent.click(closeButton);
    expect(defaultProps.handleCloseModal).toHaveBeenCalledTimes(1);
  });

  test('calls setAnalysis when typing in the diagnosis textarea', () => {
    renderComponent({ selectedSubmission: mockSubmissionTreatment });
    const diagnosisTextarea = screen.getByPlaceholderText(/enter your diagnosis/i);
    fireEvent.change(diagnosisTextarea, { target: { value: 'New diagnosis' } });
    expect(defaultProps.setAnalysis).toHaveBeenCalled();
  });
  
  test('calls handleAddDiagnosis when "Add Diagnosis" button is clicked with analysis text', () => {
    // Re-render the component with analysis text to enable the button
    const { rerender } = renderComponent({ selectedSubmission: mockSubmissionTreatment, analysis: 'Patient should rest.' });
    
    const addDiagnosisButton = screen.getByRole('button', { name: /add diagnosis/i });
    expect(addDiagnosisButton).toBeEnabled(); // First, confirm it's enabled
    
    fireEvent.click(addDiagnosisButton);
    expect(defaultProps.handleAddDiagnosis).toHaveBeenCalledTimes(1);
  });
});