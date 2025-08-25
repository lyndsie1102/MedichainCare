import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import SubmissionHistory from '../components/SubmissionHistory';

// Mock helper functions as they are not the focus of this component test
jest.mock('../utils/Helpers', () => ({
  formatDate: (date) => new Date(date).toLocaleDateString(),
  getSymptomStatusIcon: (status) => <span>{status} Icon</span>,
  getSymptomStatusColor: (status) => `status-color-${status.replace(' ', '-')}`,
}));

// Mock data for our tests
const mockSubmissions = [
  {
    id: 1,
    submitted_at: '2023-10-27T10:00:00Z',
    symptoms: 'Fever and cough.',
    status: 'Diagnosed',
    images: ['image1.jpg'], // This one has an image
  },
  {
    id: 2,
    submitted_at: '2023-10-26T14:30:00Z',
    symptoms: 'Headache and fatigue.',
    status: 'Pending',
    images: [], // This one does not
  },
];

describe('SubmissionHistory Component', () => {
  // A helper function to render the component with default or custom props
  const renderComponent = (props) => {
    const defaultProps = {
      submissions: [],
      handleViewClick: jest.fn(),
      setStatusFilter: jest.fn(),
      setStartDate: jest.fn(),
      setEndDate: jest.fn(),
    };
    return render(<SubmissionHistory {...defaultProps} {...props} />);
  };

  test('renders the main title and filter section correctly', () => {
    renderComponent();
    expect(screen.getByRole('heading', { name: /submission history/i })).toBeInTheDocument();
    expect(screen.getByText(/filters/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();

    expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
  });

  test('displays a message when there are no submissions', () => {
    renderComponent({ submissions: [] });
    expect(screen.getByText(/no submissions yet/i)).toBeInTheDocument();
    // Ensure no submission cards are rendered
    expect(screen.queryByText(/fever and cough/i)).not.toBeInTheDocument();
  });

  test('renders a list of submissions when data is provided', () => {
    renderComponent({ submissions: mockSubmissions });

    // Ensure the empty message is NOT present
    expect(screen.queryByText(/no submissions yet/i)).not.toBeInTheDocument();

    // Check for content from the first submission
    const firstSubmissionCard = screen.getByText('Fever and cough.').closest('.submission-card');
    expect(within(firstSubmissionCard).getByText('Diagnosed')).toBeInTheDocument();
    expect(within(firstSubmissionCard).getByText(/image attached/i)).toBeInTheDocument();

    // Check for content from the second submission
    const secondSubmissionCard = screen.getByText('Headache and fatigue.').closest('.submission-card');
    expect(within(secondSubmissionCard).getByText('Pending')).toBeInTheDocument();

    // Check that there are two "View" buttons, one for each card
    expect(screen.getAllByRole('button', { name: /view/i })).toHaveLength(2);
  });

  test('calls filter set functions when filter values change', () => {
    const mockSetStatusFilter = jest.fn();
    const mockSetStartDate = jest.fn();
    const mockSetEndDate = jest.fn();

    renderComponent({
      setStatusFilter: mockSetStatusFilter,
      setStartDate: mockSetStartDate,
      setEndDate: mockSetEndDate,
    });

    // Simulate changing the status filter
    fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'Pending' } });
    expect(mockSetStatusFilter).toHaveBeenCalledWith('Pending');

    // Simulate changing the start date
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2023-01-01' } });
    expect(mockSetStartDate).toHaveBeenCalledWith('2023-01-01');

    // Simulate changing the end date
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2023-12-31' } });
    expect(mockSetEndDate).toHaveBeenCalledWith('2023-12-31');
  });

  test('calls handleViewClick with the correct submission when "View" is clicked', () => {
    const mockHandleViewClick = jest.fn();
    renderComponent({ submissions: mockSubmissions, handleViewClick: mockHandleViewClick });

    // Get all view buttons and click the first one
    const viewButtons = screen.getAllByRole('button', { name: /view/i });
    fireEvent.click(viewButtons[0]);

    // Expect the handler to be called once with the first submission object
    expect(mockHandleViewClick).toHaveBeenCalledTimes(1);
    expect(mockHandleViewClick).toHaveBeenCalledWith(mockSubmissions[0]);
  });

  test('calls filter set functions with default values when "Clear All" is clicked', () => {
    const mockSetStatusFilter = jest.fn();
    const mockSetStartDate = jest.fn();
    const mockSetEndDate = jest.fn();

    renderComponent({
      setStatusFilter: mockSetStatusFilter,
      setStartDate: mockSetStartDate,
      setEndDate: mockSetEndDate,
    });

    fireEvent.click(screen.getByRole('button', { name: /clear all/i }));

    expect(mockSetStatusFilter).toHaveBeenCalledWith('all');
    expect(mockSetStartDate).toHaveBeenCalledWith('');
    expect(mockSetEndDate).toHaveBeenCalledWith('');
  });
});