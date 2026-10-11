import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api, { errMsg, assetUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useMeta, formatLocation, formatDate, formatDateTime, slaText, STATUS_LABEL, PRIORITY_LABEL } from '../api/hooks';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/Badges';

export default function ComplaintDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: meta } = useMeta();

  const complaintQ = useQuery({
    queryKey: ['complaint', id],
    queryFn: async () => (await api.get(`/complaints/${id}`)).data,
  });
  const commentsQ = useQuery({
    queryKey: ['comments', id],
    queryFn: async () => (await api.get(`/complaints/${id}/comments`)).data,
    enabled: complaintQ.isSuccess,
  });
  const staffQ = useQuery({
    queryKey: ['staff'],
    queryFn: async () => (await api.get('/users/staff')).data,
    enabled: user.role === 'admin',
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['complaint', id] });
    qc.invalidateQueries({ queryKey: ['complaints'] });
    qc.invalidateQueries({ queryKey: ['my-complaints'] });
  };

  // ----- action state -----
  const [statusForm, setStatusForm] = useState({ status: '', note: '' });
  const [triageForm, setTriageForm] = useState({ staffId: '', priority: '' });
  const [commentForm, setCommentForm] = useState({ body: '', isInternal: false });
  const [rating, setRating] = useState({ score: 0, feedback: '' });

  const statusM = useMutation({
    mutationFn: () => api.patch(`/complaints/${id}/status`, statusForm),
    onSuccess: () => { setStatusForm({ status: '', note: '' }); refresh(); },
  });
  const triageM = useMutation({
    mutationFn: () => {
      const body = {};
      if (triageForm.staffId) body.staffId = triageForm.staffId;
      if (triageForm.priority) body.priority = triageForm.priority;
      return api.patch(`/complaints/${id}/triage`, body);
    },
    onSuccess: () => { setTriageForm({ staffId: '', priority: '' }); refresh(); },
  });
  const commentM = useMutation({
    mutationFn: () => api.post(`/complaints/${id}/comments`, commentForm),
    onSuccess: () => {
      setCommentForm({ body: '', isInternal: false });
      qc.invalidateQueries({ queryKey: ['comments', id] });
    },
  });
  const rateM = useMutation({
    mutationFn: () => api.post(`/complaints/${id}/rating`, rating),
    onSuccess: refresh,
  });
  const deleteM = useMutation({
    mutationFn: () => api.delete(`/complaints/${id}`),
    onSuccess: () => {
      refresh();
      navigate('/dashboard');
    },
  });

  if (complaintQ.isLoading) return <div className="spinner">Loading…</div>;
  if (complaintQ.isError) {
    return (
      <div className="container narrow">
        <div className="alert error">{errMsg(complaintQ.error)}</div>
        <p style={{ marginTop: 14 }}><Link to="/dashboard">← Back to complaints</Link></p>
      </div>
    );
  }

  const { complaint: c, canManage } = complaintQ.data;
  const open = c.status === 'pending' || c.status === 'in_progress';
  const comments = commentsQ.data?.comments || [];
  const isStudentOwner = user.role === 'student' && c.isOwner;
  const canDelete = user.role === 'admin' || (isStudentOwner && c.status === 'pending');
  const sla = slaText(c.slaDueAt, open);

  return (
    <div className="container">
      <p style={{ marginBottom: 14 }}>
        <Link to="/dashboard">← Back</Link>
      </p>

      <div className="detail-layout">
        {/* ---------- main column ---------- */}
        <div className="stack">
          <div className="card stack">
            <div className="row" style={{ gap: 8 }}>
              <span className="ticket">{c.ticketNo}</span>
              <CategoryBadge category={c.category} />
              <StatusBadge status={c.status} />
              {open && <PriorityBadge priority={c.priority} />}
              {c.overdue && <span className="badge flag">Overdue</span>}
              {c.escalated && <span className="badge flag">Escalated</span>}
            </div>
            <h1>{c.title}</h1>
            <p className="desc">{c.description}</p>
            {c.imageUrl && <img className="shot" src={assetUrl(c.imageUrl)} alt="Attached by the reporter" />}
          </div>

          <div className="card">
            <h2 style={{ marginBottom: 16 }}>Progress</h2>
            <ul className="timeline">
              {c.statusHistory.map((h, i) => (
                <li key={i}>
                  <div className="row" style={{ gap: 8 }}>
                    <StatusBadge status={h.status} />
                    <span className="small muted">{formatDateTime(h.at)}</span>
                  </div>
                  <div className="small" style={{ marginTop: 4 }}>
                    {h.note || 'Status updated'}
                    <span className="muted"> - {h.changedBy?.name || 'System'}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="card stack">
            <h2>Discussion</h2>
            {comments.length === 0 && <p className="muted small">No comments yet.</p>}
            {comments.map((m) => (
              <div key={m._id} className={`comment ${m.isInternal ? 'internal' : ''}`}>
                <div className="who">
                  {m.author?.name} <span className="muted" style={{ fontWeight: 400 }}>· {m.author?.role} · {formatDateTime(m.createdAt)}</span>
                  {m.isInternal && <span className="badge p-high" style={{ marginLeft: 8 }}>Internal note</span>}
                </div>
                <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{m.body}</div>
              </div>
            ))}

            {(isStudentOwner || canManage) && (
              <form
                className="stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  commentM.mutate();
                }}
              >
                {commentM.isError && <div className="alert error">{errMsg(commentM.error)}</div>}
                <textarea
                  style={{ minHeight: 70 }}
                  required
                  maxLength={1000}
                  placeholder="Write a comment…"
                  value={commentForm.body}
                  onChange={(e) => setCommentForm({ ...commentForm, body: e.target.value })}
                />
                <div className="row spread">
                  {canManage ? (
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={commentForm.isInternal}
                        onChange={(e) => setCommentForm({ ...commentForm, isInternal: e.target.checked })}
                      />
                      Internal note (hidden from the student)
                    </label>
                  ) : <span />}
                  <button className="btn sm" disabled={commentM.isPending}>Post comment</button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* ---------- side column ---------- */}
        <div className="stack">
          <div className="card">
            <h2 style={{ marginBottom: 12 }}>Details</h2>
            <dl className="dl">
              <dt>Location</dt><dd>{formatLocation(c.location)}</dd>
              <dt>Reported</dt><dd>{formatDate(c.createdAt)}</dd>
              <dt>Reported by</dt>
              <dd>
                {c.createdBy ? `${c.createdBy.name}${c.createdBy.rollNo ? ` (${c.createdBy.rollNo})` : ''}` : <em>Anonymous</em>}
                {c.isAnonymous && c.isOwner && <span className="muted"> - hidden from staff</span>}
              </dd>
              <dt>Assigned to</dt><dd>{c.assignedTo ? `${c.assignedTo.name}` : <span className="muted">Not yet assigned</span>}</dd>
              <dt>Deadline</dt>
              <dd>
                {formatDateTime(c.slaDueAt)}
                {sla && <div className={`small ${c.overdue ? 'overdue-text' : 'muted'}`}>{sla}</div>}
              </dd>
              {c.resolvedAt && (<><dt>Resolved</dt><dd>{formatDate(c.resolvedAt)}</dd></>)}
            </dl>
          </div>

          {canManage && (
            <form
              className="card stack"
              onSubmit={(e) => {
                e.preventDefault();
                statusM.mutate();
              }}
            >
              <h2>Update status</h2>
              {statusM.isError && <div className="alert error">{errMsg(statusM.error)}</div>}
              <div className="field">
                <label htmlFor="st">New status</label>
                <select id="st" required value={statusForm.status} onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}>
                  <option value="">Select…</option>
                  {Object.entries(STATUS_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="note">Note {statusForm.status === 'rejected' && '(required)'}</label>
                <textarea
                  id="note"
                  style={{ minHeight: 70 }}
                  maxLength={500}
                  required={statusForm.status === 'rejected'}
                  placeholder="Visible to the student"
                  value={statusForm.note}
                  onChange={(e) => setStatusForm({ ...statusForm, note: e.target.value })}
                />
              </div>
              <button className="btn" disabled={statusM.isPending}>Save update</button>
            </form>
          )}

          {user.role === 'admin' && (
            <form
              className="card stack"
              onSubmit={(e) => {
                e.preventDefault();
                triageM.mutate();
              }}
            >
              <h2>Assign &amp; prioritise</h2>
              {triageM.isError && <div className="alert error">{errMsg(triageM.error)}</div>}
              <div className="field">
                <label htmlFor="staff">Assign to</label>
                <select id="staff" value={triageForm.staffId} onChange={(e) => setTriageForm({ ...triageForm, staffId: e.target.value })}>
                  <option value="">Keep current</option>
                  {(staffQ.data?.staff || []).map((s) => (
                    <option key={s._id} value={s._id}>{s.name} ({s.department})</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="prio">Priority</label>
                <select id="prio" value={triageForm.priority} onChange={(e) => setTriageForm({ ...triageForm, priority: e.target.value })}>
                  <option value="">Keep ({PRIORITY_LABEL[c.priority]})</option>
                  {(meta?.priorities || []).map((p) => (
                    <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                  ))}
                </select>
              </div>
              <button className="btn secondary" disabled={triageM.isPending || (!triageForm.staffId && !triageForm.priority)}>
                Apply
              </button>
            </form>
          )}

          {isStudentOwner && c.status === 'resolved' && (
            <div className="card stack">
              <h2>How was the fix?</h2>
              {c.rating?.score ? (
                <>
                  <div className="stars" aria-label={`${c.rating.score} out of 5`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} className={`star ${n <= c.rating.score ? 'on' : ''}`}>★</span>
                    ))}
                  </div>
                  {c.rating.feedback && <p className="small">{c.rating.feedback}</p>}
                  <p className="small muted">Thanks for your feedback.</p>
                </>
              ) : (
                <form
                  className="stack"
                  onSubmit={(e) => {
                    e.preventDefault();
                    rateM.mutate();
                  }}
                >
                  {rateM.isError && <div className="alert error">{errMsg(rateM.error)}</div>}
                  <div className="stars">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button type="button" key={n} className={`star ${n <= rating.score ? 'on' : ''}`} onClick={() => setRating({ ...rating, score: n })} aria-label={`${n} star${n > 1 ? 's' : ''}`}>
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    style={{ minHeight: 60 }}
                    maxLength={500}
                    placeholder="Anything to add? (optional)"
                    value={rating.feedback}
                    onChange={(e) => setRating({ ...rating, feedback: e.target.value })}
                  />
                  <button className="btn" disabled={!rating.score || rateM.isPending}>Submit rating</button>
                </form>
              )}
            </div>
          )}

          {canDelete && (
            <button
              className="btn danger"
              disabled={deleteM.isPending}
              onClick={() => window.confirm('Delete this complaint permanently?') && deleteM.mutate()}
            >
              Delete complaint
            </button>
          )}
          {deleteM.isError && <div className="alert error">{errMsg(deleteM.error)}</div>}
        </div>
      </div>
    </div>
  );
}
