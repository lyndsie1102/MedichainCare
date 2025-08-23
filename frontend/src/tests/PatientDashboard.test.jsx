import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import PatientDashboard from '../pages/PatientDashboard';
import { getSymptomHistory, getPatientInfo, getSymptom } from '../api/patient-apis';
import { logout } from '../api/user-apis';
import { getEthAddress } from '../utils/BlockchainInteract';
import { formatAddress, copyAddressToClipboard } from '../utils/Helpers';

// Mock child components
jest.mock('../components/SymptomForm', () => ({ onSubmitSuccess }) => (
    <div data-testid="symptom-form">
        <button onClick={onSubmitSuccess}>Submit New Symptom</button>
    </div>
));

jest.mock('../components/SubmissionHistory', () => ({ submissions, handleViewClick }) => (
    <div data-testid="submission-history">
        {submissions.map(sub => (
            <div key={sub.id}>
                <span>{sub.symptoms}</span>
                <button onClick={() => handleViewClick(sub)}>View-{sub.id}</button>
            </div>
        ))}
    </div>
));

jest.mock('../components/SubmissionViewModal', () => ({ selectedSymptom, handleCloseModal }) => (
    <div data-testid="submission-modal">
        <h2>Details for {selectedSymptom.symptoms}</h2>
        <button onClick={handleCloseModal}>Close Modal</button>
    </div>
));

jest.mock('../components/LogoutModal', () => ({ showModal, onConfirmLogout, onCancelLogout }) => {
    if (!showModal) return null;
    return (
        <div data-testid="logout-modal">
            <button onClick={onConfirmLogout}>Confirm Logout</button>
            <button onClick={onCancelLogout}>Cancel Logout</button>
        </div>
    );
});

// Mock the API calls
jest.mock('../api/patient-apis');
jest.mock('../api/user-apis');
jest.mock('../utils/BlockchainInteract');
jest.mock('../utils/Helpers');

// Mock data
const mockUser = { name: 'John Doe' };
const mockSubmissions = [
    { id: 1, symptoms: 'Fever, Cough', submitted_at: '2023-10-27T10:00:00Z', status: 'Pending' },
    { id: 2, symptoms: 'Headache', submitted_at: '2023-10-26T11:00:00Z', status: 'Reviewed' },
];
const mockSingleSubmission = { id: 1, symptoms: 'Fever, Cough', details: 'High temperature for 3 days.' };
const mockEthAddress = '0x1234567890123456789012345678901234567890';
const mockShortEthAddress = '0x123...7890';

