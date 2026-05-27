// frontend/src/routes/index.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { Building2, AlertTriangle, ConciergeBell, TrendingUp, ArrowRight } from "lucide-react";

import { TopBar } from "@/components/dashboard/TopBar";
import { MetricCard, Panel, StatusPill } from "@/components/dashboard/Primitives";
import {
  platformMetrics,
  properties,
  escalations,
  requestVolume,
  responseByCategory,
} from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Platform Overview — Ricc Digital" }] }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <>
      <TopBar title="Platform Overview" subtitle="Real-time intelligence across every property" />

      <div className="p-4 lg:p-8 space-y-6">
        {/* Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {platformMetrics.map((m, i) => (
            <MetricCard
              key={m.label}
              {...m}
              trend={m.trend as "up" | "down"}
              icon={
                [
                  <Building2 key="0" className="h-4 w-4" />,
                  <TrendingUp key="1" className="h-4 w-4" />,
                  <ConciergeBell key="2" className="h-4 w-4" />,
                  <AlertTriangle key="3" className="h-4 w-4" />,
                ][i]
              }
            />
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-6">
          <Panel title="Global Request Volume" className="lg:col-span-2">
            {/* Chart code remains the same */}
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={requestVolume}>{/* ... keep your chart code ... */}</AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          {/* Other panels... */}
        </div>
      </div>
    </>
  );
}
