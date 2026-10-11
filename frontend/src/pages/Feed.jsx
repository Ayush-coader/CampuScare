import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import ComplaintCard from '../components/ComplaintCard';
import { useAuth } from '../context/AuthContext';
import { useMeta } from '../api/hooks';

// Every open issue on campus. Students upvote problems they share instead of filing duplicates.
export default function Feed() {
  const { user } = useAuth();
  const { data: meta } = useMeta();
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('upvotes');

  const { data, isLoading, error } = useQuery({
    queryKey: ['feed', category, sort],
    queryFn: async () => (await api.get('/complaints/feed', { params: { category: category || undefined, sort } })).data,
  });

  const items = data?.items || [];
  const canVote = ['student', 'staff'].includes(user.role);

  return (
    <div className="container narrow">
      <div className="page-head">
        <div>
          <h1>Campus feed</h1>
          <p className="muted">
            Open problems across campus. Hit ▲ if you're affected too
            {meta ? ` - ${meta.upvoteEscalationThreshold}+ upvotes automatically raises priority.` : '.'}
          </p>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 16 }}>
        <div className="field" style={{ minWidth: 180 }}>
          <label htmlFor="cat">Category</label>
          <select id="cat" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {meta?.categories.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="field" style={{ minWidth: 160 }}>
          <label htmlFor="sort">Sort by</label>
          <select id="sort" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="upvotes">Most upvoted</option>
            <option value="recent">Most recent</option>
          </select>
        </div>
      </div>

      {isLoading && <div className="spinner">Loading…</div>}
      {error && <div className="alert error">Could not load the feed.</div>}
      {!isLoading && items.length === 0 && (
        <div className="card empty">
          <h3>No open problems</h3>
          <p>Nothing to show for this filter.</p>
        </div>
      )}

      <div className="stack">
        {items.map((c) => (
          <ComplaintCard key={c._id} complaint={c} linked={false} showUpvote={canVote} />
        ))}
      </div>
    </div>
  );
}