describe('PatientDashboard', () => {
    // Set up mocks and localStorage before each test
    beforeEach(() => {
        // Mock localStorage
        Storage.prototype.getItem = jest.fn((key) => {
            if (key === 'access_token') return 'mock_token';
            return null;
        });
        Storage.prototype.removeItem = jest.fn();

        // Reset mocks before each test
        jest.clearAllMocks();

        // Mock successful API responses
        getPatientInfo.mockResolvedValue(mockUser);
        getSymptomHistory.mockResolvedValue(mockSubmissions);
        getSymptom.mockResolvedValue(mockSingleSubmission);
        logout.mockResolvedValue({ status: 200 });

        // Mock utility functions
        getEthAddress.mockReturnValue(mockEthAddress);
        formatAddress.mockReturnValue(mockShortEthAddress);
        copyAddressToClipboard.mockReturnValue(() => { });

        // Mock window.location for logout redirect
        Object.defineProperty(window, 'location', {
            writable: true,
            value: { href: '' },
        });
    });

    test('renders dashboard, fetches and displays user info and submissions', async () => {
        render(<PatientDashboard />);

        // Check for initial loading state for user name
        expect(screen.getByText('Loading...')).toBeInTheDocument();

        // Wait for the async operations to complete and check if user name and submissions are displayed
        expect(await screen.findByText('John Doe')).toBeInTheDocument();
        expect(await screen.findByText('Fever, Cough')).toBeInTheDocument();
        expect(screen.getByText('Headache')).toBeInTheDocument();
        expect(screen.getByText(mockShortEthAddress)).toBeInTheDocument();

        // Verify APIs were called
        expect(getPatientInfo).toHaveBeenCalledWith('mock_token');
        expect(getSymptomHistory).toHaveBeenCalledWith('mock_token', 'all', null, null);
    });

    test('handles API failure gracefully', async () => {
        // Override the mock to simulate an error
        getSymptomHistory.mockRejectedValue(new Error('API Error'));

        render(<PatientDashboard />);

        // Wait for the error message to be displayed
        expect(await screen.findByText('Failed to load submissions')).toBeInTheDocument();
    });

    test('opens and closes the submission view modal', async () => {
        render(<PatientDashboard />);

        // Wait for submissions to load
        await screen.findByText('Fever, Cough');
        expect(screen.queryByTestId('submission-modal')).not.toBeInTheDocument();

        // Click the view button for the first submission
        const viewButton = screen.getByText('View-1');
        await userEvent.click(viewButton);

        // Verify that the getSymptom API was called with the correct ID
        expect(getSymptom).toHaveBeenCalledWith(1, 'mock_token');

        // Modal should now be visible with submission details
        expect(await screen.findByTestId('submission-modal')).toBeInTheDocument();
        expect(screen.getByText('Details for Fever, Cough')).toBeInTheDocument();

        // Click the close button
        const closeButton = screen.getByText('Close Modal');
        await userEvent.click(closeButton);

        // Modal should be gone
        await waitFor(() => {
            expect(screen.queryByTestId('submission-modal')).not.toBeInTheDocument();
        });
    });

    test('refetches submissions when a new symptom is submitted', async () => {
        render(<PatientDashboard />);

        // Initial fetch
        expect(getSymptomHistory).toHaveBeenCalledTimes(1);
        const submitButton = screen.getByText('Submit New Symptom');
        await userEvent.click(submitButton);

        // Wait for the component to refetch and verify the API was called again
        await waitFor(() => expect(getSymptomHistory).toHaveBeenCalledTimes(2));
    });

    test('handles user dropdown and logout flow', async () => {
        render(<PatientDashboard />);

        // Wait for user info to load
        const userCard = await screen.findByText('John Doe');
        expect(screen.queryByText('Log Out')).not.toBeInTheDocument();

        await userEvent.click(userCard);
        expect(screen.getByText('Log Out')).toBeInTheDocument();
        expect(screen.queryByTestId('logout-modal')).not.toBeInTheDocument();

        // Click the logout button
        await userEvent.click(screen.getByText('Log Out'));
        expect(screen.getByTestId('logout-modal')).toBeInTheDocument();

        // Click confirm logout
        const confirmButton = screen.getByText('Confirm Logout');
        await userEvent.click(confirmButton);

        // Verify logout API was called and localStorage was cleared
        await waitFor(() => {
            expect(logout).toHaveBeenCalledWith('mock_token');
        });
        expect(localStorage.removeItem).toHaveBeenCalledWith('access_token');
        expect(localStorage.removeItem).toHaveBeenCalledWith('user');
        expect(window.location.href).toBe('/login');
    });

    test('cancels logout from the modal', async () => {
        render(<PatientDashboard />);

        // Open user dropdown and click logout
        const userDropdownToggle = await screen.findByTestId('user-info-dropdown-toggle'); 
        await userEvent.click(userDropdownToggle);
        await userEvent.click(screen.getByText('Log Out'));

        // Modal is now open
        expect(screen.getByTestId('logout-modal')).toBeInTheDocument();

        // Click cancel
        const cancelButton = screen.getByText('Cancel Logout');
        await userEvent.click(cancelButton);

        // Modal should be gone, and no logout actions should have been taken
        expect(screen.queryByTestId('logout-modal')).not.toBeInTheDocument();
        expect(logout).not.toHaveBeenCalled();
        expect(localStorage.removeItem).not.toHaveBeenCalled();
    });
});