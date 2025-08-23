import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import '@testing-library/jest-dom';
import { getEthAddress } from '../utils/BlockchainInteract';

jest.mock('../utils/BlockchainInteract');

describe('App Routing Logic', () => {

  // This hook runs before each test, ensuring a clean localStorage for every test case.
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('Public and Static Routes', () => {
    test('renders LandingPage on the root route ("/")', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByText(/Welcome/i)).toBeInTheDocument();
    });

    test('renders LoginPage on the "/login/:role" route', () => {
      render(
        <MemoryRouter initialEntries={['/login/patient']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByText(/Secure Login/i)).toBeInTheDocument();
    });

    test('redirects to LandingPage for any unknown route', () => {
      render(
        <MemoryRouter initialEntries={['/some/non-existent/path']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByText(/Welcome/i)).toBeInTheDocument();
    });
  });

  describe('DashboardRouter Protected Logic', () => {
    test('redirects to LandingPage when accessing "/dashboard" without a user in localStorage', () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByText(/Welcome/i)).toBeInTheDocument();
      expect(screen.queryByText(/Dashboard/i)).not.toBeInTheDocument();
    });

    test('redirects to LandingPage when user in localStorage is missing a role', () => {
      // Set up a user object without a 'role' property
      const userWithoutRole = { id: 1, name: 'Test User' };
      window.localStorage.setItem('user', JSON.stringify(userWithoutRole));

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByText(/Welcome/i)).toBeInTheDocument();
    });

    test('redirects to LandingPage when user has an unknown role', () => {
      const userWithUnknownRole = { id: 1, name: 'Test User', role: 'admin' };
      window.localStorage.setItem('user', JSON.stringify(userWithUnknownRole));

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByText(/Welcome/i)).toBeInTheDocument();
    });

    test('renders PatientDashboard when user has role "patient"', () => {
      const mockAddress = '0x1234567890abcdef1234567890abcdef12345678';
      getEthAddress.mockReturnValue(mockAddress);
      const patientUser = {
        id: 1,
        name: 'John Doe',
        role: 'patient',
        address: mockAddress
      };
      window.localStorage.setItem('user', JSON.stringify(patientUser));

      // You still need a token, even a fake one, so `localStorage.getItem` isn't null.
      window.localStorage.setItem('access_token', 'fake-test-token');

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByText(/Patient Dashboard/i)).toBeInTheDocument();
    });

    test('renders DoctorDashboard when user has role "doctor"', () => {
      const doctorUser = { id: 2, name: 'Dr. Smith', role: 'doctor' };
      window.localStorage.setItem('user', JSON.stringify(doctorUser));

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByText('Doctor Dashboard')).toBeInTheDocument();
    });

    test('renders LabDashboard when user has role "lab_staff"', () => {
      const labUser = { id: 3, name: 'Tech Ray', role: 'lab_staff' };
      window.localStorage.setItem('user', JSON.stringify(labUser));

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByText('Lab Dashboard')).toBeInTheDocument();
    });
  });
});