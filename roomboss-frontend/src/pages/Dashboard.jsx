// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

export default function Dashboard() {
  const { user, logout, isAdmin, isStaff } = useAuth();
  const navigate = useNavigate();

  //////////////////////////////////////////////////////////
  // STATE
  //////////////////////////////////////////////////////////

  const [tasks,    setTasks]    = useState([]);
  const [sessions, setSessions] = useState([]);
  const [calls,    setCalls]    = useState([]);
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  //////////////////////////////////////////////////////////
  // FETCH DATA ON MOUNT — based on role
  //////////////////////////////////////////////////////////

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    setError("");

    try {

      if (isAdmin) {
        //////////////////////////////////////////////////////////
        // ADMIN DASHBOARD — tasks, sessions, call stats
        //////////////////////////////////////////////////////////

        const [tasksRes, sessionsRes, callStatsRes] = await Promise.all([
          api.get("/api/tasks"),
          api.get("/api/sessions"),
          api.get("/api/call-admin/stats"),
        ]);

        setTasks(tasksRes.data.tasks     || []);
        setSessions(sessionsRes.data.sessions || []);
        setStats(callStatsRes.data.stats  || null);

      } else if (isStaff) {
        //////////////////////////////////////////////////////////
        // STAFF DASHBOARD — my tasks + my stats
        //////////////////////////////////////////////////////////

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

  //////////////////////////////////////////////////////////
  // LOGOUT
  //////////////////////////////////////////////////////////

  function handleLogout() {
    logout();
    navigate("/");
  }

  //////////////////////////////////////////////////////////
  // STATUS BADGE COLOURS
  //////////////////////////////////////////////////////////

  function statusColor(status) {
    const map = {
      pending:     "bg-yellow-100 text-yellow-800",
      assigned:    "bg-blue-100   text-blue-800",
      in_progress: "bg-orange-100 text-orange-800",
      completed:   "bg-green-100  text-green-800",
      cancelled:   "bg-red-100    text-red-800",
      escalated:   "bg-purple-100 text-purple-800",
    };
    return map[status] || "bg-slate-100 text-slate-800";
  }

  //////////////////////////////////////////////////////////
  // LOADING STATE
  //////////////////////////////////////////////////////////

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 text-sm">Loading dashboard...</div>
      </div>
    );
  }

  //////////////////////////////////////////////////////////
  // RENDER
  //////////////////////////////////////////////////////////

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── NAVBAR ── */}
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

      {/* ── MAIN ── */}
      <main className="max-w-6xl mx-auto px-6 py-8">

        <h1 className="text-2xl font-bold text-slate-900 mb-6">
          {isAdmin ? "Operations Dashboard" : "My Tasks"}
        </h1>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={fetchDashboardData}
              className="text-red-600 font-semibold hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── ADMIN: STATS CARDS ── */}
        {isAdmin && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">

            <StatCard
              label="Total Calls"
              value={stats.total ?? 0}
              color="blue"
            />
            <StatCard
              label="Unresolved"
              value={stats.unresolved ?? 0}
              color="orange"
            />
            <StatCard
              label="Completed"
              value={stats.byTaskStatus?.completed ?? 0}
              color="green"
            />
            <StatCard
              label="Resolution Rate"
              value={`${stats.resolutionRate ?? 0}%`}
              color="purple"
            />

          </div>
        )}

        {/* ── STAFF: STATS CARDS ── */}
        {isStaff && stats && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-8">

            <StatCard label="Total"       value={stats.total       ?? 0} color="blue"   />
            <StatCard label="Pending"     value={stats.pending     ?? 0} color="yellow" />
            <StatCard label="In Progress" value={stats.in_progress ?? 0} color="orange" />
            <StatCard label="Completed"   value={stats.completed   ?? 0} color="green"  />
            <StatCard label="Cancelled"   value={stats.cancelled   ?? 0} color="red"    />
            <StatCard label="Escalated"   value={stats.escalated   ?? 0} color="purple" />

          </div>
        )}

        {/* ── TASKS TABLE ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">

          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">
              {isAdmin ? `All Tasks (${tasks.length})` : `My Tasks (${tasks.length})`}
            </h2>
            <button
              onClick={fetchDashboardData}
              className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
            >
              ↻ Refresh
            </button>
          </div>

          {tasks.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400 text-sm">
              No tasks found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">
                    <th className="px-6 py-3">Task</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Priority</th>
                    {isAdmin && <th className="px-6 py-3">Assigned To</th>}
                    <th className="px-6 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                        {task.itemName}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColor(task.status)}`}>
                          {task.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 capitalize">
                        {task.priority}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {task.assignedTo?.name ?? (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(task.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

        {/* ── ADMIN: ACTIVE SESSIONS ── */}
        {isAdmin && sessions.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-100">

            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">
                Active Sessions ({sessions.length})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">
                    <th className="px-6 py-3">Guest</th>
                    <th className="px-6 py-3">Room</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Checkout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                        {session.firstName} {session.surname}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        Room {session.roomNumber}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          session.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {session.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(session.expiresAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}

//////////////////////////////////////////////////////////
// STAT CARD COMPONENT
//////////////////////////////////////////////////////////

function StatCard({ label, value, color }) {
  const colors = {
    blue:   "bg-blue-50   text-blue-700   border-blue-100",
    green:  "bg-green-50  text-green-700  border-green-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-100",
    red:    "bg-red-50    text-red-700    border-red-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
  };

  return (
    <div className={`p-4 rounded-xl border ${colors[color] || colors.blue}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium mt-1 opacity-75">{label}</div>
    </div>
  );
}