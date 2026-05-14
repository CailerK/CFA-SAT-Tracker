// Equipment + Food Safety API service.

import apiService from "./api";

const equipmentService = {
  // ---------------- Equipment ----------------

  async listCategories() {
    return apiService.request("/kitchen/equipment/categories/");
  },

  async listEquipment({ category } = {}) {
    const qs = category ? `?category=${encodeURIComponent(category)}` : "";
    return apiService.request(`/kitchen/equipment/${qs}`);
  },

  async getEquipmentSchedules(equipmentId) {
    return apiService.request(`/kitchen/equipment/${equipmentId}/schedules/`);
  },

  async getEquipmentLogs(equipmentId) {
    return apiService.request(`/kitchen/equipment/${equipmentId}/logs/`);
  },

  async addEquipmentLog(equipmentId, { kind, notes = "" }) {
    return apiService.request(`/kitchen/equipment/${equipmentId}/logs/`, {
      method: "POST",
      body: JSON.stringify({ kind, notes }),
    });
  },

  async completeSchedule(scheduleId) {
    return apiService.request(
      `/kitchen/equipment/schedules/${scheduleId}/complete/`,
      { method: "POST" }
    );
  },

  // ---------------- Food Safety ----------------

  async listSafetyTasks({ daypart } = {}) {
    const qs = daypart ? `?daypart=${encodeURIComponent(daypart)}` : "";
    return apiService.request(`/kitchen/food-safety/tasks/${qs}`);
  },

  async completeSafetyTask(id) {
    return apiService.request(`/kitchen/food-safety/tasks/${id}/complete/`, {
      method: "POST",
    });
  },

  async uncompleteSafetyTask(id) {
    return apiService.request(`/kitchen/food-safety/tasks/${id}/uncomplete/`, {
      method: "POST",
    });
  },

  async listTemperatureTargets({ kind } = {}) {
    const qs = kind ? `?kind=${encodeURIComponent(kind)}` : "";
    return apiService.request(
      `/kitchen/food-safety/temperature-targets/${qs}`
    );
  },

  async listRecentReadings({ kind, range = "7d" } = {}) {
    const params = new URLSearchParams({ range });
    if (kind) params.set("kind", kind);
    return apiService.request(
      `/kitchen/food-safety/temperature-readings/?${params}`
    );
  },

  async logReading({ target, value, unit = "F" }) {
    return apiService.request(
      "/kitchen/food-safety/temperature-readings/",
      {
        method: "POST",
        body: JSON.stringify({ target, value, unit }),
      }
    );
  },
};

export default equipmentService;
