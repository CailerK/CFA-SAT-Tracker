// FOH Tasks service.
//
// Wraps /api/foh/tasks/ endpoints with typed methods. The serializer on the
// backend returns each template with `today_completion` already attached, so
// the frontend only needs one GET to render the checkbox state for the day.

import apiService from "./api";

const fohService = {
  /** GET all active FOH task templates, optionally filtered by shift. */
  async listTasks({ shift } = {}) {
    const qs = shift ? `?shift=${encodeURIComponent(shift)}` : "";
    return apiService.request(`/foh/tasks/${qs}`);
  },

  /** GET tasks grouped by shift — convenience wrapper around three list calls. */
  async listTasksGroupedByShift() {
    const [opening, transition, closing] = await Promise.all([
      this.listTasks({ shift: "opening" }),
      this.listTasks({ shift: "transition" }),
      this.listTasks({ shift: "closing" }),
    ]);
    return {
      opening: opening.results || opening,
      transition: transition.results || transition,
      closing: closing.results || closing,
    };
  },

  /** POST: create a new task template (manager+). */
  async createTask({ shift, text, order = 0 }) {
    return apiService.request("/foh/tasks/", {
      method: "POST",
      body: JSON.stringify({ shift, text, order }),
    });
  },

  /** PATCH: edit text/order (manager+). */
  async updateTask(id, patch) {
    return apiService.request(`/foh/tasks/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  /** DELETE: soft-archive a template (manager+). */
  async deleteTask(id) {
    return apiService.request(`/foh/tasks/${id}/`, { method: "DELETE" });
  },

  /** POST: mark today's completion. Idempotent. */
  async completeTask(id, { initials = "" } = {}) {
    return apiService.request(`/foh/tasks/${id}/complete/`, {
      method: "POST",
      body: JSON.stringify({ initials }),
    });
  },

  /** POST: undo today's completion. */
  async uncompleteTask(id) {
    return apiService.request(`/foh/tasks/${id}/uncomplete/`, {
      method: "POST",
    });
  },

  /** POST: bulk reorder (manager+). Items shape: [{id, order}]. */
  async reorderTasks(items) {
    return apiService.request("/foh/tasks/reorder/", {
      method: "POST",
      body: JSON.stringify({ items }),
    });
  },

  /** GET: completion history rollup.
   *
   * Pass either `{ range: '7d'|'14d'|'30d'|'Nd' }` for a preset window, or
   * `{ start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }` for a custom date range.
   * When both `start` and `end` are provided, the backend uses them and
   * ignores `range`.
   */
  async getHistory({ range = "7d", start, end } = {}) {
    const params = new URLSearchParams();
    if (start && end) {
      params.set("start", start);
      params.set("end", end);
    } else {
      params.set("range", range);
    }
    return apiService.request(`/foh/tasks/history/?${params}`);
  },
};

export default fohService;
