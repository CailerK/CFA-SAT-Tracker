// Cleaning Tasks API service.
//
// Same template/completion pattern as FOH tasks. The backend returns
// `today_completion` attached to each row so the UI renders state in
// one round-trip.

import apiService from "./api";

const cleaningService = {
  /** GET tasks filtered by scope + optional frequency. */
  async list({ scope = "foh", frequency } = {}) {
    const params = new URLSearchParams({ scope });
    if (frequency) params.set("frequency", frequency);
    return apiService.request(`/cleaning/tasks/?${params}`);
  },

  /** GET tasks grouped by frequency for a given scope. */
  async listGroupedByFrequency({ scope = "foh" } = {}) {
    const res = await this.list({ scope });
    const rows = res.results || res || [];
    const grouped = { daily: [], weekly: [], monthly: [], quarterly: [] };
    for (const t of rows) {
      if (grouped[t.frequency]) grouped[t.frequency].push(t);
    }
    return grouped;
  },

  /** POST: create a task (manager+). */
  async create({
    scope, name, frequency,
    area = "", description = "",
    days = [], supplies = [], links = [],
    estimated_minutes = null,
    assignee = null,
    order = 0,
  }) {
    return apiService.request("/cleaning/tasks/", {
      method: "POST",
      body: JSON.stringify({
        scope, name, area, description, frequency,
        days, supplies, links,
        estimated_minutes, assignee, order,
      }),
    });
  },

  /** GET team members in the requester's store, for the Assign To picker. */
  async searchTeamMembers({ q = "", limit = 10 } = {}) {
    const params = new URLSearchParams({ status: "active" });
    if (q) params.set("q", q);
    const res = await apiService.request(`/team/members/?${params}`);
    const rows = res.results || res || [];
    return rows.slice(0, limit);
  },

  async update(id, patch) {
    return apiService.request(`/cleaning/tasks/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async remove(id) {
    return apiService.request(`/cleaning/tasks/${id}/`, { method: "DELETE" });
  },

  /** POST: mark today done. */
  async complete(id, { notes = "" } = {}) {
    return apiService.request(`/cleaning/tasks/${id}/complete/`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    });
  },

  /** POST: undo today's completion. */
  async uncomplete(id) {
    return apiService.request(`/cleaning/tasks/${id}/uncomplete/`, {
      method: "POST",
    });
  },

  /** GET per-frequency counts for the page header. */
  async getCounts({ scope = "foh" } = {}) {
    return apiService.request(`/cleaning/tasks/counts/?scope=${scope}`);
  },

  /** GET recent completion history. */
  async getHistory({ scope, range = "30d" } = {}) {
    const params = new URLSearchParams({ range });
    if (scope) params.set("scope", scope);
    return apiService.request(`/cleaning/tasks/history/?${params}`);
  },
};

export default cleaningService;
