// Store + UserPreferences API service.
//
// Wraps /api/stores/me/, /api/stores/me/settings/, /api/users/me/preferences/
// behind a small typed surface that the React components can consume without
// knowing about fetch, CSRF, or JSON parsing details.

import apiService from "./api";

const settingsService = {
  // ---------- Store ----------

  /** GET the current user's store (incl. nested settings). */
  async getStore() {
    return apiService.request("/stores/me/");
  },

  /** PATCH store info (manager+). Body is a partial Store object. */
  async updateStore(patch) {
    return apiService.request("/stores/me/", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  // ---------- StoreSettings ----------

  /** GET store settings (feature toggles, access toggles, waste goals). */
  async getStoreSettings() {
    return apiService.request("/stores/me/settings/");
  },

  /** PATCH store settings (manager+). */
  async updateStoreSettings(patch) {
    return apiService.request("/stores/me/settings/", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  // ---------- UserPreferences ----------

  /** GET the current user's personal UI preferences. */
  async getPreferences() {
    return apiService.request("/users/me/preferences/");
  },

  /** PATCH the current user's preferences. */
  async updatePreferences(patch) {
    return apiService.request("/users/me/preferences/", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
};

export default settingsService;
