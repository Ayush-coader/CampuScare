import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import ComplaintCard from '../components/ComplaintCard';
import { STATUS_LABEL } from '../api/hooks';

const TABS = ['all', 'pending', 'in_progress', 'resolved', 'rejected'];

export default function StudentDashboard() {
  const [tab, setTab] = useState('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-complaints'],
    queryFn: async () => (await api.get('/complaints', { params: { limit: 100 } })).data,
  });

  const items = data?.items || [];
  const count = (s) => items.filter((c) => c.status === s).length;
  const shown = tab === 'all' ? items : items.filter((c) => c.status === tab);
  const needsRating = items.filter((c) => c.status === 'resolved' && !c.rating?.score);

  return (
    <div className="container">
      <div className="page-head">
        <div>
          <h1>My complaints</h1>
          <p className="muted">Everything you've reported, and where it stands.</p>
        </div>
        <Link to="/new" className="btn">
          + Report a problem
        </Link>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 20 }}>
        <div className="card stat"><div className="n">{items.length}</div><div className="l">Total reported</div></div>
        <div className="card stat"><div className="n">{count('pending')}</div><div className="l">Pending</div></div>
        <div className="card stat"><div className="n">{count('in_progress')}</div><div className="l">In progress</div></div>
        <div className="card stat good"><div className="n">{count('resolved')}</div><div className="l">Resolved</div></div>
      </div>

      {needsRating.length > 0 && (
        <div className="alert ok" style={{ marginBottom: 16 }}>
          {needsRating.length} resolved complaint{needsRating.length > 1 ? 's are' : ' is'} waiting for your feedback. Open{' '}
          {needsRating.length > 1 ? 'them' : 'it'} to rate the fix.
        </div>
      )}

      <div className="tabs" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t} className={`tab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
            {t === 'all' ? 'All' : STATUS_LABEL[t]}
          </button>
        ))}
      </div>

      {isLoading && <div className="spinner">Loading your complaints…</div>}
      {error && <div className="alert error">Could not load complaints.</div>}

      {!isLoading && shown.length === 0 && (
        <div className="card empty">
          <h3>{items.length ? 'Nothing in this view' : "You haven't reported anything yet"}</h3>
          <p>
            {items.length ? 'Try another tab.' : (
              <>Spotted a problem? <Link to="/new">Report it</Link> and track it here.</>
            )}
          </p>
        </div>
      )}

      <div className="stack">
        {shown.map((c) => (
          <ComplaintCard key={c._id} complaint={c} />
        ))}
      </div>
    </div>
  );
}
