// Dashboard API wrappers. Each function calls the Express backend and falls back
// to bundled mock data when the endpoint is unreachable or unavailable.
// All endpoints are placeholders that target the existing backend contract.
import { apiClient } from "./axios";
import {
  properties as mockProperties,
  platformMetrics as mockPlatformMetrics,
  requestVolume as mockRequestVolume,
  responseByCategory as mockResponseByCategory,
  escalations as mockEscalations,
  liveRequests as mockLiveRequests,
  staffWorkload as mockStaffWorkload,
  operationalAlerts as mockOperationalAlerts,
  recentActivity as mockRecentActivity,
  occupancyTrend as mockOccupancyTrend,
} from "./mock-data";

export type FallbackResult<T> = { data: T; fallback: boolean; error?: string };

async function withFallback<T>(p: Promise<{ data: T }>, fallback: T): Promise<FallbackResult<T>> {
  try {
    const r = await p;
    if (r?.data == null) return { data: fallback, fallback: true };
    return { data: r.data, fallback: false };
  } catch (e: any) {
    return {
      data: fallback,
      fallback: true,
      error: e?.response?.data?.message ?? e?.message ?? "Backend unavailable",
    };
  }
}

export interface PlatformStats {
  totalProperties: number;
  activeProperties: number;
  totalAdmins: number;
  totalStaff: number;
  activeGuestSessions: number;
  unresolvedTasks: number;
  escalatedTasks: number;
}

export interface HotelStats {
  liveRequests: number;
  avgResponseMinutes: number;
  staffOnShift: number;
  resolvedToday: number;
  activeGuestSessions: number;
}

export const dashboardApi = {
  // SUPER ADMIN
  platformStats: () =>
    withFallback<PlatformStats>(
      apiClient.get("/api/admin/platform/stats"),
      {
        totalProperties: mockProperties.length,
        activeProperties: mockProperties.filter((p) => p.status === "operational").length,
        totalAdmins: 12,
        totalStaff: 184,
        activeGuestSessions: 312,
        unresolvedTasks: mockLiveRequests.filter((r) => r.status !== "completed").length,
        escalatedTasks: mockEscalations.length,
      },
    ),

  properties: () => withFallback(apiClient.get("/api/properties"), mockProperties),
  requestVolume: () => withFallback(apiClient.get("/api/analytics/request-volume"), mockRequestVolume),
  responseByCategory: () =>
    withFallback(apiClient.get("/api/analytics/response-by-category"), mockResponseByCategory),
  occupancyTrend: () => withFallback(apiClient.get("/api/analytics/occupancy-trend"), mockOccupancyTrend),

  // HOTEL ADMIN
  hotelStats: (propertyId?: string) =>
    withFallback<HotelStats>(
      apiClient.get("/api/admin/hotel/stats", { params: { propertyId } }),
      {
        liveRequests: mockLiveRequests.filter((r) => r.status !== "completed").length,
        avgResponseMinutes: 6.4,
        staffOnShift: mockStaffWorkload.length,
        resolvedToday: mockRecentActivity.length * 6,
        activeGuestSessions: 84,
      },
    ),
  liveRequests: (propertyId?: string) =>
    withFallback(apiClient.get("/api/requests/live", { params: { propertyId } }), mockLiveRequests),
  operationalAlerts: (propertyId?: string) =>
    withFallback(apiClient.get("/api/alerts", { params: { propertyId } }), mockOperationalAlerts),
  staffWorkload: (propertyId?: string) =>
    withFallback(apiClient.get("/api/staff/workload", { params: { propertyId } }), mockStaffWorkload),
  recentActivity: (propertyId?: string) =>
    withFallback(apiClient.get("/api/activity/recent", { params: { propertyId } }), mockRecentActivity),

  // SHARED
  escalations: () => withFallback(apiClient.get("/api/escalations"), mockEscalations),
  platformMetrics: () => withFallback(apiClient.get("/api/admin/platform/metrics"), mockPlatformMetrics),
};
