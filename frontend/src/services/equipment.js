// Equipment + Food Safety API service.

import apiService from "./api";

const equipmentService = {
  // ---------------- Equipment ----------------

  async listCategories() {
    return apiService.request("/kitchen/equipment/categories/");
  },

  async createCategory(payload) {
    return apiService.request("/kitchen/equipment/categories/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateCategory(id, patch) {
    return apiService.request(`/kitchen/equipment/categories/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async removeCategory(id) {
    return apiService.request(`/kitchen/equipment/categories/${id}/`, {
      method: "DELETE",
    });
  },

  async listEquipment({ category } = {}) {
    const qs = category ? `?category=${encodeURIComponent(category)}` : "";
    return apiService.request(`/kitchen/equipment/${qs}`);
  },

  async createEquipment(payload) {
    return apiService.request("/kitchen/equipment/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateEquipment(id, patch) {
    return apiService.request(`/kitchen/equipment/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async removeEquipment(id) {
    return apiService.request(`/kitchen/equipment/${id}/`, {
      method: "DELETE",
    });
  },

  async getEquipmentSchedules(equipmentId) {
    return apiService.request(`/kitchen/equipment/${equipmentId}/schedules/`);
  },

  async createEquipmentSchedule(equipmentId, payload) {
    return apiService.request(`/kitchen/equipment/${equipmentId}/schedules/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateEquipmentSchedule(scheduleId, patch) {
    return apiService.request(`/kitchen/equipment/schedules/${scheduleId}/`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async deleteEquipmentSchedule(scheduleId) {
    return apiService.request(`/kitchen/equipment/schedules/${scheduleId}/`, {
      method: "DELETE",
    });
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
