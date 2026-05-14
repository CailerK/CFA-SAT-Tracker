// Weekly Digest service.

import apiService from "./api";

const weeklyDigestService = {
  /** GET aggregated digest for a week. Optional ?week=YYYY-MM-DD. */
  async get({ week } = {}) {
    const qs = week ? `?week=${encodeURIComponent(week)}` : "";
    return apiService.request(`/weekly-digest/${qs}`);
  },
};

export default weeklyDigestService;
