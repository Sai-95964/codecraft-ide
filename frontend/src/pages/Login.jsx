import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const navigate = useNavigate();
  const { login: setSession } = useAuth();

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await login(form);
      const { token, user } = res.data;
      setSession(token, user);
      setFeedback({ type: 'success', message: 'Logged in successfully. Redirecting…' });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.msg || 'Login failed' });
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-card">
        <header>
          <h1 className="auth-card__title">Welcome back</h1>
          <p className="auth-card__hint">Sign in to keep shipping with CodeCraft.</p>
        </header>
        <form onSubmit={submit}>
          <div className="field-group">
            <label htmlFor="login-email"><span>Email</span></label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="field-group">
            <label htmlFor="login-password"><span>Password</span></label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button type="submit">Sign in</button>
        </form>
        {feedback.message && (
          <p className={`flash ${feedback.type === 'error' ? 'flash--error' : ''}`}>
            {feedback.message}
          </p>
        )}
      </section>
      <p className="auth-card__footer">
        Need an account?
        {' '}
        <Link to="/signup">Create one</Link>
      </p>
    </div>
  );
}
