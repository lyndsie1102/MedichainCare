import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import SubmissionViewModal from '../components/SubmissionViewModal'; // Adjust path if needed

// Mock the helper function for predictable date output
jest.mock('../utils/Helpers', () => ({
    formatDate: (date) => new Date(date).toLocaleString(),
}));

// Mock data for a submission with ALL possible information
const mockSymptomWithAllData = {
    submittedAt: '2023-10-28T10:00:00Z',
    appointment_schedule: '2023-11-05T14:00:00Z',
    lab_name: 'Test Lab 123',
    lab_location: 'Main St, Anytown',
    testType: 'Complete Blood Count',
    consent: { treatment: true, referral: true, research: false },
    symptoms: 'Patient reports a persistent cough and high fever.',
    images: ['/path/to/image1.jpg'],
    testResults: [
        {
            uploadedAt: '2023-11-06T09:00:00Z',
            summary: 'All markers are within the normal range.',
            files: [{ name: 'blood_report.pdf', type: 'PDF', url: '/files/report.pdf' }],
        },
    ],
    diagnoses: [
        {
            id: 1,
            doctorName: 'Dr. Evelyn Reed',
            createdAt: '2023-11-07T11:00:00Z',
            analysis: 'Initial diagnosis indicates a viral infection. Recommend rest.',
        },
    ],
};

// Mock data for a submission with MINIMAL information
const mockSymptomWithMinimalData = {
    submittedAt: '2023-10-29T12:00:00Z',
    appointment_schedule: null,
    consent: { treatment: false, referral: false, research: false },
    symptoms: 'Mild headache.',
    images: [],
    testResults: [],
    diagnoses: [],
};

describe('SubmissionViewModal Component', () => {
    const mockHandleCloseModal = jest.fn();

    beforeEach(() => {
        // Clear mock history before each test
        jest.clearAllMocks();
    });

    test('renders all data in the correct sections when provided with complete data', () => {
        render(
            <SubmissionViewModal
                selectedSymptom={mockSymptomWithAllData}
                handleCloseModal={mockHandleCloseModal}
            />
        );

        // --- Test Appointment Section ---
        const appointmentSection = screen.getByRole('heading', { name: /test appointment/i }).parentElement;

        expect(within(appointmentSection).getByText('Test Lab 123')).toBeInTheDocument();
        expect(within(appointmentSection).getByText('Main St, Anytown')).toBeInTheDocument();
        expect(within(appointmentSection).getByText('Complete Blood Count')).toBeInTheDocument();

        // --- Test Symptom Description Section ---
        const symptomSection = screen.getByRole('heading', { name: /symptom description/i }).parentElement;
        expect(within(symptomSection).getByText(/persistent cough and high fever/i)).toBeInTheDocument();

        // --- Test Uploaded Images Section ---
        const imagesSection = screen.getByRole('heading', { name: /uploaded images/i }).parentElement;
        expect(within(imagesSection).getByAltText('Symptom 1')).toBeInTheDocument();

        // --- Test Test Results Section ---
        const resultsSection = screen.getByRole('heading', { name: /test results/i }).parentElement;
        expect(within(resultsSection).getByText(/all markers are within the normal range/i)).toBeInTheDocument();
        expect(within(resultsSection).getByText('blood_report.pdf')).toBeInTheDocument();
        // We can even verify the "View" link is within the file item for more precision
        const fileItem = within(resultsSection).getByText('blood_report.pdf').closest('.test-results-file');
        expect(within(fileItem).getByRole('link', { name: /view/i })).toBeInTheDocument();

        // --- Test Doctor Diagnoses Section ---
        const diagnosesSection = screen.getByRole('heading', { name: /doctor diagnoses/i }).parentElement;
        expect(within(diagnosesSection).getByText('Dr. Evelyn Reed')).toBeInTheDocument();
        expect(within(diagnosesSection).getByText(/initial diagnosis indicates a viral infection/i)).toBeInTheDocument();
    });


    test('renders fallback messages for sections with no data', () => {
        render(
            <SubmissionViewModal
                selectedSymptom={mockSymptomWithMinimalData}
                handleCloseModal={mockHandleCloseModal}
            />
        );

        // Check for "Not Confirmed" appointment
        expect(screen.getByText('Not Confirmed')).toBeInTheDocument();

        // Check for "No images" placeholder
        expect(screen.getByText('No images uploaded.')).toBeInTheDocument();

        // Check for "No test results" placeholder
        expect(screen.queryByText('Test Results')).not.toBeInTheDocument();

        // Check for "No diagnoses" placeholder
        expect(screen.getByText('No diagnoses updated yet.')).toBeInTheDocument();
    });

    test('renders consent status correctly and avoids ambiguity', () => {
        render(
            <SubmissionViewModal
                selectedSymptom={mockSymptomWithAllData}
                handleCloseModal={mockHandleCloseModal}
            />
        );

        // Scope queries to each consent item to prevent "multiple elements" errors
        const treatmentItem = screen.getByText(/treatment:/i).closest('.consent-item');
        const referralItem = screen.getByText(/referral:/i).closest('.consent-item');
        const researchItem = screen.getByText(/research:/i).closest('.consent-item');

        expect(within(treatmentItem).getByText('Granted')).toBeInTheDocument();
        expect(within(referralItem).getByText('Granted')).toBeInTheDocument();
        expect(within(researchItem).getByText('Not Granted')).toBeInTheDocument();
    });

    test('calls handleCloseModal when the close button is clicked', () => {
        render(
            <SubmissionViewModal
                selectedSymptom={mockSymptomWithAllData}
                handleCloseModal={mockHandleCloseModal}
            />
        );

        // The button has no text, so find it by its container and role
        const header = screen.getByText(/symptom record details/i).closest('.modal-header');
        const closeButton = within(header).getByRole('button');

        fireEvent.click(closeButton);

        expect(mockHandleCloseModal).toHaveBeenCalledTimes(1);
    });
});