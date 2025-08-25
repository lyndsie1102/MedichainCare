import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import UploadResultsModal from '../components/UploadResultsModal'; // Adjust path if necessary

describe('UploadResultsModal Component', () => {
  // Setup default props with mock functions for reusability
  const defaultProps = {
    selectedRequest: { patient_name: 'Jane Doe' },
    onClose: jest.fn(),
    onUpload: jest.fn(),
    onFileChange: jest.fn(),
    handleSummaryChange: jest.fn(),
    files: [],
    resultSummary: '',
    summaryError: null,
  };

  // Helper function to render the component with default or overridden props
  const renderComponent = (props = {}) => {
    return render(<UploadResultsModal {...defaultProps} {...props} />);
  };

  // Clear all mock function history before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly with initial props', () => {
    renderComponent();
    
    // Check the title includes the patient's name
    expect(screen.getByRole('heading', { name: /upload test results - jane doe/i })).toBeInTheDocument();
    
    // Check that the summary textarea is present and empty
    expect(screen.getByPlaceholderText(/add a brief description/i)).toHaveValue('');
    
    // Check initial character count
    expect(screen.getByText('0/500 characters')).toBeInTheDocument();
    
    // Ensure no error message is displayed initially
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  test('calls onClose when the close button is clicked', () => {
    renderComponent();
    // The close button has no text, so we find it by its role inside the header
    const closeButton = screen.getByRole('button', { name: '' }); // Or a more specific selector if needed
    fireEvent.click(closeButton);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  test('calls handleSummaryChange when the user types in the textarea', () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText(/add a brief description/i);
    fireEvent.change(textarea, { target: { value: 'Patient feels better.' } });
    expect(defaultProps.handleSummaryChange).toHaveBeenCalled();
  });

  test('displays the correct character count and adds warning class when over limit', () => {
    // Render with a summary prop to simulate parent state update
    const { rerender } = renderComponent({ resultSummary: 'Short summary' });
    const charCountElement = screen.getByText('13/500 characters');
    expect(charCountElement).toBeInTheDocument();
    expect(charCountElement).not.toHaveClass('lab-character-warning');

    // Re-render with a long summary
    const longText = 'a'.repeat(451);
    rerender(<UploadResultsModal {...defaultProps} resultSummary={longText} />);
    
    const longCharCountElement = screen.getByText('451/500 characters');
    expect(longCharCountElement).toBeInTheDocument();
    expect(longCharCountElement).toHaveClass('lab-character-warning');
  });

  test('displays a summary error message when summaryError prop is provided', () => {
    const errorMessage = 'Character limit exceeded.';
    renderComponent({ summaryError: errorMessage });
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toHaveClass('lab-summary-error');
  });

  test('calls onFileChange when a file is selected', () => {
    renderComponent();
    const fileInput = screen.getByLabelText(/click to select files/i);
    const file = new File(['(⌐□_□)'], 'test-result.pdf', { type: 'application/pdf' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    expect(defaultProps.onFileChange).toHaveBeenCalled();
  });

  test('calls onUpload when the "Confirm Upload" button is clicked', () => {
    renderComponent();
    const uploadButton = screen.getByRole('button', { name: /confirm upload/i });
    fireEvent.click(uploadButton);
    expect(defaultProps.onUpload).toHaveBeenCalledTimes(1);
  });
});