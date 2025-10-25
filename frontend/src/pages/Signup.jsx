import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const navigate = useNavigate();
  const { login: setSession } = useAuth();

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await register(form);
      const { token, user } = res.data;
      setSession(token, user);
      setFeedback({ type: 'success', message: 'Registration successful. Redirecting…' });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.msg || 'Registration failed' });
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-card">
        <header>
          <h1 className="auth-card__title">Create your workspace</h1>
          <p className="auth-card__hint">Spin up a cloud IDE with AI assistance built in.</p>
        </header>
        <form onSubmit={submit}>
          <div className="field-group">
            <label htmlFor="signup-name"><span>Full name</span></label>
            <input
              id="signup-name"
              placeholder="Ada Lovelace"
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="field-group">
            <label htmlFor="signup-email"><span>Email</span></label>
            <input
              id="signup-email"
              type="email"
              placeholder="name@company.com"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="field-group">
            <label htmlFor="signup-password"><span>Password</span></label>
            <input
              id="signup-password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={6}
              required
            />
          </div>
          <button type="submit">Create account</button>
        </form>
        {feedback.message && (
          <p className={`flash ${feedback.type === 'error' ? 'flash--error' : ''}`}>
            {feedback.message}
          </p>
        )}
      </section>
      <p className="auth-card__footer">
        Already have an account?
        {' '}
        <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
}
