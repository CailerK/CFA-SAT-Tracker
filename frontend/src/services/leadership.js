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

  async updateTemplate(id, patch) {
    return apiService.request(`/leadership/360/templates/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async deleteTemplate(id) {
    return apiService.request(`/leadership/360/templates/${id}/`, {
      method: "DELETE",
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

  // Alias used by TakeEvaluationModal — keep both names so old call-sites
  // don't break.
  async respondToEvaluation360(id, responses) {
    return apiService.request(`/leadership/360/${id}/respond/`, {
      method: "POST",
      body: JSON.stringify({ responses }),
    });
  },

  async getEvaluationTemplate(id) {
    return apiService.request(`/leadership/360/templates/${id}/`);
  },

  async getEvaluationStats() {
    return apiService.request("/leadership/360/stats/");
  },

  // ---------------- Team Development Tracks ----------------

  async listTracks() {
    return apiService.request("/team-development/tracks/");
  },

  async createTrack(payload) {
    return apiService.request("/team-development/tracks/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateTrack(id, patch) {
    return apiService.request(`/team-development/tracks/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async deleteTrack(id) {
    return apiService.request(`/team-development/tracks/${id}/`, {
      method: "DELETE",
    });
  },

  // Bulk-reorder: send `{ track_ids: [...] }` in the new desired order.
  // Backend recomputes the `order` integers server-side, so the FE never
  // has to think about offsets.
  async reorderTracks(trackIds) {
    return apiService.request("/team-development/tracks/reorder/", {
      method: "POST",
      body: JSON.stringify({ track_ids: trackIds }),
    });
  },

  // Store-wide Team Development settings (currently just the visibility
  // toggle). GET returns the current state + `can_edit` flag.
  async getDevelopmentSettings() {
    return apiService.request("/team-development/settings/");
  },

  async updateDevelopmentSettings(patch) {
    return apiService.request("/team-development/settings/", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  // Per-user pathway: tracks (filtered by visibility) + this user's
  // progress + `current_track_id` for the highlighted card.
  async myPathway() {
    return apiService.request("/team-development/my-pathway/");
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

  async deleteNote(id) {
    return apiService.request(`/leadership/notes/${id}/`, {
      method: "DELETE",
    });
  },

  // ---------------- Development Plans (per-user enrollment) ----------------
  // Catalog of plans lives in the frontend constant `DEV_PLANS` while the
  // user transcribes them; backend stores only enrollments.

  async listMyDevPlans() {
    return apiService.request("/leadership/development-plans/");
  },

  // Team-progress: every dev-plan enrollment owned by a user STRICTLY BELOW
  // the requester in the role hierarchy and IN THE SAME STORE. Backend
  // returns 403 for team_members (no subordinates). Used by the manager+
  // "Team Progress" panel on the dev plans library page.
  async listTeamDevPlans() {
    return apiService.request("/leadership/development-plans/team_progress/");
  },

  async enrollInDevPlan({ plan_key, total_steps = 0, current_step = 0 }) {
    return apiService.request("/leadership/development-plans/", {
      method: "POST",
      body: JSON.stringify({
        plan_key,
        total_steps,
        current_step,
        status: "active",
      }),
    });
  },

  // Manager/admin assigns a plan to another team member with an optional
  // deadline. Backend rejects if the requester isn't a manager+ or if the
  // target user is in a different store.
  async assignDevPlanToUser({ user_id, plan_key, total_steps = 0, deadline = null }) {
    const body = {
      user: user_id,
      plan_key,
      total_steps,
      status: "active",
    };
    if (deadline) body.deadline = deadline; // ISO YYYY-MM-DD
    return apiService.request("/leadership/development-plans/", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async updateDevPlan(id, patch) {
    return apiService.request(`/leadership/development-plans/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async deleteDevPlan(id) {
    return apiService.request(`/leadership/development-plans/${id}/`, {
      method: "DELETE",
    });
  },

  // ---------------- Lesson completions (per enrollment) ----------------

  async listLessonCompletions(enrollmentId) {
    const qs = enrollmentId
      ? `?enrollment=${encodeURIComponent(enrollmentId)}`
      : "";
    return apiService.request(`/leadership/lesson-completions/${qs}`);
  },

  async completeLesson({ enrollmentId, lessonKey, notes = "" }) {
    return apiService.request("/leadership/lesson-completions/", {
      method: "POST",
      body: JSON.stringify({
        enrollment: enrollmentId,
        lesson_key: lessonKey,
        notes,
      }),
    });
  },

  async uncompleteLesson(completionId) {
    return apiService.request(
      `/leadership/lesson-completions/${completionId}/`,
      { method: "DELETE" },
    );
  },

  // PATCH the reflection notes on an existing completion without changing
  // its completed_at or other fields. Used by the "Edit Response" button.
  async updateLessonCompletion(completionId, { notes = "" } = {}) {
    return apiService.request(
      `/leadership/lesson-completions/${completionId}/`,
      {
        method: "PATCH",
        body: JSON.stringify({ notes }),
      },
    );
  },

  // ===== Manage Development Tracks (DevelopmentTrackPlan) =====
  async listPlans(fromPosition = null) {
    const qs = fromPosition
      ? `?from_position=${encodeURIComponent(fromPosition)}`
      : '';
    return apiService.request(`/team-development/plans/${qs}`);
  },
  async getPlan(id)        { return apiService.request(`/team-development/plans/${id}/`); },
  async createPlan(body)   { return apiService.request('/team-development/plans/', { method: 'POST',  body: JSON.stringify(body) }); },
  async updatePlan(id, p)  { return apiService.request(`/team-development/plans/${id}/`, { method: 'PATCH', body: JSON.stringify(p) }); },
  async deletePlan(id)     { return apiService.request(`/team-development/plans/${id}/`, { method: 'DELETE' }); },
  async reorderPlans(fromPosition, planIds) {
    return apiService.request('/team-development/plans/reorder/', {
      method: 'POST',
      body: JSON.stringify({ from_position: fromPosition, plan_ids: planIds }),
    });
  },
};

export default leadershipService;
