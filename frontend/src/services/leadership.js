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
};

export default leadershipService;
