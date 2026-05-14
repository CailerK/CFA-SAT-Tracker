// Calendar events service.

import apiService from "./api";

const calendarService = {
  async list({ month } = {}) {
    const qs = month ? `?month=${encodeURIComponent(month)}` : "";
    return apiService.request(`/calendar/${qs}`);
  },

  async getUpcoming() {
    return apiService.request("/calendar/upcoming/");
  },

  async create(payload) {
    return apiService.request("/calendar/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(id, patch) {
    return apiService.request(`/calendar/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async remove(id) {
    return apiService.request(`/calendar/${id}/`, { method: "DELETE" });
  },
};

export default calendarService;
