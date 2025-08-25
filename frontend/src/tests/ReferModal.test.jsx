import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReferModal from '../components/ReferModal'; // Adjust path if needed

// --- Mocks ---

// 1. Mock the API module
import { getAllDoctors } from '../api/doctor-apis';
jest.mock('../api/doctor-apis', () => ({
    getAllDoctors: jest.fn(),
}));

// 2. Mock Lucide icons for simplicity and accessibility
jest.mock('lucide-react', () => ({
    X: () => <span aria-label="Close modal">X</span>,
    ChevronDown: () => 'v',
}));

// 3. Mock localStorage as the component uses it to get a token
const localStorageMock = {
    getItem: jest.fn().mockReturnValue('fake-access-token'),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// --- End Mocks ---

// Mock data to be used in tests
const mockDoctors = [
    { id: 1, name: 'Dr. Emily Carter', specialty: 'Cardiology' },
    { id: 2, name: 'Dr. Ben Hanson', specialty: 'Neurology' },
];

const mockSubmission = {
    patient: { name: 'Jane Smith', age: 42 },
    symptoms: 'Patient reports persistent headaches and dizziness over the last two weeks, with occasional blurred vision.',
};

describe('ReferModal Component', () => {

    // Helper function to render the component with default and overrideable props
    const renderComponent = (props = {}) => {
        const defaultProps = {
            selectedSubmission: mockSubmission,
            selectedDoctor: null,
            setSelectedDoctor: jest.fn(),
            showDoctorDropdown: false,
            setShowDoctorDropdown: jest.fn(),
            handleReferToDoctor: jest.fn(),
            handleCloseModal: jest.fn(),
        };
        return render(<ReferModal {...defaultProps} {...props} />);
    };

    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.getItem.mockReturnValue('fake-access-token');
        // Set up a successful API response for most tests
        getAllDoctors.mockResolvedValue(mockDoctors);
    });

    test('renders initial state, patient summary, and fetches doctors', async () => {
        renderComponent();

        // Check for static content based on props
        expect(screen.getByText(/Refer Patient - Jane Smith/i)).toBeInTheDocument();
        expect(screen.getByText(/Patient Summary/i)).toBeInTheDocument();
        expect(screen.getByText(/Jane Smith, 42 years old/i)).toBeInTheDocument();
        expect(screen.getByText(/Symptoms: Patient reports persistent headaches/i)).toBeInTheDocument();

        // The "Confirm" button should not be present initially
        expect(screen.queryByRole('button', { name: /Confirm Referral/i })).not.toBeInTheDocument();

        // Verify that the API was called on mount
        await waitFor(() => {
            expect(getAllDoctors).toHaveBeenCalledWith('fake-access-token');
            expect(getAllDoctors).toHaveBeenCalledTimes(1);
        });
    });

    test('shows loading state initially inside the dropdown', () => {
        renderComponent({ showDoctorDropdown: true });
        expect(screen.getByText('Loading doctors...')).toBeInTheDocument();
    });

    test('shows an error message if fetching doctors fails', async () => {
        // Arrange: Make the API call reject
        getAllDoctors.mockRejectedValue(new Error('API Failure'));
        renderComponent({ showDoctorDropdown: true });

        // Assert: Wait for the error message to appear
        const errorMessage = await screen.findByText('Could not load doctors');
        expect(errorMessage).toBeInTheDocument();

        // Ensure loading text is gone and no doctors are listed
        expect(screen.queryByText('Loading doctors...')).not.toBeInTheDocument();
        expect(screen.queryByText('Dr. Emily Carter')).not.toBeInTheDocument();
    });

    test('allows a user to select a doctor from the dropdown', async () => {
        const setSelectedDoctor = jest.fn();
        const setShowDoctorDropdown = jest.fn();
        renderComponent({ showDoctorDropdown: true, setSelectedDoctor, setShowDoctorDropdown });

        // Wait for the dropdown items to render and click one
        const doctorOption = await screen.findByText('Dr. Emily Carter');
        fireEvent.click(doctorOption);

        // Assert that the state update functions were called correctly
        expect(setSelectedDoctor).toHaveBeenCalledWith(mockDoctors[0]);
        expect(setShowDoctorDropdown).toHaveBeenCalledWith(false);
    });

    test('shows the confirm button only when a doctor is selected', () => {
        // Render without a doctor selected
        const { rerender } = renderComponent({ selectedDoctor: null });
        expect(screen.queryByRole('button', { name: /Confirm Referral/i })).not.toBeInTheDocument();

        // Rerender the component with a doctor selected (simulating parent state change)
        renderComponent({ selectedDoctor: mockDoctors[0] });
        const confirmButton = screen.getByRole('button', { name: /Confirm Referral to Dr. Emily Carter/i });
        expect(confirmButton).toBeInTheDocument();
    });

    test('calls handleReferToDoctor when the confirm button is clicked', () => {
        const handleReferToDoctor = jest.fn();
        renderComponent({
            selectedDoctor: mockDoctors[0],
            handleReferToDoctor,
        });

        const confirmButton = screen.getByRole('button', { name: /Confirm Referral/i });
        fireEvent.click(confirmButton);

        expect(handleReferToDoctor).toHaveBeenCalledTimes(1);
    });

    test('calls handleCloseModal when the close (X) button is clicked', () => {
        const handleCloseModal = jest.fn();
        renderComponent({ handleCloseModal });

        const closeButton = screen.getByRole('button', { name: 'Close modal' });
        fireEvent.click(closeButton);

        expect(handleCloseModal).toHaveBeenCalledTimes(1);
    });
});