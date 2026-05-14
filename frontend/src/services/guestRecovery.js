// Guest complaint / recovery service.

import apiService from "./api";

const guestRecoveryService = {
  async list({ status: statusQ, category, q } = {}) {
    const params = new URLSearchParams();
    if (statusQ && statusQ !== "All") params.set("status", statusQ);
    if (category && category !== "All") params.set("category", category);
    if (q) params.set("q", q);
    const qs = params.toString() ? `?${params}` : "";
    return apiService.request(`/guest-complaints/${qs}`);
  },

  async create(payload) {
    return apiService.request("/guest-complaints/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(id, patch) {
    return apiService.request(`/guest-complaints/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async assign(id, userId) {
    return apiService.request(`/guest-complaints/${id}/assign/`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    });
  },

  async resolve(id, resolution) {
    return apiService.request(`/guest-complaints/${id}/resolve/`, {
      method: "POST",
      body: JSON.stringify({ resolution }),
    });
  },

  async remove(id) {
    return apiService.request(`/guest-complaints/${id}/`, { method: "DELETE" });
  },

  async stats() {
    return apiService.request("/guest-complaints/stats/");
  },
};

export default guestRecoveryService;
