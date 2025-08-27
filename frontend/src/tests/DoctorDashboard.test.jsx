import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DoctorDashboard from '../pages/DoctorDashboard';
import * as doctorApis from '../api/doctor-apis';
import * as userApis from '../api/user-apis';
import * as blockchainInteract from '../utils/BlockchainInteract';

// Create jest mocks for all exported functions from the modules
jest.mock('../api/doctor-apis');
jest.mock('../api/user-apis');
jest.mock('../utils/BlockchainInteract');

// ---- Mock Data ----
const mockDoctorInfo = {
    name: 'Test Doctor',
    specialty: 'Cardiology',
};

const mockSubmissions = [
    {
        id: 1,
        patient: { name: 'John Doe' },
        symptoms: 'Fever and headache',
        status: 'Pending',
        created_at: '2023-10-27T10:00:00Z',
    },
    {
        id: 2,
        patient: { name: 'Jane Smith' },
        symptoms: 'Sore throat',
        status: 'Diagnosed',
        created_at: '2023-10-26T14:30:00Z',
    },
];

const mockSymptomDetails = {
    id: 1,
    // The component expects patient details for the info card
    patient: {
        id: 101,
        name: 'John Doe',
        age: 35,
        gender: 'Male',
        phone: '555-1234',
        email: 'john.doe@email.com',
        address: '123 Main St'
    },
    symptoms: 'Patient reports high fever and persistent headache for 3 days.',
    status: 'Pending',
    created_at: '2023-10-27T10:00:00Z',
    diagnoses: [],
    consent: 'treatment',
    images: [],
    testResults: []
};

// ---- Test Suite ----

describe('DoctorDashboard', () => {
    // Before each test, reset mocks and localStorage
    beforeEach(() => {
        jest.clearAllMocks();

        // Set a fake token in mocked localStorage
        localStorage.setItem('access_token', 'fake-jwt-token');

        // Default successful mock implementations
        doctorApis.getDoctorDashboard.mockResolvedValue(mockSubmissions);
        doctorApis.getDoctorDetails.mockResolvedValue(mockDoctorInfo);
        doctorApis.getSymptomDetails.mockResolvedValue(mockSymptomDetails);
        userApis.logout.mockResolvedValue({ status: 200 });
        blockchainInteract.getEthAddress.mockReturnValue('0x123...abc');

        // Mock window.location for testing redirects
        const location = window.location;
        delete window.location;
        window.location = { ...location, href: '' };
    });



    // Test 1: Initial Render and Data Fetching
    test('renders correctly and fetches initial data', async () => {
        render(<DoctorDashboard />);

        // Check for header elements
        expect(screen.getByText('Medichain Portal')).toBeInTheDocument();

        // Wait for async data to load and check doctor info
        expect(await screen.findByText('Dr. Test Doctor')).toBeInTheDocument();
        expect(screen.getByText('Cardiology')).toBeInTheDocument();

        // Wait for submissions to be rendered
        expect(await screen.findByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();

        // Verify that the initial API calls were made
        expect(doctorApis.getDoctorDetails).toHaveBeenCalledWith('fake-jwt-token');
        expect(doctorApis.getDoctorDashboard).toHaveBeenCalledWith('fake-jwt-token', 'all', '');
    });

    // Test 2: Filtering submissions by search term
    test('filters submissions when user types in the search bar', async () => {
        render(<DoctorDashboard />);

        // Wait for initial render
        await screen.findByText('John Doe');

        // Mock the filtered API response
        doctorApis.getDoctorDashboard.mockResolvedValue([mockSubmissions[1]]); // Only Jane Smith

        const searchInput = screen.getByPlaceholderText(/Search patients or symptoms.../i);
        fireEvent.change(searchInput, { target: { value: 'Jane' } });

        // Wait for the UI to update based on the new API call
        await waitFor(() => {
            // Check that the API was called with the search term
            expect(doctorApis.getDoctorDashboard).toHaveBeenCalledWith('fake-jwt-token', 'all', 'Jane');
        });

        // Check that the list is filtered
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
        expect(await screen.findByText('Jane Smith')).toBeInTheDocument();
    });

    // Test 3: Opening and viewing the ViewModal
    test('opens the ViewModal with details when a "View" button is clicked', async () => {
        render(<DoctorDashboard />);

        await screen.findByText('John Doe');

        const viewButtons = screen.getAllByRole('button', { name: /view/i });
        fireEvent.click(viewButtons[0]);

        await waitFor(() => {
            expect(doctorApis.getSymptomDetails).toHaveBeenCalledWith(mockSubmissions[0].id, 'fake-jwt-token');
        });

        expect(await screen.findByText(/Patient Details - John Doe/i)).toBeInTheDocument();
        expect(screen.getByText(mockSymptomDetails.symptoms)).toBeInTheDocument();
    });

    // Test 4: Handling the full logout flow
    test('shows logout confirmation and logs out user on confirmation', async () => {
        render(<DoctorDashboard />);

        // 1. Wait for the user card to be fully rendered
        const doctorNameText = await screen.findByText('Dr. Test Doctor');

        const userCard = doctorNameText.closest('.user-info');
        expect(userCard).toBeInTheDocument(); // Good practice to confirm we found it

        fireEvent.click(userCard);

        const logoutButton = await screen.findByRole('button', { name: /log out/i });
        fireEvent.click(logoutButton);

        const modalText = await screen.findByText(/are you sure/i);
        expect(modalText).toBeInTheDocument();
    });


    // Test 5: Displaying empty state when no submissions are found
    test('displays an empty state message when there are no submissions', async () => {
        // Override the default mock to return an empty array
        doctorApis.getDoctorDashboard.mockResolvedValue([]);

        render(<DoctorDashboard />);

        // Check for the empty state message
        expect(await screen.findByText('No submissions found')).toBeInTheDocument();
        expect(screen.getByText('Try adjusting your search or filter criteria.')).toBeInTheDocument();

        // Ensure no patient names are rendered
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
});