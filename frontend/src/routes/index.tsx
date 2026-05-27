import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="p-10">
      <h1 className="text-5xl font-bold text-gray-900 mb-4">Ricc Digital Guest App</h1>
      <p className="text-2xl text-gray-600">Welcome to the Dashboard</p>
    </div>
  );
}
