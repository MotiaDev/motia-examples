import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { BudgetBreakdown } from '@/types/renovation';

interface BudgetChartProps {
  budget: BudgetBreakdown;
}

const COLORS = ['#2563EB', '#F59E0B', '#10B981', '#8B5CF6'];

export function BudgetChart({ budget }: BudgetChartProps) {
  const data = [
    { name: 'Materials', value: budget.materials },
    { name: 'Labor', value: budget.labor },
    { name: 'Permits', value: budget.permits },
    { name: 'Contingency', value: budget.contingency },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}