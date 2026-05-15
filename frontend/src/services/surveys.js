// Surveys service.

import apiService from "./api";

const surveysService = {
  async list({ status: statusQ } = {}) {
    const params = new URLSearchParams();
    if (statusQ && statusQ !== "all") params.set("status", statusQ);
    const qs = params.toString() ? `?${params}` : "";
    return apiService.request(`/surveys/${qs}`);
  },

  async get(id) {
    return apiService.request(`/surveys/${id}/`);
  },

  async create(payload) {
    return apiService.request("/surveys/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(id, patch) {
    return apiService.request(`/surveys/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async respond(id, answers) {
    return apiService.request(`/surveys/${id}/respond/`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
  },

  async getResults(id) {
    return apiService.request(`/surveys/${id}/results/`);
  },

  async remove(id) {
    return apiService.request(`/surveys/${id}/`, { method: "DELETE" });
  },

  async stats() {
    return apiService.request("/surveys/stats/");
  },
};

export default surveysService;
