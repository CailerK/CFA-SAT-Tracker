// Team domain service — members, documentation, training, quick links.

import apiService from "./api";

const teamService = {
  // ---------------- Members ----------------

  async listMembers({ status, q, dept } = {}) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    if (dept) params.set("dept", dept);
    const qs = params.toString() ? `?${params}` : "";
    return apiService.request(`/team/members/${qs}`);
  },

  async getStats() {
    return apiService.request("/team/stats/");
  },

  async createMember(payload) {
    return apiService.request("/team/members/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateMember(id, patch) {
    return apiService.request(`/team/members/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async deleteMember(id) {
    return apiService.request(`/team/members/${id}/`, { method: "DELETE" });
  },

  // ---------------- Documentation ----------------

  async docStats({ window = "60d" } = {}) {
    return apiService.request(`/team/documentation/stats/?window=${window}`);
  },

  async docEmployees({ filter, q } = {}) {
    const params = new URLSearchParams();
    if (filter && filter !== "all") params.set("filter", filter);
    if (q) params.set("q", q);
    const qs = params.toString() ? `?${params}` : "";
    return apiService.request(`/team/documentation/employees/${qs}`);
  },

  async listEmployeeRecords(userId) {
    return apiService.request(`/team/documentation/employees/${userId}/records/`);
  },

  async addEmployeeRecord(userId, payload) {
    return apiService.request(
      `/team/documentation/employees/${userId}/records/`,
      { method: "POST", body: JSON.stringify(payload) }
    );
  },

  async deleteRecord(recordId) {
    return apiService.request(`/team/documentation/records/${recordId}/`, {
      method: "DELETE",
    });
  },

  // ---------------- Training ----------------

  async listPlans() {
    return apiService.request("/training/plans/");
  },

  async listTrainees({ status, q } = {}) {
    const params = new URLSearchParams();
    if (status && status !== "all") params.set("status", status);
    if (q) params.set("q", q);
    const qs = params.toString() ? `?${params}` : "";
    return apiService.request(`/training/trainees/${qs}`);
  },

  async assignTraining({ user, plan }) {
    return apiService.request("/training/trainees/", {
      method: "POST",
      body: JSON.stringify({ user, plan }),
    });
  },

  async updateTrainee(id, patch) {
    return apiService.request(`/training/trainees/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async deleteTrainee(id) {
    return apiService.request(`/training/trainees/${id}/`, { method: "DELETE" });
  },

  async trainingStats() {
    return apiService.request("/training/stats/");
  },

  async progressByDepartment() {
    return apiService.request("/training/progress-by-department/");
  },

  // ---------------- Quick Links ----------------

  async listQuickLinks() {
    return apiService.request("/team/quick-links/");
  },

  async listLinkCategories() {
    return apiService.request("/team/quick-links/categories/");
  },

  async createQuickLink(payload) {
    return apiService.request("/team/quick-links/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async deleteQuickLink(id) {
    return apiService.request(`/team/quick-links/${id}/`, { method: "DELETE" });
  },

  async createLinkCategory(payload) {
    return apiService.request("/team/quick-links/categories/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

export default teamService;
