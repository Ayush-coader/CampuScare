import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useMeta, formatLocation, formatDate, slaText, STATUS_LABEL, PRIORITY_LABEL } from '../api/hooks';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/Badges';

const EMPTY = { q: '', status: '', category: '', priority: '', overdue: false, assigned: '' };

export default function ManagerDashboard() {
  const { user } = useAuth();
  const { data: meta } = useMeta();
  const [filters, setFilters] = useState(EMPTY);
  const [page, setPage] = useState(1);

  const params = { page, limit: 15 };
  if (filters.q) params.q = filters.q;
  if (filters.status) params.status = filters.status;
  if (filters.category) params.category = filters.category;
  if (filters.priority) params.priority = filters.priority;
  if (filters.overdue) params.overdue = 'true';
  if (filters.assigned) params.assigned = filters.assigned;

  const { data, isLoading, error } = useQuery({
    queryKey: ['complaints', params],
    queryFn: async () => (await api.get('/complaints', { params })).data,
    placeholderData: keepPreviousData,
  });

  const set = (k) => (e) => {
    setFilters({ ...filters, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
    setPage(1);
  };

  const items = data?.items || [];

  return (
    <div className="container">
      <div className="page-head">
        <div>
          <h1>Complaints</h1>
          <p className="muted">
            {user.role === 'staff'
              ? `Tickets assigned to you${user.department ? ` and everything in ${user.department}` : ''}.`
              : 'Every complaint on campus. Filter, open and assign.'}
          </p>
        </div>
        {user.role !== 'staff' && (
          <Link to="/analytics" className="btn secondary">
            View analytics
          </Link>
        )}
      </div>

      <div className="card filters" style={{ marginBottom: 16 }}>
        <div className="field">
          <label htmlFor="q">Search title</label>
          <input id="q" placeholder="e.g. Wi-Fi" value={filters.q} onChange={set('q')} />
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" value={filters.status} onChange={set('status')}>
            <option value="">All</option>
            <option value="open">Open (pending + in progress)</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="category">Category</label>
          <select id="category" value={filters.category} onChange={set('category')}>
            <option value="">All</option>
            {meta?.categories.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="priority">Priority</label>
          <select id="priority" value={filters.priority} onChange={set('priority')}>
            <option value="">All</option>
            {Object.entries(PRIORITY_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div className="stack" style={{ paddingBottom: 6 }}>
          <label className="check">
            <input type="checkbox" checked={filters.overdue} onChange={set('overdue')} /> Overdue only
          </label>
          {user.role === 'staff' && (
            <label className="check">
              <input
                type="checkbox"
                checked={filters.assigned === 'me'}
                onChange={(e) => { setFilters({ ...filters, assigned: e.target.checked ? 'me' : '' }); setPage(1); }}
              />{' '}
              Assigned to me
            </label>
          )}
          {user.role === 'admin' && (
            <label className="check">
              <input
                type="checkbox"
                checked={filters.assigned === 'none'}
                onChange={(e) => { setFilters({ ...filters, assigned: e.target.checked ? 'none' : '' }); setPage(1); }}
              />{' '}
              Unassigned
            </label>
          )}
        </div>
      </div>

      {error && <div className="alert error">Could not load complaints.</div>}

      <div className="card" style={{ padding: 0 }}>
        {isLoading ? (
          <div className="spinner">Loading…</div>
        ) : items.length === 0 ? (
          <div className="empty">
            <h3>No complaints match</h3>
            <p>Try clearing a filter.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ticket</th><th>Complaint</th><th>Location</th><th>Priority</th><th>Status</th><th>Assigned</th><th>SLA</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => {
                  const open = c.status === 'pending' || c.status === 'in_progress';
                  return (
                    <tr key={c._id}>
                      <td><span className="ticket">{c.ticketNo}</span></td>
                      <td style={{ minWidth: 220 }}>
                        <Link to={`/complaints/${c._id}`} className="title">{c.title}</Link>
                        <div className="row" style={{ gap: 6, marginTop: 4 }}>
                          <CategoryBadge category={c.category} />
                          <span className="small muted">{formatDate(c.createdAt)}</span>
                          {c.upvoteCount > 0 && <span className="small muted">▲ {c.upvoteCount}</span>}
                        </div>
                      </td>
                      <td className="small">{formatLocation(c.location)}</td>
                      <td>{open ? <PriorityBadge priority={c.priority} /> : <span className="muted">—</span>}</td>
                      <td><StatusBadge status={c.status} /></td>
                      <td className="small">{c.assignedTo?.name || <span className="muted">Unassigned</span>}</td>
                      <td className="small">
                        {open ? (
                          <span className={c.overdue ? 'overdue-text' : ''}>
                            {slaText(c.slaDueAt, true)}
                            {c.escalated && <div className="badge flag" style={{ marginTop: 4 }}>Escalated</div>}
                          </span>
                        ) : <span className="muted">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.pages > 1 && (
        <div className="pager">
          <button className="btn sm secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button>
          <span className="small muted">Page {data.page} of {data.pages} · {data.total} complaints</span>
          <button className="btn sm secondary" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
