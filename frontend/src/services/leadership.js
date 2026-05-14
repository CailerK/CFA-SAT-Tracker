// Leadership 360 + Team Development service.

import apiService from "./api";

const leadershipService = {
  // ---------------- 360 Evaluations ----------------

  async listTemplates() {
    return apiService.request("/leadership/360/templates/");
  },

  async createTemplate(payload) {
    return apiService.request("/leadership/360/templates/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async listEvaluations({ status: statusQ, q } = {}) {
    const params = new URLSearchParams();
    if (statusQ && statusQ !== "all") params.set("status", statusQ);
    if (q) params.set("q", q);
    const qs = params.toString() ? `?${params}` : "";
    return apiService.request(`/leadership/360/${qs}`);
  },

  async getEvaluation(id) {
    return apiService.request(`/leadership/360/${id}/`);
  },

  async createEvaluation(payload) {
    return apiService.request("/leadership/360/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async respondToEvaluation(id, responses) {
    return apiService.request(`/leadership/360/${id}/respond/`, {
      method: "POST",
      body: JSON.stringify({ responses }),
    });
  },

  async getEvaluationStats() {
    return apiService.request("/leadership/360/stats/");
  },

  // ---------------- Team Development Tracks ----------------

  async listTracks() {
    return apiService.request("/team-development/tracks/");
  },

  async listProgress({ scope = "all", position } = {}) {
    const params = new URLSearchParams();
    if (scope) params.set("scope", scope);
    if (position) params.set("position", position);
    const qs = params.toString() ? `?${params}` : "";
    return apiService.request(`/team-development/progress/${qs}`);
  },

  async updateProgress(id, patch) {
    return apiService.request(`/team-development/progress/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  // ---------------- Leadership Areas + Notes ----------------

  async listAreas() {
    return apiService.request("/leadership/areas/");
  },

  async createArea({ area_key }) {
    return apiService.request("/leadership/areas/", {
      method: "POST",
      body: JSON.stringify({ area_key }),
    });
  },

  async deleteArea(id) {
    return apiService.request(`/leadership/areas/${id}/`, { method: "DELETE" });
  },

  async listNotes() {
    return apiService.request("/leadership/notes/");
  },

  async createNote({ text }) {
    return apiService.request("/leadership/notes/", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },
};

export default leadershipService;
