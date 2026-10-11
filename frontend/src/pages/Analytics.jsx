import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import api from '../api/client';
import { STATUS_LABEL, PRIORITY_LABEL } from '../api/hooks';

const TEAL = '#0f766e';
const AMBER = '#d98a1c';
const INK = '#1c2230';
const GRID = '#ece7dc';

function Stat({ value, label, tone }) {
  return (
    <div className={`card stat ${tone || ''}`}>
      <div className="n">{value}</div>
      <div className="l">{label}</div>
    </div>
  );
}

const Chart = ({ title, children, height = 260 }) => (
  <div className="card">
    <h2 className="chart-title">{title}</h2>
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>{children}</ResponsiveContainer>
    </div>
  </div>
);

const axisProps = { tick: { fontSize: 12, fill: '#5b6475' }, axisLine: { stroke: GRID }, tickLine: false };

export default function Analytics() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => (await api.get('/analytics')).data,
  });

  if (isLoading) return <div className="spinner">Crunching numbers…</div>;
  if (error) return <div className="container"><div className="alert error">Could not load analytics.</div></div>;

  const { summary: s } = data;
  const resolutionRate = s.total ? Math.round((s.resolved / s.total) * 100) : 0;

  const byStatus = data.byStatus.map((x) => ({ name: STATUS_LABEL[x.status] || x.status, count: x.count }));
  const byPriority = data.byPriority.map((x) => ({ name: PRIORITY_LABEL[x.priority] || x.priority, count: x.count }));
  const trend = data.trend.map((t) => ({ ...t, label: t.date.slice(5) }));

  return (
    <div className="container">
      <div className="page-head">
        <div>
          <h1>Analytics</h1>
          <p className="muted">Where problems cluster, and how fast they get fixed.</p>
        </div>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <Stat value={s.total} label="Total complaints" />
        <Stat value={s.open} label="Open now" />
        <Stat value={s.overdue} label="Past SLA deadline" tone={s.overdue ? 'bad' : ''} />
        <Stat value={`${resolutionRate}%`} label="Resolved" tone="good" />
      </div>
      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <Stat value={s.escalated} label="Auto-escalated" />
        <Stat value={s.avgRating ? `${s.avgRating} / 5` : '—'} label={`Avg. rating (${s.ratingCount} reviews)`} />
      </div>

      <div className="grid cols-2">
        <Chart title="Complaints by category">
          <BarChart data={data.byCategory} margin={{ left: -16 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="category" {...axisProps} interval={0} angle={-25} textAnchor="end" height={60} />
            <YAxis allowDecimals={false} {...axisProps} />
            <Tooltip />
            <Legend />
            <Bar dataKey="total" name="Total" fill={INK} radius={[4, 4, 0, 0]} />
            <Bar dataKey="open" name="Still open" fill={AMBER} radius={[4, 4, 0, 0]} />
          </BarChart>
        </Chart>

        <Chart title="New complaints, last 30 days">
          <LineChart data={trend} margin={{ left: -16 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="label" {...axisProps} interval={4} />
            <YAxis allowDecimals={false} {...axisProps} />
            <Tooltip />
            <Line type="monotone" dataKey="count" name="Complaints" stroke={TEAL} strokeWidth={2.5} dot={false} />
          </LineChart>
        </Chart>

        <Chart title="Average time to resolve (hours)">
          <BarChart data={data.resolutionTime} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid stroke={GRID} horizontal={false} />
            <XAxis type="number" {...axisProps} />
            <YAxis type="category" dataKey="category" width={100} {...axisProps} />
            <Tooltip />
            <Bar dataKey="avgHours" name="Avg. hours" fill={TEAL} radius={[0, 4, 4, 0]} />
          </BarChart>
        </Chart>

        <Chart title="Hotspots: complaints by location">
          <BarChart data={data.byBlock} layout="vertical" margin={{ left: 30 }}>
            <CartesianGrid stroke={GRID} horizontal={false} />
            <XAxis type="number" allowDecimals={false} {...axisProps} />
            <YAxis type="category" dataKey="block" width={110} {...axisProps} />
            <Tooltip />
            <Bar dataKey="count" name="Complaints" fill={AMBER} radius={[0, 4, 4, 0]} />
          </BarChart>
        </Chart>

        <Chart title="By status" height={220}>
          <BarChart data={byStatus} margin={{ left: -16 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis allowDecimals={false} {...axisProps} />
            <Tooltip />
            <Bar dataKey="count" name="Complaints" fill={TEAL} radius={[4, 4, 0, 0]} />
          </BarChart>
        </Chart>

        <Chart title="By priority" height={220}>
          <BarChart data={byPriority} margin={{ left: -16 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis allowDecimals={false} {...axisProps} />
            <Tooltip />
            <Bar dataKey="count" name="Complaints" fill={INK} radius={[4, 4, 0, 0]} />
          </BarChart>
        </Chart>
      </div>
    </div>
  );
}
