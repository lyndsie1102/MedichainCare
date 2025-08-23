import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LogoutModal from '../components/LogoutModal';


jest.mock('lucide-react', () => ({
    X: () => <span aria-label="Close modal">X</span>,
    LogOut: () => <span aria-label="Logout icon" />,
}));


describe('LogoutModal Component', () => {

    const mockOnConfirmLogout = jest.fn();
    const mockOnCancelLogout = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should not render when showModal prop is false', () => {
        // Render the component with showModal={false}
        render(
            <LogoutModal
                showModal={false}
                onConfirmLogout={mockOnConfirmLogout}
                onCancelLogout={mockOnCancelLogout}
            />
        );

        const modalTitle = screen.queryByText('Confirm Logout');
        expect(modalTitle).not.toBeInTheDocument();
    });

    test('should render correctly when showModal prop is true', () => {
        // Render the component with showModal={true}
        render(
            <LogoutModal
                showModal={true}
                onConfirmLogout={mockOnConfirmLogout}
                onCancelLogout={mockOnCancelLogout}
            />
        );

        // Assert that all key elements are visible
        expect(screen.getByText(/Confirm Logout/i)).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to log out?/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Logout/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Close modal/i })).toBeInTheDocument();
    });

    test('should call onConfirmLogout when the confirm button is clicked', () => {
        render(
            <LogoutModal
                showModal={true}
                onConfirmLogout={mockOnConfirmLogout}
                onCancelLogout={mockOnCancelLogout}
            />
        );

        // Find the Logout button and click it
        const confirmButton = screen.getByRole('button', { name: /Logout/i  });
        fireEvent.click(confirmButton);

        // Assert that the confirm function was called, and the cancel function was not
        expect(mockOnConfirmLogout).toHaveBeenCalledTimes(1);
        expect(mockOnCancelLogout).not.toHaveBeenCalled();
    });

    test('should call onCancelLogout when the cancel button is clicked', () => {
        render(
            <LogoutModal
                showModal={true}
                onConfirmLogout={mockOnConfirmLogout}
                onCancelLogout={mockOnCancelLogout}
            />
        );

        // Find the Cancel button and click it
        const cancelButton = screen.getByRole('button', { name: /Cancel/i });
        fireEvent.click(cancelButton);

        // Assert that the cancel function was called, and the confirm function was not
        expect(mockOnCancelLogout).toHaveBeenCalledTimes(1);
        expect(mockOnConfirmLogout).not.toHaveBeenCalled();
    });

    test('should call onCancelLogout when the close (X) button is clicked', () => {
        render(
            <LogoutModal
                showModal={true}
                onConfirmLogout={mockOnConfirmLogout}
                onCancelLogout={mockOnCancelLogout}
            />
        );

        // Find the close button by its accessible name (from mock) and click it
        const closeButton = screen.getByRole('button', { name: /Close modal/i });
        fireEvent.click(closeButton);

        // Assert that the cancel function was called, and the confirm function was not
        expect(mockOnCancelLogout).toHaveBeenCalledTimes(1);
        expect(mockOnConfirmLogout).not.toHaveBeenCalled();
    });
});