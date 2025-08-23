import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScheduleAppointmentModal from '../components/ScheduleModal';


// Mock Lucide icons for simplicity and to add accessible names where needed
jest.mock('lucide-react', () => ({
    User: () => null,
    TestTube: () => null,
    Clock: () => null,
    Calendar: () => null,
    CalendarDays: () => null,
    X: () => <span aria-label="Close modal">X</span>,
}));


// Mock data to be used in the tests
const mockRequest = {
    patient_name: 'John Smith',
    test_type: 'Complete Blood Count',
    status: 'Pending Lab Schedule',
};

describe('ScheduleAppointmentModal Component', () => {

    // Helper function to render the component with default and overrideable props
    const renderComponent = (props = {}) => {
        const defaultProps = {
            selectedRequest: mockRequest,
            selectedDateTime: '',
            setSelectedDateTime: jest.fn(),
            isModifyingAppointment: false,
            handleCloseModal: jest.fn(),
            handleCancelAppointment: jest.fn(),
            handleConfirmAppointment: jest.fn(),
        };
        return render(<ScheduleAppointmentModal {...defaultProps} {...props} />);
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Schedule Mode', () => {
        test('renders correctly in "Schedule" mode', () => {
            renderComponent({ isModifyingAppointment: false });
            const patientLabel = screen.getByText('Patient:');
            const testLabel = screen.getByText('Test:');

            // Check title and patient details
            expect(screen.getByText(/Schedule Appointment for John Smith/i)).toBeInTheDocument();
            expect(patientLabel.parentElement).toHaveTextContent(/Patient: John Smith/i);

            // Check for the date/time input
            expect(screen.getByLabelText(/Date & Time:/i)).toBeInTheDocument();
            expect(testLabel.parentElement).toHaveTextContent(/Test: Complete Blood Count/i);

            // Check for the correct action buttons
            const confirmButton = screen.getByRole('button', { name: /Confirm Appointment/i });
            expect(confirmButton).toBeInTheDocument();
            expect(confirmButton).toBeDisabled(); // Should be disabled initially
            expect(screen.queryByRole('button', { name: /Cancel Appointment/i })).not.toBeInTheDocument();
        });

        test('calls setSelectedDateTime when the date input changes', () => {
            const setSelectedDateTime = jest.fn();
            renderComponent({ setSelectedDateTime });

            const dateInput = screen.getByLabelText(/Date & Time:/i);
            const newDateTime = '2024-08-15T14:30';
            fireEvent.change(dateInput, { target: { value: newDateTime } });

            expect(setSelectedDateTime).toHaveBeenCalledWith(newDateTime);
        });

        test('enables the confirm button only when a date is selected', () => {
            // Render with no date selected initially
            const { rerender } = renderComponent({ selectedDateTime: '' });
            expect(screen.getByRole('button', { name: /Confirm Appointment/i })).toBeDisabled();

            // Rerender with a date selected (simulating parent state update)
            rerender(
                <ScheduleAppointmentModal
                    selectedRequest={mockRequest}
                    selectedDateTime="2024-08-15T14:30"
                    setSelectedDateTime={jest.fn()}
                    isModifyingAppointment={false}
                    handleCloseModal={jest.fn()}
                    handleCancelAppointment={jest.fn()}
                    handleConfirmAppointment={jest.fn()}
                />
            );
            expect(screen.getByRole('button', { name: /Confirm Appointment/i })).not.toBeDisabled();
        });

        test('calls handleConfirmAppointment when the confirm button is clicked', () => {
            const handleConfirmAppointment = jest.fn();
            renderComponent({ handleConfirmAppointment, selectedDateTime: '2024-08-15T14:30' });

            const confirmButton = screen.getByRole('button', { name: /Confirm Appointment/i });
            fireEvent.click(confirmButton);

            expect(handleConfirmAppointment).toHaveBeenCalledTimes(1);
        });
    });

    describe('Cancel/Modify Mode', () => {
        test('renders correctly in "Cancel" mode', () => {
            renderComponent({ isModifyingAppointment: true });

            // Check title
            expect(screen.getByText(/Cancel Appointment for John Smith/i)).toBeInTheDocument();

            // Check for the correct action buttons
            const cancelAppointmentButton = screen.getByRole('button', { name: /Cancel Appointment/i });
            expect(cancelAppointmentButton).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /Confirm Appointment/i })).not.toBeInTheDocument();
        });

        test('calls handleCancelAppointment when the cancel appointment button is clicked', () => {
            const handleCancelAppointment = jest.fn();
            renderComponent({ isModifyingAppointment: true, handleCancelAppointment });

            const cancelAppointmentButton = screen.getByRole('button', { name: /Cancel Appointment/i });
            fireEvent.click(cancelAppointmentButton);

            expect(handleCancelAppointment).toHaveBeenCalledTimes(1);
        });
    });

    describe('Shared Functionality', () => {
        test('shows the appointment summary only when a date is selected', () => {
            const { rerender } = renderComponent({ selectedDateTime: '' });
            expect(screen.queryByText('Selected Appointment')).not.toBeInTheDocument();

            rerender(
                <ScheduleAppointmentModal
                    selectedRequest={mockRequest}
                    selectedDateTime="2024-08-15T14:30"
                    setSelectedDateTime={jest.fn()}
                    handleCloseModal={jest.fn()}
                />
            );

            expect(screen.getByText('Selected Appointment')).toBeInTheDocument();
            expect(screen.getByText('2024-08-15')).toBeInTheDocument(); // Check for date part
            expect(screen.getByText(/2:30 PM/i)).toBeInTheDocument(); // Check for time part
        });

        test('calls handleCloseModal when the generic cancel button is clicked', () => {
            const handleCloseModal = jest.fn();
            renderComponent({ handleCloseModal });

            const cancelButton = screen.getByRole('button', { name: 'Cancel' });
            fireEvent.click(cancelButton);

            expect(handleCloseModal).toHaveBeenCalledTimes(1);
        });

        test('calls handleCloseModal when the close (X) button is clicked', () => {
            const handleCloseModal = jest.fn();
            renderComponent({ handleCloseModal });

            const closeButton = screen.getByRole('button', { name: 'Close modal' });
            fireEvent.click(closeButton);

            expect(handleCloseModal).toHaveBeenCalledTimes(1);
        });
    });
});