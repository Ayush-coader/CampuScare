import { Link } from 'react-router-dom';
import { StatusBadge, PriorityBadge, CategoryBadge } from './Badges';
import UpvoteButton from './UpvoteButton';
import { formatDate, formatLocation, slaText } from '../api/hooks';

// `linked` = card title opens the detail page (students can only open their own complaints)
export default function ComplaintCard({ complaint: c, linked = true, showUpvote = false }) {
  const open = c.status === 'pending' || c.status === 'in_progress';
  const sla = slaText(c.slaDueAt, open);

  return (
    <div className="card hover c-card">
      <div className="body">
        <div className="row" style={{ gap: 8 }}>
          <span className="ticket">{c.ticketNo}</span>
          <CategoryBadge category={c.category} />
          <StatusBadge status={c.status} />
          {open && <PriorityBadge priority={c.priority} />}
          {c.overdue && <span className="badge flag">Overdue</span>}
          {c.isAnonymous && c.isOwner && <span className="badge p-low">Anonymous</span>}
        </div>
        <h3>{linked ? <Link to={`/complaints/${c._id}`}>{c.title}</Link> : c.title}</h3>
        <div className="c-meta">
          <span>{formatLocation(c.location)}</span>
          <span>Reported {formatDate(c.createdAt)}</span>
          {c.assignedTo && <span>Assigned to {c.assignedTo.name}</span>}
          {sla && <span className={c.overdue ? 'overdue-text' : ''}>{sla}</span>}
        </div>
      </div>
      {showUpvote && <UpvoteButton complaint={c} />}
    </div>
  );
}
