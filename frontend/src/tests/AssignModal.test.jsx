import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AssignModal from '../components/AssignModal';


// 1. Mock the API module
import { getMedicalLabs, getTestTypes } from '../api/doctor-apis';
jest.mock('../api/doctor-apis', () => ({
    getMedicalLabs: jest.fn(),
    getTestTypes: jest.fn(),
}));

// 2. Mock Lucide icons
jest.mock('lucide-react', () => ({
    X: () => <span aria-label="Close modal">X</span>,
    ChevronDown: () => 'v',
}));

// 3. Mock localStorage
const localStorageMock = {
    getItem: jest.fn().mockReturnValue('fake-access-token'),
};

Object.defineProperty(window, 'localStorage', { value: localStorageMock });


// Mock data to be returned by our API mocks
const mockLabs = [
    { id: 1, name: 'City General Lab', location: 'Downtown', specialties: ['Bloodwork', 'Genetics'] },
    { id: 2, name: 'Metro Diagnostics', location: 'Uptown', specialties: ['Radiology'] },
];

const mockTestTypes = [
    { id: 101, name: 'Blood Test' },
    { id: 102, name: 'Urinalysis' },
];

const mockSubmission = {
    patient: { name: 'John Doe' },
};

describe('AssignModal Component', () => {

    // Helper function to render the component with all required props
    const renderComponent = (props = {}) => {
        const defaultProps = {
            selectedSubmission: mockSubmission,
            selectedLab: null,
            setSelectedLab: jest.fn(),
            selectedTestType: null,
            setSelectedTestType: jest.fn(),
            showLabDropdown: false,
            setShowLabDropdown: jest.fn(),
            showTestTypeDropdown: false,
            setShowTestTypeDropdown: jest.fn(),
            handleAssignToLab: jest.fn(),
            handleCloseModal: jest.fn(),
        };
        return render(<AssignModal {...defaultProps} {...props} />);
    };

    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.getItem.mockReturnValue('fake-access-token');
        // Set up successful API responses for most tests
        getMedicalLabs.mockResolvedValue(mockLabs);
        getTestTypes.mockResolvedValue(mockTestTypes);
    });

    test('renders initial state correctly and fetches data', async () => {
        renderComponent();

        // Check for static elements
        expect(screen.getByText(/Assign to Lab - Patient: John Doe/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Select Lab/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Select Test Type/i })).toBeInTheDocument();

        // The confirm button should NOT be visible initially
        expect(screen.queryByRole('button', { name: /Confirm Assignment/i })).not.toBeInTheDocument();

        // Check that the APIs were called on mount
        await waitFor(() => {
            expect(getMedicalLabs).toHaveBeenCalledWith('fake-access-token');
            expect(getTestTypes).toHaveBeenCalledWith('fake-access-token');
        });
    });

    test('handles closing the modal when the close button is clicked', () => {
        const handleCloseModal = jest.fn();
        renderComponent({ handleCloseModal });

        const closeButton = screen.getByRole('button', { name: /Close modal/i });
        fireEvent.click(closeButton);

        expect(handleCloseModal).toHaveBeenCalledTimes(1);
    });

    test('allows a user to select a lab from the dropdown', async () => {
        const setSelectedLab = jest.fn();
        const setShowLabDropdown = jest.fn();
        renderComponent({ setSelectedLab, setShowLabDropdown, showLabDropdown: true }); // Start with dropdown open

        // Wait for the labs to be rendered in the dropdown
        const labOption = await screen.findByText('City General Lab');
        fireEvent.click(labOption);

        // Check that the correct functions were called with the correct arguments
        expect(setSelectedLab).toHaveBeenCalledWith(mockLabs[0]); // mockLabs[0] is City General Lab
        expect(setShowLabDropdown).toHaveBeenCalledWith(false);
    });

    test('allows a user to select a test type from the dropdown', async () => {
        const setSelectedTestType = jest.fn();
        const setShowTestTypeDropdown = jest.fn();
        renderComponent({ setSelectedTestType, setShowTestTypeDropdown, showTestTypeDropdown: true }); // Start with dropdown open

        // Wait for the test types to be rendered
        const testTypeOption = await screen.findByText('Blood Test');
        fireEvent.click(testTypeOption);

        expect(setSelectedTestType).toHaveBeenCalledWith(mockTestTypes[0]); // mockTestTypes[0] is Blood Test
        expect(setShowTestTypeDropdown).toHaveBeenCalledWith(false);
    });

    test('shows the confirm button only when a lab and test type are selected', () => {
        // Render without any selections
        const { rerender } = renderComponent();
        expect(screen.queryByRole('button', { name: /Confirm Assignment/i })).not.toBeInTheDocument();

        // Rerender with a lab selected, but no test type
        rerender(<AssignModal {...{ selectedSubmission: mockSubmission, selectedLab: mockLabs[0], handleAssignToLab: jest.fn(), handleCloseModal: jest.fn() }} />);
        expect(screen.queryByRole('button', { name: /Confirm Assignment/i })).not.toBeInTheDocument();

        // Rerender with both selected
        rerender(<AssignModal {...{ selectedSubmission: mockSubmission, selectedLab: mockLabs[0], selectedTestType: mockTestTypes[0], handleAssignToLab: jest.fn(), handleCloseModal: jest.fn() }} />);
        const confirmButton = screen.getByRole('button', { name: /Confirm Assignment to City General Lab for Blood Test/i });
        expect(confirmButton).toBeInTheDocument();
    });

    test('calls handleAssignToLab when the confirm button is clicked', () => {
        const handleAssignToLab = jest.fn();
        renderComponent({
            selectedLab: mockLabs[0],
            selectedTestType: mockTestTypes[0],
            handleAssignToLab,
        });

        const confirmButton = screen.getByRole('button', { name: /Confirm Assignment/i });
        fireEvent.click(confirmButton);

        expect(handleAssignToLab).toHaveBeenCalledTimes(1);
    });
});