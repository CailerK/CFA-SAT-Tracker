// Setup Sheets API service.
//
// Two resources:
//   * Templates  — reusable; lives at /api/setup-sheets/templates/
//   * Sheets     — week-of records; lives at /api/setup-sheets/
//
// Frontend cards show a `time_blocks_count` (templates) and a
// `week_range`/owner_name/employees/areas/hours summary (sheets) — both come
// from the serializer pre-computed so the UI doesn't have to assemble them.

import apiService from "./api";

const setupSheetsService = {
  // ---------------- Templates ----------------

  async listTemplates() {
    return apiService.request("/setup-sheets/templates/");
  },

  async getTemplate(id) {
    return apiService.request(`/setup-sheets/templates/${id}/`);
  },

  async createTemplate({ name, description = "" }) {
    return apiService.request("/setup-sheets/templates/", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    });
  },

  async updateTemplate(id, patch) {
    return apiService.request(`/setup-sheets/templates/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async deleteTemplate(id) {
    return apiService.request(`/setup-sheets/templates/${id}/`, {
      method: "DELETE",
    });
  },

  /** Atomically replace a template's time blocks. Each block:
   *  { day_of_week, start_time, end_time, label, order,
   *    positions_needed: { front_counter: [], drive_thru: [], kitchen: [] } }
   */
  async saveTemplateTimeBlocks(id, timeBlocks) {
    return apiService.request(
      `/setup-sheets/templates/${id}/save-time-blocks/`,
      {
        method: "POST",
        body: JSON.stringify({ time_blocks: timeBlocks }),
      }
    );
  },

  // ---------------- Sheets ----------------

  /** List sheets. Filters: mine (bool), status, q. */
  async listSheets({ mine, status: statusFilter, q } = {}) {
    const params = new URLSearchParams();
    if (mine) params.set("mine", "true");
    if (statusFilter) params.set("status", statusFilter);
    if (q) params.set("q", q);
    const qs = params.toString() ? `?${params}` : "";
    return apiService.request(`/setup-sheets/${qs}`);
  },

  async getSheet(id) {
    return apiService.request(`/setup-sheets/${id}/`);
  },

  async createSheet(payload) {
    return apiService.request("/setup-sheets/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateSheet(id, patch) {
    return apiService.request(`/setup-sheets/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async deleteSheet(id) {
    return apiService.request(`/setup-sheets/${id}/`, { method: "DELETE" });
  },

  /** Clone an existing sheet (with its time blocks) as a draft. */
  async duplicateSheet(id) {
    return apiService.request(`/setup-sheets/${id}/duplicate/`, {
      method: "POST",
    });
  },

  /** Share with another user. */
  async shareSheet(id, { user_id, permission = "view" }) {
    return apiService.request(`/setup-sheets/${id}/share/`, {
      method: "POST",
      body: JSON.stringify({ user_id, permission }),
    });
  },

  /** Upload a HotSchedules Excel file. v1: just acknowledged, not parsed yet. */
  async uploadFile(id, file) {
    // Note: this bypasses apiService.request because we need multipart/form-data,
    // not JSON. We still want credentials + CSRF.
    const formData = new FormData();
    formData.append("file", file);
    const csrfToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrftoken="))
      ?.split("=")[1];
    const url = `${apiService.baseURL}/setup-sheets/${id}/upload/`;
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: csrfToken ? { "X-CSRFToken": csrfToken } : {},
      body: formData,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Upload failed (${res.status})`);
    }
    return res.json();
  },
};

export default setupSheetsService;
