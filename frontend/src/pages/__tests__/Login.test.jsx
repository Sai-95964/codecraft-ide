import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../Login';
import { login as loginRequest } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';

jest.mock('../../api/auth', () => ({
  login: jest.fn()
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

describe('Login page', () => {
  const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true };
  const user = userEvent.setup();
  const sessionSetter = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ login: sessionSetter });
  });

  it('submits credentials and stores the session', async () => {
    loginRequest.mockResolvedValue({
      data: {
        token: 'token-123',
        user: { id: '1', name: 'Tester', email: 'test@example.com' }
      }
    });

    render(
      <MemoryRouter future={routerFuture}>
        <Login />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com');
    await user.type(screen.getByPlaceholderText(/password/i), 'Secret123!');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(sessionSetter).toHaveBeenCalledWith(
        'token-123',
        expect.objectContaining({ email: 'test@example.com' })
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    expect(await screen.findByText(/logged in successfully/i)).toBeInTheDocument();
  });

  it('shows an error when login fails', async () => {
    loginRequest.mockRejectedValue({ response: { data: { msg: 'Invalid credentials' } } });

    render(
      <MemoryRouter future={routerFuture}>
        <Login />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText(/email/i), 'bad@example.com');
    await user.type(screen.getByPlaceholderText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
    expect(sessionSetter).not.toHaveBeenCalled();
  });
});
