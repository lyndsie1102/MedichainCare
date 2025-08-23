import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LoginPage from '../pages/LoginPage'; // Adjust path if needed
import '@testing-library/jest-dom';


// Mock the custom API module used by the component
import { login } from '../api/user-apis';
jest.mock('../api/user-apis', () => ({
    login: jest.fn(),
}));

// Mock external libraries
import { jwtDecode } from 'jwt-decode';
jest.mock('jwt-decode', () => ({
    jwtDecode: jest.fn(),
}));

// Mock Lucide icons to prevent SVG rendering issues
jest.mock('lucide-react', () => ({
    Heart: () => null, User: () => null, Lock: () => null, Eye: () => null, EyeOff: () => null, Stethoscope: () => null, Shield: () => null,
}));

// Mock the react-router-dom hooks used in the component
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
    useParams: () => ({ role: 'patient' }),
}));

// Create a mock for localStorage to allow spying on its methods
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
        clear: () => { store = {}; },
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });



describe('LoginPage Component', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        jest.spyOn(window, 'alert').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('renders login form with username and password fields', () => {
        render(<MemoryRouter><LoginPage /></MemoryRouter>);

        expect(screen.getByPlaceholderText(/Enter your username or email/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Enter your password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    });

    test('has required fields', () => {
        render(<MemoryRouter><LoginPage /></MemoryRouter>);

        const usernameInput = screen.getByPlaceholderText(/Enter your username or email/i);
        const passwordInput = screen.getByPlaceholderText(/Enter your password/i);

        expect(usernameInput).toBeRequired();
        expect(passwordInput).toBeRequired();
    });

    test('should toggle password visibility on button click', () => {
        render(
            <MemoryRouter>
                <LoginPage />
            </MemoryRouter>
        );

        // Get password input and toggle button (now selecting by aria-label)
        const passwordInput = screen.getByPlaceholderText(/Enter your password/i);
        const toggleButton = screen.getByRole('button', { name: /show password/i });

        // Initially, the password should be hidden (input type should be 'password')
        expect(passwordInput.type).toBe('password');

        // Click the toggle button to show the password
        fireEvent.click(toggleButton);

        // After clicking, the password should be visible (input type should be 'text')
        expect(passwordInput.type).toBe('text');

        // Click the toggle button again to hide the password
        fireEvent.click(toggleButton);

        // After clicking again, the password should be hidden (input type should be 'password')
        expect(passwordInput.type).toBe('password');
    });

    test('handles successful login', async () => {
        // Arrange: Define what the mocked functions will return on success
        const mockToken = 'fake.jwt.token';
        login.mockResolvedValue({ access_token: mockToken });
        jwtDecode.mockReturnValue({ role: 1 }); // Role 1 maps to "patient"

        render(
            <MemoryRouter initialEntries={['/login/patient']}>
                <Routes>
                    <Route path="/login/:role" element={<LoginPage />} />
                    <Route path="/dashboard" element={<div>Dashboard Page</div>} />
                </Routes>
            </MemoryRouter>
        );

        // Act: Simulate user interaction
        fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'password123' } });
        fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

        // Assert: Check the results of the successful login
        await waitFor(() => {
            // Check that the alert was called with the success message
            expect(window.alert).toHaveBeenCalledWith('Login successful!');
        });

        // Check that localStorage was updated correctly
        expect(localStorage.setItem).toHaveBeenCalledWith('access_token', mockToken);
        expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify({ role: 'patient' }));

        // Check that navigation was triggered
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    test('handles login failure', async () => {
        // Arrange: Simulate an API error
        const errorMessage = 'Invalid credentials';
        login.mockRejectedValue(new Error(errorMessage));

        render(<MemoryRouter><LoginPage /></MemoryRouter>);

        // Act: Simulate user interaction
        fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'wronguser' } });
        fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'wrongpass' } });
        fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

        // Assert: Check the results of the failed login
        await waitFor(() => {
            // Check that the alert was called with the correct error message
            expect(window.alert).toHaveBeenCalledWith(`Login failed: ${errorMessage}`);
        });

        // Ensure no data was stored and no navigation occurred
        expect(localStorage.setItem).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});