import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api/client';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form.email, form.password);
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
          <h1>Welcome back</h1>
          <p className="muted">Report campus problems and watch them get fixed.</p>
        </div>

        <form className="card stack" onSubmit={submit}>
          {error && <div className="alert error">{error}</div>}
          <div className="field">
            <label htmlFor="email">College email</label>
            <input id="email" type="email" required autoComplete="email" value={form.email} onChange={set('email')} />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" required autoComplete="current-password" value={form.password} onChange={set('password')} />
          </div>
          <button className="btn block" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="small muted" style={{ textAlign: 'center' }}>
            New student? <Link to="/register">Create an account</Link>
          </p>
        </form>

        <div className="demo-box">
          <strong>Demo logins</strong> (after running <code>npm run seed</code>)<br />
          Student: <code>student1@campus.edu</code> / <code>Student@123</code>
          <br />
          Admin: <code>admin@campus.edu</code> / <code>Admin@123</code>
        </div>
      </div>
    </div>
  );
}
