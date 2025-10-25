import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from '../Dashboard';
import { fetchHistory } from '../../api/history';
import { useAuth } from '../../context/AuthContext';

jest.mock('../../api/history', () => ({
  fetchHistory: jest.fn()
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    MemoryRouter: actual.MemoryRouter
  };
});

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn()
}));

describe('Dashboard page', () => {
  const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true };
  const user = userEvent.setup();
  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      user: { id: '1', name: 'CLI Tester', email: 'cli@example.com' },
      logout: mockLogout
    });

    fetchHistory.mockResolvedValue({
      data: [
        {
          _id: 'hist-1',
          action: 'run',
          language: 'python',
          output: 'print result',
          createdAt: '2025-01-01T00:00:00.000Z'
        }
      ]
    });
  });

  it('loads history for the signed-in user and displays entries', async () => {
    render(
      <MemoryRouter future={routerFuture}>
        <Dashboard />
      </MemoryRouter>
    );

  await waitFor(() => expect(fetchHistory).toHaveBeenCalledTimes(1));

  expect(screen.getByText(/signed in as cli tester/i)).toBeInTheDocument();
  expect(await screen.findByText(/RUN/i)).toBeInTheDocument();
  expect(await screen.findByText(/print result/i)).toBeInTheDocument();
  });

  it('logs out and redirects when the button is clicked', async () => {
    render(
      <MemoryRouter future={routerFuture}>
        <Dashboard />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /log out/i }));

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
