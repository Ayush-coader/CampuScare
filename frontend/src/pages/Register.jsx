import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api/client';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', rollNo: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register({ ...form, rollNo: form.rollNo || undefined });
      navigate('/dashboard');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card stack">
        <div>
          <div className="brand" style={{ color: 'var(--ink)', marginBottom: 14 }}>
            <span className="brand-mark">C</span>CampusCare
          </div>
          <h1>Create your account</h1>
          <p className="muted">Student sign-up. Staff accounts are created by the admin.</p>
        </div>

        <form className="card stack" onSubmit={submit}>
          {error && <div className="alert error">{error}</div>}
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input id="name" required minLength={2} value={form.name} onChange={set('name')} />
          </div>
          <div className="field">
            <label htmlFor="email">College email</label>
            <input id="email" type="email" required value={form.email} onChange={set('email')} />
          </div>
          <div className="field">
            <label htmlFor="roll">Roll number (optional)</label>
            <input id="roll" value={form.rollNo} onChange={set('rollNo')} />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set('password')} />
            <span className="hint">At least 8 characters.</span>
          </div>
          <button className="btn block" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
          <p className="small muted" style={{ textAlign: 'center' }}>
            Already registered? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
