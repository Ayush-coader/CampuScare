import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';

export default function UpvoteButton({ complaint: c }) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => api.post(`/complaints/${c._id}/upvote`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['similar'] });
    },
  });

  return (
    <button
      type="button"
      className={`btn upvote ${c.hasUpvoted ? 'on' : ''}`}
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      title={c.hasUpvoted ? 'Remove your upvote' : 'I have this problem too'}
      aria-pressed={c.hasUpvoted}
    >
      <span aria-hidden="true">▲</span>
      <strong>{c.upvoteCount}</strong>
    </button>
  );
}
