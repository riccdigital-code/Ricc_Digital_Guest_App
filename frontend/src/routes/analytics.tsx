import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/dashboard/TopBar";
import { Panel } from "@/components/dashboard/Primitives";
import { occupancyTrend, responseByCategory, requestVolume } from "@/lib/mock-data";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

const grid = "oklch(0.30 0.012 75 / 0.35)";
const tip = {
  background: "oklch(0.18 0.005 60)",
  border: "1px solid oklch(0.78 0.13 82 / 0.25)",
  borderRadius: 8,
};

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Operational Analytics — RoomBoss" }] }),
  component: () => (
    <>
      <TopBar title="Operational Analytics" subtitle="Deep insights across all properties" />
      <div className="p-4 lg:p-8 grid lg:grid-cols-2 gap-6">
        <Panel title="Occupancy Trend (YTD)">
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={occupancyTrend}>
                <CartesianGrid stroke={grid} strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="oklch(0.7 0.012 80)" fontSize={12} />
                <YAxis stroke="oklch(0.7 0.012 80)" fontSize={12} domain={[60, 100]} />
                <Tooltip contentStyle={tip} />
                <Line
                  type="monotone"
                  dataKey="occ"
                  stroke="oklch(0.82 0.14 85)"
                  strokeWidth={3}
                  dot={{ fill: "oklch(0.82 0.14 85)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Response Time by Service">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={responseByCategory}>
                <CartesianGrid stroke={grid} strokeDasharray="3 3" />
                <XAxis dataKey="category" stroke="oklch(0.7 0.012 80)" fontSize={11} />
                <YAxis stroke="oklch(0.7 0.012 80)" fontSize={12} />
                <Tooltip contentStyle={tip} />
                <Bar dataKey="avg" fill="oklch(0.82 0.14 85)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Weekly Request Throughput" className="lg:col-span-2">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={requestVolume}>
                <CartesianGrid stroke={grid} strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="oklch(0.7 0.012 80)" fontSize={12} />
                <YAxis stroke="oklch(0.7 0.012 80)" fontSize={12} />
                <Tooltip contentStyle={tip} />
                <Bar dataKey="requests" fill="oklch(0.82 0.14 85)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="resolved" fill="oklch(0.55 0.09 80)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </>
  ),
});
