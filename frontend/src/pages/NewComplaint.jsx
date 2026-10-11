import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api, { errMsg } from '../api/client';
import { useMeta, formatLocation } from '../api/hooks';
import { StatusBadge } from '../components/Badges';
import UpvoteButton from '../components/UpvoteButton';

const INITIAL = { title: '', description: '', category: '', block: '', floor: '', room: '', isAnonymous: false };

// Small debounce so we don't query on every keystroke
function useDebounced(value, ms = 500) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function NewComplaint() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: meta } = useMeta();
  const [form, setForm] = useState(INITIAL);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const query = useDebounced(`${form.title} ${form.description}`.trim());

  // Duplicate detection: show open complaints that look like this one
  const { data: similar } = useQuery({
    queryKey: ['similar', query, form.category, form.block],
    queryFn: async () =>
      (await api.get('/complaints/similar', { params: { q: query, category: form.category || undefined, block: form.block || undefined } })).data,
    enabled: query.length >= 4,
  });
  const matches = similar?.items || [];

  const submit = useMutation({
    mutationFn: async () => {
      const body = new FormData();
      Object.entries(form).forEach(([k, v]) => body.append(k, v));
      if (image) body.append('image', image);
      return (await api.post('/complaints', body)).data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['my-complaints'] });
      navigate(`/complaints/${data.complaint._id}`);
    },
  });

  const onImage = (e) => {
    const file = e.target.files?.[0];
    setImage(file || null);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const selected = meta?.categories.find((c) => c.name === form.category);

  return (
    <div className="container narrow">
      <div className="page-head">
        <div>
          <h1>Report a problem</h1>
          <p className="muted">Be specific - the more detail, the faster it gets fixed.</p>
        </div>
      </div>

      <form
        className="card stack"
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
        }}
      >
        {submit.isError && <div className="alert error">{errMsg(submit.error)}</div>}

        <div className="field">
          <label htmlFor="title">Title</label>
          <input id="title" required minLength={5} maxLength={120} placeholder="e.g. Wi-Fi is down on the 2nd floor" value={form.title} onChange={set('title')} />
        </div>

        <div className="grid cols-2">
          <div className="field">
            <label htmlFor="category">Category</label>
            <select id="category" required value={form.category} onChange={set('category')}>
              <option value="">Select…</option>
              {meta?.categories.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
            {selected && <span className="hint">Target resolution time: {selected.slaHours} hours</span>}
          </div>
          <div className="field">
            <label htmlFor="block">Building / block</label>
            <select id="block" required value={form.block} onChange={set('block')}>
              <option value="">Select…</option>
              {meta?.blocks.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid cols-2">
          <div className="field">
            <label htmlFor="floor">Floor (optional)</label>
            <input id="floor" maxLength={20} value={form.floor} onChange={set('floor')} />
          </div>
          <div className="field">
            <label htmlFor="room">Room (optional)</label>
            <input id="room" maxLength={30} value={form.room} onChange={set('room')} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="description">What's happening?</label>
          <textarea id="description" required minLength={10} maxLength={2000} value={form.description} onChange={set('description')} />
        </div>

        {matches.length > 0 && (
          <div className="similar" role="status">
            <strong>Is it one of these?</strong>
            <div className="small muted">Upvote an existing report instead of filing a duplicate - it raises urgency.</div>
            <ul>
              {matches.map((m) => (
                <li key={m._id}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{m.title}</div>
                    <div className="small muted">
                      {formatLocation(m.location)} · <StatusBadge status={m.status} />
                    </div>
                  </div>
                  <UpvoteButton complaint={m} />
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="field">
          <label htmlFor="image">Photo (optional)</label>
          <input id="image" type="file" accept="image/jpeg,image/png,image/webp" onChange={onImage} />
          <span className="hint">JPG, PNG or WebP, up to 5 MB.</span>
          {preview && <img src={preview} alt="Preview" className="shot" style={{ maxHeight: 200, marginTop: 6 }} />}
        </div>

        <label className="check">
          <input type="checkbox" checked={form.isAnonymous} onChange={set('isAnonymous')} />
          <span>
            <strong>Report anonymously</strong>
            <br />
            <span className="hint">Staff and admins will see the complaint but not who filed it. You can still track it.</span>
          </span>
        </label>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn secondary" onClick={() => navigate('/dashboard')}>
            Cancel
          </button>
          <button className="btn" disabled={submit.isPending}>
            {submit.isPending ? 'Submitting…' : 'Submit complaint'}
          </button>
        </div>
      </form>
    </div>
  );
}
