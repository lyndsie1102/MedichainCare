import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import SubmissionList from '../components/SubmissionList';

// Mock Data with different statuses to test button logic
const mockSubmissions = [
    {
        id: 1,
        status: 'Pending', // Assign should be ENABLED, Refer should be DISABLED
        symptoms: 'Fever, cough, and a runny nose.',
        image_path: ['/path/to/image1.jpg'],
        submitted_at: '2023-10-28T10:00:00Z',
        consent: 'research',
        patient: { name: 'John Doe', age: 34, gender: 'Male' },
    },
    {
        id: 2,
        status: 'Diagnosed', // Assign should be DISABLED, Refer should be ENABLED
        symptoms: 'Persistent headache.',
        image_path: [], // No images for this one
        submitted_at: '2023-10-27T15:00:00Z',
        consent: 'treatment', // Consent allows referral
        patient: { name: 'Jane Smith', age: 45, gender: 'Female' },
    },
    {
        id: 3,
        status: 'Diagnosed', // Assign should be DISABLED, Refer should be DISABLED due to consent
        symptoms: 'Allergic reaction on skin.',
        image_path: [],
        submitted_at: '2023-10-26T11:00:00Z',
        consent: 'referral', // Consent PREVENTS another referral
        patient: { name: 'Sam Jones', age: 28, gender: 'Non-binary' },
    },
];

describe('SubmissionList Component', () => {
    // Setup default props with mock functions
    const defaultProps = {
        getStatusIcon: (status) => <span>{status} Icon</span>,
        getStatusColor: (status) => `status-color-${status}`,
        formatDate: (date) => new Date(date).toLocaleDateString(),
        handleViewClick: jest.fn(),
        handleAssignClick: jest.fn(),
        handleReferClick: jest.fn(),
    };

    // Clear mock function calls before each test
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders nothing when the submissions array is empty', () => {
        const { container } = render(<SubmissionList {...defaultProps} submissions={[]} />);
        // The main container div should be empty
        expect(container.querySelector('.submissions-list').innerHTML).toBe('');
        // A specific element like a patient name should not be found
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    test('renders a submission card with all patient and symptom details', () => {
        render(<SubmissionList {...defaultProps} submissions={[mockSubmissions[0]]} />);

        const card = screen.getByText('John Doe').closest('.submission-card');

        expect(within(card).getByText('John Doe')).toBeInTheDocument();
        expect(within(card).getByText('34 years • Male')).toBeInTheDocument();
        expect(within(card).getByText(/Fever, cough, and a runny nose./i)).toBeInTheDocument();

        expect(within(card).getByText('Pending')).toBeInTheDocument();
        expect(within(card).getByText(`Submitted: ${defaultProps.formatDate(mockSubmissions[0].submitted_at)}`)).toBeInTheDocument();
        expect(within(card).getByAltText('Symptom 1')).toBeInTheDocument();
    });

    test('does not render the images section if image_path is empty', () => {
        render(<SubmissionList {...defaultProps} submissions={[mockSubmissions[1]]} />);

        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        // Query for the heading of the images section
        expect(screen.queryByRole('heading', { name: /uploaded images/i })).not.toBeInTheDocument();
    });

    test('calls the correct handler when the "View" button is clicked', () => {
        render(<SubmissionList {...defaultProps} submissions={mockSubmissions} />);

        // Find the card for 'John Doe' to avoid ambiguity
        const johnsCard = screen.getByText('John Doe').closest('.submission-card');
        const viewButton = within(johnsCard).getByRole('button', { name: /view/i });

        fireEvent.click(viewButton);

        expect(defaultProps.handleViewClick).toHaveBeenCalledTimes(1);
        expect(defaultProps.handleViewClick).toHaveBeenCalledWith(mockSubmissions[0]);
    });

    test('handles button disabled states correctly based on submission status and consent', () => {
        render(<SubmissionList {...defaultProps} submissions={mockSubmissions} />);

        // Case 1: 'Pending' status (John Doe's card)
        const johnsCard = screen.getByText('John Doe').closest('.submission-card');
        const assignButtonJohn = within(johnsCard).getByRole('button', { name: /assign/i });
        const referButtonJohn = within(johnsCard).getByRole('button', { name: /refer/i });

        expect(assignButtonJohn).not.toBeDisabled(); // Should be ENABLED for 'Pending'
        expect(referButtonJohn).toBeDisabled();       // Should be DISABLED

        // Case 2: 'Diagnosed' status with valid consent (Jane Smith's card)
        const janesCard = screen.getByText('Jane Smith').closest('.submission-card');
        const assignButtonJane = within(janesCard).getByRole('button', { name: /assign/i });
        const referButtonJane = within(janesCard).getByRole('button', { name: /refer/i });

        expect(assignButtonJane).toBeDisabled();     // Should be DISABLED
        expect(referButtonJane).not.toBeDisabled(); // Should be ENABLED for 'Diagnosed'

        // Case 3: 'Diagnosed' status with referral consent (Sam Jones's card)
        const samsCard = screen.getByText('Sam Jones').closest('.submission-card');
        const referButtonSam = within(samsCard).getByRole('button', { name: /refer/i });

        expect(referButtonSam).toBeDisabled(); // Should be DISABLED due to consent
    });

    test('calls assign and refer handlers when their respective buttons are clicked', () => {
        render(<SubmissionList {...defaultProps} submissions={mockSubmissions} />);

        // Click the Assign button on the 'Pending' submission
        const johnsCard = screen.getByText('John Doe').closest('.submission-card');
        fireEvent.click(within(johnsCard).getByRole('button', { name: /assign/i }));

        expect(defaultProps.handleAssignClick).toHaveBeenCalledTimes(1);
        expect(defaultProps.handleAssignClick).toHaveBeenCalledWith(mockSubmissions[0]);

        // Click the Refer button on the 'Diagnosed' submission
        const janesCard = screen.getByText('Jane Smith').closest('.submission-card');
        fireEvent.click(within(janesCard).getByRole('button', { name: /refer/i }));

        expect(defaultProps.handleReferClick).toHaveBeenCalledTimes(1);
        expect(defaultProps.handleReferClick).toHaveBeenCalledWith(mockSubmissions[1]);
    });
});