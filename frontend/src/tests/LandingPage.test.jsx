import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useNavigate } from 'react-router-dom';
import LandingPage from '../pages/LandingPage'; 

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));
// ---------------------------------------------

describe('LandingPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders all static content, headers, and footers correctly', () => {
    render(<LandingPage />);

    // Check for the main header and hero text
    expect(screen.getByRole('heading', { name: 'HealthConnect', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /welcome to healthconnect/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/secure login for patients, doctors & lab staff/i)).toBeInTheDocument();

    // Check that all three role cards are rendered
    expect(screen.getByRole('heading', { name: /patient login/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /doctor login/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /lab staff login/i })).toBeInTheDocument();

    // Check for the features section and footer
    expect(screen.getByRole('heading', { name: /why choose healthconnect/i })).toBeInTheDocument();
    expect(screen.getByText(/© 2024 HealthConnect. All rights reserved./i)).toBeInTheDocument();
  });

  test('navigates to the patient login page when the patient button is clicked', () => {
    render(<LandingPage />);

    const patientLoginButton = screen.getByRole('button', { name: /login as patient/i });
    
    fireEvent.click(patientLoginButton);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/login/patient');
  });

  test('navigates to the doctor login page when the doctor button is clicked', () => {
    render(<LandingPage />);

    const doctorLoginButton = screen.getByRole('button', { name: /login as doctor/i });
    fireEvent.click(doctorLoginButton);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/login/doctor');
  });

  test('navigates to the lab staff login page when the lab staff button is clicked', () => {
    render(<LandingPage />);
    
    const labStaffCard = screen.getByRole('heading', { name: /lab staff login/i }).closest('.card');
    const labStaffLoginButton = within(labStaffCard).getByRole('button');

    fireEvent.click(labStaffLoginButton);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/login/lab');
  });
});