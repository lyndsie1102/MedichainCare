import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import TestRequestList from '../components/TestRequestList'; // Adjust path if necessary

// Mock the helper functions
jest.mock('../utils/Helpers', () => ({
  getRequestStatusColor: (status) => `status-color-${status}`,
  getRequestStatusIcon: (status) => <span>{status} Icon</span>,
  formatDate: (date) => new Date(date).toLocaleDateString(),
}));

// Comprehensive mock data covering all UI states
const mockRequests = [
  { // State 1: Pending, not scheduled
    id: 1,
    status: 'Pending',
    appointment_status: null,
    appointment_schedule: null,
    test_type: 'Blood Test',
    patient_name: 'John Smith',
    patient_age: 45,
    request_time: '2023-10-28T10:00:00Z',
    doctor: { name: 'Dr. Adams', specialty: 'Cardiology' },
  },
  { // State 2: Scheduled
    id: 2,
    status: 'Scheduled',
    appointment_status: 'Scheduled',
    appointment_schedule: '2023-11-15T14:30:00Z',
    test_type: 'X-Ray',
    patient_name: 'Jane Doe',
    patient_age: 32,
    request_time: '2023-10-27T11:00:00Z',
    doctor: { name: 'Dr. Bell', specialty: 'Orthopedics' },
  },
  { // State 3: Uploaded results
    id: 3,
    status: 'Uploaded',
    appointment_status: 'Scheduled',
    appointment_schedule: '2023-11-10T09:00:00Z',
    test_type: 'MRI Scan',
    patient_name: 'Peter Jones',
    patient_age: 55,
    request_time: '2023-10-26T12:00:00Z',
    doctor: { name: 'Dr. Carter', specialty: 'Neurology' },
  },
  { // State 4: Cancelled appointment
    id: 4,
    status: 'Pending',
    appointment_status: 'Cancelled',
    appointment_schedule: null,
    test_type: 'Ultrasound',
    patient_name: 'Mary White',
    patient_age: 28,
    request_time: '2023-10-25T13:00:00Z',
    doctor: { name: 'Dr. Davis', specialty: 'Radiology' },
  },
];

describe('TestRequestList Component', () => {
  const mockHandleUploadClick = jest.fn();
  const mockHandleScheduleClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (requests) => {
    return render(
      <TestRequestList
        filteredRequests={requests}
        handleUploadClick={mockHandleUploadClick}
        handleScheduleClick={mockHandleScheduleClick}
      />
    );
  };

  test('renders nothing when filteredRequests is empty', () => {
    const { container } = renderComponent([]);
    expect(container.querySelector('.lab-requests-list').innerHTML).toBe('');
    expect(screen.queryByText('Dr. Adams')).not.toBeInTheDocument();
  });

  test('renders all requests with correct static data', () => {
    renderComponent(mockRequests);
    expect(screen.getByText('Dr. Adams')).toBeInTheDocument();
    expect(screen.getByText('Patient: John Smith, 45 years')).toBeInTheDocument();
    expect(screen.getByText('Blood Test')).toBeInTheDocument();

    expect(screen.getByText('Dr. Bell')).toBeInTheDocument();
    expect(screen.getByText('Patient: Jane Doe, 32 years')).toBeInTheDocument();
    expect(screen.getByText('X-Ray')).toBeInTheDocument();
  });

  test('displays correct appointment status and schedule button text for each card', () => {
    renderComponent(mockRequests);

    // Card 1: Not confirmed
    const card1 = screen.getByText('Patient: John Smith, 45 years').closest('.lab-request-card');
    expect(within(card1).getByText('Not confirmed')).toBeInTheDocument();
    expect(within(card1).getByRole('button', { name: /schedule/i })).toBeInTheDocument();

    // Card 2: Scheduled with date
    const card2 = screen.getByText('Patient: Jane Doe, 32 years').closest('.lab-request-card');
    expect(within(card2).getByText(/Nov 15 at 14:30/i)).toBeInTheDocument();
    expect(within(card2).getByRole('button', { name: /cancel appointment/i })).toBeInTheDocument();

    // Card 4: Cancelled
    const card4 = screen.getByText('Patient: Mary White, 28 years').closest('.lab-request-card');
    expect(within(card4).getByText('Cancelled')).toBeInTheDocument();
    expect(within(card4).getByRole('button', { name: /schedule/i })).toBeInTheDocument();
  });

  test('correctly enables or disables action buttons based on request status', () => {
    renderComponent(mockRequests);
    
    // Card 1: Pending (Schedule: enabled, Upload: disabled)
    const card1 = screen.getByText('Patient: John Smith, 45 years').closest('.lab-request-card');
    expect(within(card1).getByRole('button', { name: /schedule/i })).toBeEnabled();
    expect(within(card1).getByRole('button', { name: /upload results/i })).toBeDisabled();
    
    // Card 2: Scheduled (Schedule: enabled, Upload: enabled)
    const card2 = screen.getByText('Patient: Jane Doe, 32 years').closest('.lab-request-card');
    expect(within(card2).getByRole('button', { name: /cancel appointment/i })).toBeEnabled();
    expect(within(card2).getByRole('button', { name: /upload results/i })).toBeEnabled();
    
    // Card 3: Uploaded (Schedule: disabled, Upload: disabled)
    const card3 = screen.getByText('Patient: Peter Jones, 55 years').closest('.lab-request-card');
    expect(within(card3).getByRole('button', { name: /cancel appointment/i })).toBeDisabled();
    expect(within(card3).getByRole('button', { name: /upload results/i })).toBeDisabled();
    
    // Card 4: Cancelled (Schedule: enabled, Upload: disabled)
    const card4 = screen.getByText('Patient: Mary White, 28 years').closest('.lab-request-card');
    expect(within(card4).getByRole('button', { name: /schedule/i })).toBeEnabled();
    expect(within(card4).getByRole('button', { name: /upload results/i })).toBeDisabled();
  });

  test('calls handlers with the correct request object on button click', () => {
    renderComponent(mockRequests);

    // Click "Schedule" on the first card
    const card1 = screen.getByText('Patient: John Smith, 45 years').closest('.lab-request-card');
    fireEvent.click(within(card1).getByRole('button', { name: /schedule/i }));
    
    expect(mockHandleScheduleClick).toHaveBeenCalledTimes(1);
    expect(mockHandleScheduleClick).toHaveBeenCalledWith(mockRequests[0]);

    // Click "Upload Results" on the second card
    const card2 = screen.getByText('Patient: Jane Doe, 32 years').closest('.lab-request-card');
    fireEvent.click(within(card2).getByRole('button', { name: /upload results/i }));

    expect(mockHandleUploadClick).toHaveBeenCalledTimes(1);
    expect(mockHandleUploadClick).toHaveBeenCalledWith(mockRequests[1]);
  });
});