'use client';

import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts';

interface MiniChartProps {
  data: Array<{ value: number }>;
  color?: string;
}

export function MiniChart({ data, color = '#3B82F6' }: MiniChartProps) {
  return (
    <ResponsiveContainer width="100%" height={50}>
      <LineChart data={data}>
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload[0]) {
              return (
                <div className="rounded-lg bg-popover px-2 py-1 text-xs shadow-md">
                  <p>{payload[0].value}</p>
                </div>
              );
            }
            return null;
          }}
        />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
