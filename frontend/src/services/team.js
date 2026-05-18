// Team domain service — members, documentation, training, quick links.

import apiService from "./api";

const teamService = {
  // ---------------- Members ----------------

  async listMembers({ status, q, dept, ordering } = {}) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    if (dept) params.set("dept", dept);
    if (ordering) params.set("ordering", ordering);
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

  async docAnalytics() {
    // Discipline analytics rollup: totals + 7-bucket risk distribution +
    // per-employee risk levels. Backs the "View Analytics" page.
    return apiService.request("/team/documentation/analytics/");
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

  async acknowledgeRecord(recordId) {
    return apiService.request(
      `/team/documentation/records/${recordId}/acknowledge/`,
      { method: "POST" },
    );
  },

  // ---------------- Training ----------------

  async listPlans() {
    return apiService.request("/training/plans/");
  },

  async createPlan(payload) {
    return apiService.request("/training/plans/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updatePlan(id, patch) {
    return apiService.request(`/training/plans/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async deletePlan(id) {
    return apiService.request(`/training/plans/${id}/`, { method: "DELETE" });
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

  async updateQuickLink(id, patch) {
    return apiService.request(`/team/quick-links/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(patch),
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

  async updateLinkCategory(id, patch) {
    return apiService.request(`/team/quick-links/categories/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async deleteLinkCategory(id) {
    return apiService.request(`/team/quick-links/categories/${id}/`, {
      method: "DELETE",
    });
  },
};

export default teamService;
