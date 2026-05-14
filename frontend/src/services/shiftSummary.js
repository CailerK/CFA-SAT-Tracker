// Shift Summary service — wraps /api/shift-summaries/ endpoints.
//
// The "draft" pattern lets the user type freely while a debounced autosave
// upserts /draft/today/. When they hit Save the draft flips to a submitted
// record.

import apiService from "./api";

const shiftSummaryService = {
  /** GET the list of submitted summaries with optional filters. */
  async list({ range, shift, status: shiftStatus } = {}) {
    const params = new URLSearchParams();
    if (range) params.set("range", range);
    if (shift) params.set("shift", shift);
    if (shiftStatus) params.set("status", shiftStatus);
    const qs = params.toString() ? `?${params}` : "";
    return apiService.request(`/shift-summaries/${qs}`);
  },

  /** GET today's in-progress draft (or 204 if none). */
  async getDraftToday() {
    try {
      return await apiService.request("/shift-summaries/draft/today/");
    } catch (err) {
      // 204 No Content also raises in our request wrapper? actually no,
      // it returns null. So we only hit this branch on 4xx/5xx.
      if (err.status === 404) return null;
      throw err;
    }
  },

  /** PATCH the draft. Backend upserts. */
  async saveDraft(patch) {
    return apiService.request("/shift-summaries/draft/today/", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  /** DELETE the draft. */
  async discardDraft() {
    return apiService.request("/shift-summaries/draft/today/", {
      method: "DELETE",
    });
  },

  /** Final submit. Body: full summary object with is_draft=false. */
  async submit(payload) {
    return apiService.request("/shift-summaries/", {
      method: "POST",
      body: JSON.stringify({ ...payload, is_draft: false }),
    });
  },

  /** GET single summary. */
  async get(id) {
    return apiService.request(`/shift-summaries/${id}/`);
  },

  // ---------- Tag catalog ----------

  /** GET tag catalog (wins + challenges). */
  async listTags({ kind } = {}) {
    const qs = kind ? `?kind=${encodeURIComponent(kind)}` : "";
    return apiService.request(`/shift-summaries/tags/${qs}`);
  },

  /** POST: create a new tag (manager+). */
  async createTag({ kind, label, order = 0 }) {
    return apiService.request("/shift-summaries/tags/", {
      method: "POST",
      body: JSON.stringify({ kind, label, order, is_active: true }),
    });
  },
};

export default shiftSummaryService;
