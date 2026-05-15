// Kitchen API service.
//
// Three sub-areas:
//   * Dashboard summary  — single GET /api/kitchen/summary/
//   * Checklists         — opening/transition/closing templates + completions
//   * Waste              — menu items, reasons, entries, KPIs, trend, top items, goals

import apiService from "./api";

const kitchenService = {
  // ---------------- Dashboard ----------------

  /** Single rollup endpoint for KitchenDashboard. */
  async getSummary() {
    return apiService.request("/kitchen/summary/");
  },

  // ---------------- Checklists ----------------

  /** GET checklist tasks for a shift (with today's completion attached). */
  async listChecklist({ shift } = {}) {
    const qs = shift ? `?shift=${encodeURIComponent(shift)}` : "";
    return apiService.request(`/kitchen/checklists/${qs}`);
  },

  /** Convenience: load all three shifts in parallel. */
  async listChecklistGrouped() {
    const [opening, transition, closing] = await Promise.all([
      this.listChecklist({ shift: "opening" }),
      this.listChecklist({ shift: "transition" }),
      this.listChecklist({ shift: "closing" }),
    ]);
    return {
      opening: opening.results || opening || [],
      transition: transition.results || transition || [],
      closing: closing.results || closing || [],
    };
  },

  async completeChecklistTask(id) {
    return apiService.request(`/kitchen/checklists/${id}/complete/`, {
      method: "POST",
    });
  },

  async uncompleteChecklistTask(id) {
    return apiService.request(`/kitchen/checklists/${id}/uncomplete/`, {
      method: "POST",
    });
  },

  async getChecklistHistory({ range = "7d" } = {}) {
    return apiService.request(
      `/kitchen/checklists/history/?range=${encodeURIComponent(range)}`
    );
  },

  async createChecklistTask({ shift, text, order = 0 }) {
    return apiService.request("/kitchen/checklists/", {
      method: "POST",
      body: JSON.stringify({ shift, text, order }),
    });
  },

  async deleteChecklistTask(id) {
    return apiService.request(`/kitchen/checklists/${id}/`, {
      method: "DELETE",
    });
  },

  // ---------------- Waste — catalogs ----------------

  async listMealPeriods() {
    return apiService.request("/kitchen/meal-periods/");
  },

  async listMenuItems({ meal } = {}) {
    const qs = meal ? `?meal=${encodeURIComponent(meal)}` : "";
    return apiService.request(`/kitchen/waste/menu-items/${qs}`);
  },

  async createMenuItem(payload) {
    return apiService.request("/kitchen/waste/menu-items/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateMenuItem(id, patch) {
    return apiService.request(`/kitchen/waste/menu-items/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async deleteMenuItem(id) {
    return apiService.request(`/kitchen/waste/menu-items/${id}/`, {
      method: "DELETE",
    });
  },

  async listReasons() {
    return apiService.request("/kitchen/waste/reasons/");
  },

  // ---------------- Waste — entries ----------------

  async listEntries({ date = "today", meal } = {}) {
    const params = new URLSearchParams({ date });
    if (meal) params.set("meal", meal);
    return apiService.request(`/kitchen/waste/entries/?${params}`);
  },

  /** POST: log a new waste entry. */
  async logEntry({ menu_item, qty = 1, unit = "pieces", reason = null, notes = "" }) {
    return apiService.request("/kitchen/waste/entries/", {
      method: "POST",
      body: JSON.stringify({ menu_item, qty, unit, reason, notes }),
    });
  },

  async deleteEntry(id) {
    return apiService.request(`/kitchen/waste/entries/${id}/`, {
      method: "DELETE",
    });
  },

  // ---------------- Waste — analytics ----------------

  async getKPIs() {
    return apiService.request("/kitchen/waste/kpis/");
  },

  async getTrend({ range = "30d" } = {}) {
    return apiService.request(`/kitchen/waste/trend/?range=${encodeURIComponent(range)}`);
  },

  async getTopItems({ range = "30d" } = {}) {
    return apiService.request(`/kitchen/waste/top-items/?range=${encodeURIComponent(range)}`);
  },

  async getGoals() {
    return apiService.request("/kitchen/waste/goals/");
  },

  async updateGoals(patch) {
    return apiService.request("/kitchen/waste/goals/", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
};

export default kitchenService;
