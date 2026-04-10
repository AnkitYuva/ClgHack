import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const COLORS = ["#06b6d4", "#22c55e", "#ef4444"];

export function WasteCategoryChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={4}
          dataKey="value"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.75rem", color: "#e2e8f0" }}
          formatter={(v) => [`${v}%`, ""]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(val) => <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>{val}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function WeeklyBarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.75rem", color: "#e2e8f0", fontSize: "0.78rem" }}
        />
        <Bar dataKey="biodegradable" fill="#22c55e" radius={[4,4,0,0]} opacity={0.85} />
        <Bar dataKey="recyclable"    fill="#06b6d4" radius={[4,4,0,0]} opacity={0.85} />
        <Bar dataKey="hazardous"     fill="#ef4444" radius={[4,4,0,0]} opacity={0.85} />
      </BarChart>
    </ResponsiveContainer>
  );
}
