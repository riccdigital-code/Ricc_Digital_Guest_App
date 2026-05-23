// Mock hotel operations data. Replace these with calls to your Express backend.
// e.g. fetch(`${import.meta.env.VITE_API_URL}/api/requests`)

export const properties = [
  { id: "p1", name: "The Aurelian — Paris", rooms: 218, occupancy: 92, revenue: 412800, alerts: 2, status: "operational" },
  { id: "p2", name: "Maison Noire — Milan", rooms: 164, occupancy: 88, revenue: 298400, alerts: 0, status: "operational" },
  { id: "p3", name: "Château Doré — Geneva", rooms: 96, occupancy: 95, revenue: 356900, alerts: 1, status: "operational" },
  { id: "p4", name: "Atelier Royal — London", rooms: 312, occupancy: 81, revenue: 489120, alerts: 4, status: "attention" },
  { id: "p5", name: "Villa d'Or — Monaco", rooms: 74, occupancy: 98, revenue: 612500, alerts: 0, status: "operational" },
  { id: "p6", name: "Casa Oro — Barcelona", rooms: 198, occupancy: 79, revenue: 224300, alerts: 3, status: "attention" },
];

export const platformMetrics = [
  { label: "Active Properties", value: "42", delta: "+3 this quarter", trend: "up" },
  { label: "Total Revenue (MTD)", value: "$8.42M", delta: "+12.4%", trend: "up" },
  { label: "Avg. Occupancy", value: "89.2%", delta: "+2.1 pts", trend: "up" },
  { label: "Open Escalations", value: "11", delta: "-4 vs last week", trend: "down" },
];

export const requestVolume = [
  { day: "Mon", requests: 142, resolved: 138 },
  { day: "Tue", requests: 168, resolved: 161 },
  { day: "Wed", requests: 189, resolved: 182 },
  { day: "Thu", requests: 176, resolved: 174 },
  { day: "Fri", requests: 214, resolved: 205 },
  { day: "Sat", requests: 248, resolved: 231 },
  { day: "Sun", requests: 221, resolved: 218 },
];

export const responseByCategory = [
  { category: "Housekeeping", avg: 7.2 },
  { category: "F&B", avg: 11.4 },
  { category: "Maintenance", avg: 18.6 },
  { category: "Concierge", avg: 4.8 },
  { category: "Valet", avg: 6.1 },
];

export const escalations = [
  { id: "E-2041", property: "Atelier Royal — London", room: "1208", issue: "HVAC failure — Presidential Suite", priority: "critical", elapsed: "42m" },
  { id: "E-2039", property: "Casa Oro — Barcelona", room: "0412", issue: "Repeat noise complaint", priority: "high", elapsed: "1h 18m" },
  { id: "E-2037", property: "The Aurelian — Paris", room: "0904", issue: "VIP allergy incident", priority: "critical", elapsed: "12m" },
  { id: "E-2034", property: "Château Doré — Geneva", room: "0301", issue: "Lost luggage — outbound", priority: "medium", elapsed: "2h 04m" },
];

export const liveRequests = [
  { id: "R-8821", room: "1402", guest: "Mr. Laurent",     type: "Fresh Towels",   status: "in_progress", assignee: "Amélie R.", sla: "4 min", priority: "normal" },
  { id: "R-8820", room: "0908", guest: "Ms. Khoury",      type: "Turndown Service", status: "queued",      assignee: "—",        sla: "9 min", priority: "normal" },
  { id: "R-8819", room: "2104", guest: "Dr. Okafor",      type: "Champagne & Caviar", status: "in_progress", assignee: "Marco P.", sla: "12 min", priority: "vip" },
  { id: "R-8818", room: "0317", guest: "Ms. Tanaka",      type: "AC Repair",      status: "escalated",   assignee: "Lukas B.", sla: "—",     priority: "high" },
  { id: "R-8817", room: "1801", guest: "Mr. Becker",      type: "Late Checkout",  status: "completed",   assignee: "Sofía M.", sla: "3 min", priority: "normal" },
  { id: "R-8816", room: "0506", guest: "Mme. Dubois",     type: "Spa Booking",    status: "queued",      assignee: "—",        sla: "6 min", priority: "normal" },
];

export const staffWorkload = [
  { name: "Amélie R.",  role: "Housekeeping Lead", active: 4, completed: 18, load: 72 },
  { name: "Marco P.",   role: "In-Room Dining",    active: 3, completed: 14, load: 58 },
  { name: "Lukas B.",   role: "Maintenance",       active: 5, completed: 9,  load: 88 },
  { name: "Sofía M.",   role: "Guest Services",    active: 2, completed: 22, load: 44 },
  { name: "Hiro T.",    role: "Concierge",         active: 1, completed: 27, load: 30 },
];

export const operationalAlerts = [
  { id: "A-12", level: "critical", message: "Floor 14 — water pressure below threshold", time: "2m ago" },
  { id: "A-11", level: "warning",  message: "Linen inventory at 18% — reorder window closing", time: "26m ago" },
  { id: "A-10", level: "info",     message: "VIP arrival in 35 min — Suite 1208", time: "31m ago" },
  { id: "A-09", level: "warning",  message: "Valet queue exceeds 6 vehicles", time: "48m ago" },
];

export const recentActivity = [
  { time: "12:42", actor: "Amélie R.", action: "Completed turndown",       target: "Room 1402" },
  { time: "12:38", actor: "System",    action: "Auto-escalated",            target: "R-8818 → Lukas B." },
  { time: "12:31", actor: "Marco P.",  action: "Delivered in-room dining",  target: "Room 2104" },
  { time: "12:24", actor: "Sofía M.",  action: "Processed late checkout",   target: "Room 1801" },
  { time: "12:19", actor: "Hiro T.",   action: "Booked Michelin reservation", target: "Mr. & Mrs. Halberg" },
];

export const myTasks = [
  { id: "T-441", room: "1402", title: "Replace bath linens & restock minibar", priority: "normal", due: "12 min", progress: 60 },
  { id: "T-440", room: "1208", title: "VIP turndown — orchid & truffle service", priority: "vip",    due: "25 min", progress: 20 },
  { id: "T-439", room: "0908", title: "Deep clean post-checkout",               priority: "normal", due: "40 min", progress: 0 },
  { id: "T-438", room: "0317", title: "Confirm HVAC repair with engineering",   priority: "high",   due: "5 min",  progress: 80 },
];

export const occupancyTrend = [
  { month: "Jan", occ: 78 }, { month: "Feb", occ: 81 }, { month: "Mar", occ: 84 },
  { month: "Apr", occ: 86 }, { month: "May", occ: 88 }, { month: "Jun", occ: 91 },
  { month: "Jul", occ: 93 }, { month: "Aug", occ: 92 }, { month: "Sep", occ: 89 },
];
