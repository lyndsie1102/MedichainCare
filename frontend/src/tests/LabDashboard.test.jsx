import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LabStaffDashboard from '../pages/LabDashboard';



// Mock API calls
jest.mock('../api/lab-apis.js', () => ({
    getTestRequests: jest.fn(),
    uploadLabResult: jest.fn(),
    getLabStaffInfo: jest.fn(),
    appointmentSchedule: jest.fn(),
    cancelAppointment: jest.fn(),
}));

jest.mock('../api/user-apis.js', () => ({
    logout: jest.fn(),
}));

// Mock child components to test props and interactions
jest.mock('../components/TestRequestList.jsx', () => ({ filteredRequests, handleUploadClick, handleScheduleClick }) => (
    <div data-testid="test-request-list">
        {filteredRequests.map(req => (
            <div key={req.id}>
                <span>{req.patient_name}</span>
                <button onClick={() => handleUploadClick(req)}>Upload for {req.patient_name}</button>
                <button onClick={() => handleScheduleClick(req)}>Schedule for {req.patient_name}</button>
            </div>
        ))}
    </div>
));

jest.mock('../components/UploadResultsModal.jsx', () => ({ onUpload, onClose }) => (
    <div data-testid="upload-modal">
        <button onClick={onUpload}>Confirm Upload</button>
        <button onClick={onClose}>Close Upload Modal</button>
    </div>
));

jest.mock('../components/ScheduleModal.jsx', () => ({ handleConfirmAppointment, handleCloseModal }) => (
    <div data-testid="schedule-modal">
        <button onClick={handleConfirmAppointment}>Confirm Schedule</button>
        <button onClick={handleCloseModal}>Close Schedule Modal</button>
    </div>
));

jest.mock('../components/LogoutModal.jsx', () => ({ showModal, onConfirmLogout }) => (
    showModal ? <div data-testid="logout-modal"><button onClick={onConfirmLogout}>Confirm Logout</button></div> : null
));

// Mock utility functions
jest.mock('../utils/BlockchainInteract', () => ({
    setupBlockchain: jest.fn(),
    updateTestResultsOnBlockchain: jest.fn(),
    getEthAddress: () => '0x1234...5678', // Return a static mock address
}));

jest.mock('../utils/Helpers', () => ({
    formatAddress: () => '0x12...678', // Return a static short address
    copyAddressToClipboard: jest.fn(),
    getRequestStatusColor: jest.fn(),
    getRequestStatusIcon: jest.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: key => store[key] || null,
        setItem: (key, value) => {
            store[key] = value.toString();
        },
        removeItem: key => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Import the mocked APIs to use in tests
const { getLabStaffInfo, getTestRequests, uploadLabResult } = require('../api/lab-apis.js');
const { logout } = require('../api/user-apis.js');
const { setupBlockchain, updateTestResultsOnBlockchain } = require('../utils/BlockchainInteract');


// Mock data for tests
const mockLabStaff = { name: 'Dr. Emily Carter' };
const mockTestRequests = [
    { id: 1, patient_name: 'John Doe', doctor: { name: 'Dr. Smith' }, testType: 'Blood Test', status: 'Pending', appointment_status: 'Scheduled', upload_token: 'token123' },
    { id: 2, patient_name: 'Jane Smith', doctor: { name: 'Dr. Jones' }, testType: 'X-Ray', status: 'Pending', appointment_status: null },
    { id: 3, patient_name: 'Peter Pan', doctor: { name: 'Dr. Smith' }, testType: 'MRI Scan', status: 'Uploaded', appointment_status: 'Scheduled' },
];


describe('LabStaffDashboard', () => {

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();
        window.localStorage.setItem('access_token', 'fake_token');

        // Mock successful API responses by default
        getLabStaffInfo.mockResolvedValue(mockLabStaff);
        getTestRequests.mockResolvedValue(mockTestRequests);
        uploadLabResult.mockResolvedValue({ message: 'Success' });
        logout.mockResolvedValue({ status: 200 });
        setupBlockchain.mockResolvedValue(true);
        updateTestResultsOnBlockchain.mockResolvedValue(true);

        // Mock alert
        global.alert = jest.fn();
    });

    test('renders dashboard and fetches initial data', async () => {
        render(<LabStaffDashboard />);

        // Check if initial data fetching functions are called
        expect(getLabStaffInfo).toHaveBeenCalledTimes(1);
        expect(getTestRequests).toHaveBeenCalledTimes(1);

        // Check for loading state initially
        expect(screen.getByText('Loading...')).toBeInTheDocument();

        // Wait for data to be loaded and check for rendered content
        expect(await screen.findByText('Dr. Emily Carter')).toBeInTheDocument();
        expect(await screen.findByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    test('filters requests based on search term', async () => {
        render(<LabStaffDashboard />);
        await screen.findByText('John Doe'); // Ensure data is loaded

        const searchInput = screen.getByPlaceholderText('Search patients, doctors, or tests...');
        await userEvent.type(searchInput, 'Jane');

        // Check that only matching requests are rendered in the mocked list
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });


    test('opens and closes the upload modal', async () => {
        render(<LabStaffDashboard />);
        await screen.findByText('John Doe');

        // Modal should not be visible initially
        expect(screen.queryByTestId('upload-modal')).not.toBeInTheDocument();

        // Click the upload button for a specific request
        const uploadButton = screen.getByText('Upload for John Doe');
        await userEvent.click(uploadButton);

        // Modal should now be visible
        expect(screen.getByTestId('upload-modal')).toBeInTheDocument();

        // Click the close button inside the mocked modal
        const closeButton = screen.getByText('Close Upload Modal');
        await userEvent.click(closeButton);

        // Modal should be gone
        expect(screen.queryByTestId('upload-modal')).not.toBeInTheDocument();
    });


    test('handles user logout', async () => {
        // Mock window.location
        const originalLocation = window.location;
        delete window.location;
        window.location = { href: '' };

        render(<LabStaffDashboard />);
        await screen.findByText('Dr. Emily Carter');

        // 1. Open user dropdown
        await userEvent.click(screen.getByText('Dr. Emily Carter'));

        // 2. Click logout button
        await userEvent.click(screen.getByText('Log Out'));

        // 3. Confirm logout modal is shown
        expect(screen.getByTestId('logout-modal')).toBeInTheDocument();

        // 4. Click confirm logout
        await userEvent.click(screen.getByText('Confirm Logout'));

        // 5. Assert API was called and navigation occurred
        expect(logout).toHaveBeenCalledWith('fake_token');
        await waitFor(() => {
            expect(window.localStorage.getItem('access_token')).toBeNull();
            expect(window.location.href).toBe('/login');
        });

        // Restore window.location
        window.location = originalLocation;
    });
});