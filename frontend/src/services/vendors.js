// Vendor directory service.

import apiService from "./api";

const vendorsService = {
  async list({ category, q } = {}) {
    const params = new URLSearchParams();
    if (category && category !== "All") params.set("category", category);
    if (q) params.set("q", q);
    const qs = params.toString() ? `?${params}` : "";
    return apiService.request(`/vendors/${qs}`);
  },

  async get(id) {
    return apiService.request(`/vendors/${id}/`);
  },

  async create(payload) {
    return apiService.request("/vendors/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(id, patch) {
    return apiService.request(`/vendors/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async remove(id) {
    return apiService.request(`/vendors/${id}/`, { method: "DELETE" });
  },
};

export default vendorsService;
