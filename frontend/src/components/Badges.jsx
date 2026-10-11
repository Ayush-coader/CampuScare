import { STATUS_LABEL, PRIORITY_LABEL } from '../api/hooks';

export const StatusBadge = ({ status }) => <span className={`badge ${status}`}>{STATUS_LABEL[status] || status}</span>;

export const PriorityBadge = ({ priority }) => (
  <span className={`badge p-${priority}`}>{PRIORITY_LABEL[priority] || priority}</span>
);

export const CategoryBadge = ({ category }) => <span className="badge cat">{category}</span>;
