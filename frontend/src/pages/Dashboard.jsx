// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

export default function Dashboard() {
  const { user, logout, isAdmin, isStaff } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    setError("");

    try {
      if (isAdmin) {
        const [tasksRes, sessionsRes, statsRes] = await Promise.all([
          api.get("/api/tasks"),
          api.get("/api/sessions"),
          api.get("/api/call-admin/stats"),
        ]);

        setTasks(tasksRes.data.tasks || []);
        setSessions(sessionsRes.data.sessions || []);
        setStats(statsRes.data.stats || null);
      } else if (isStaff) {
        const [myTasksRes, myStatsRes] = await Promise.all([
          api.get("/api/tasks/my-tasks"),
          api.get("/api/tasks/my-stats"),
        ]);

        setTasks(myTasksRes.data.tasks || []);
        setStats(myStatsRes.data.stats || null);
      }
    } catch (err) {
      setError("Failed to load dashboard data. Please refresh.");
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function updateTaskStatus(taskId, nextStatus) {
    try {
      await api.patch(`/api/tasks/${taskId}/status`, {
        status: nextStatus,
      });
      fetchDashboardData();
    } catch (err) {
      console.error("Task status update error:", err);
      const backendMessage =
        err?.response?.data?.error || "Failed to update task status.";
      alert(backendMessage);
    }
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  function statusColor(status) {
    const map = {
      pending: "bg-yellow-100 text-yellow-800",
      assigned: "bg-blue-100 text-blue-800",
      in_progress: "bg-orange-100 text-orange-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      escalated: "bg-purple-100 text-purple-800",
    };
    return map[status] || "bg-slate-100 text-slate-800";
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 text-sm">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <span className="font-bold text-lg">RiccDigital</span>
          <span className="ml-3 text-xs bg-slate-700 px-2 py-1 rounded-full uppercase tracking-wide">
            {user?.role}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-300 text-sm">{user?.name}</span>
          <button
            onClick={handleLogout}
            className="text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">
          {isAdmin ? "Operations Dashboard" : "My Tasks"}
        </h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Tasks Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between">
            <h2 className="font-semibold text-slate-900">
              {isAdmin ? `All Tasks (${tasks.length})` : `My Tasks (${tasks.length})`}
            </h2>
            <button onClick={fetchDashboardData} className="text-xs text-slate-500 hover:text-slate-900">
              ↻ Refresh
            </button>
          </div>

          {tasks.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400">No tasks found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase border-b">
                    <th className="px-6 py-3">Task</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Priority</th>
                    {isAdmin && <th className="px-6 py-3">Assigned To</th>}
                    <th className="px-6 py-3">Created</th>
                    {isStaff && (

  <th className="px-6 py-3">Actions</th>
)}

                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium">{task.itemName}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full ${statusColor(task.status)}`}>
                          {task.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 capitalize">{task.priority}</td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {task.assignedTo?.name || "Unassigned"}
                        </td>
                      )}
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(task.createdAt).toLocaleDateString()}
                      </td>
                      {isStaff && (

  <td className="px-6 py-4">
    <div className="flex flex-wrap gap-2">

```
  {allowedActions(task.status).map((action) => (

    <button
      key={action.next}
      onClick={() =>
        updateTaskStatus(task.id, action.next)
      }
      className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-700 transition-colors"
    >
      {action.label}
    </button>

  ))}

</div>
```

  </td>
)}

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}