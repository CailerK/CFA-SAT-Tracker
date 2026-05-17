import apiService from './api';

const dashboardService = {
  /**
   * Get dashboard insights catalog
   * @returns {Promise<{insights: Array}>}
   */
  async getInsightsCatalog() {
    const response = await apiService.request('/dashboard/insights/catalog/');
    return response;
  },

  /**
   * Get dashboard insights values
   * @param {Array<string>} insightIds - Array of insight IDs to fetch values for
   * @returns {Promise<{values: Object}>}
   */
  async getInsightsValues(insightIds) {
    const ids = insightIds.join(',');
    const response = await apiService.request(`/dashboard/insights/values/?ids=${ids}`);
    return response;
  },

  /**
   * Get weekly digest
   * @param {string} week - Optional week start date (YYYY-MM-DD)
   * @returns {Promise<Object>} Weekly digest data
   */
  async getWeeklyDigest(week = null) {
    const url = week ? `/weekly-digest/?week=${week}` : '/weekly-digest/';
    const response = await apiService.request(url);
    return response;
  },

  /**
   * Get the user's "My Priorities" — open items aggregated from
   * development plans, training assignments, calendar deadlines, and 360
   * evaluations.
   * @returns {Promise<{count: number, items: Array}>}
   */
  async getPriorities() {
    return apiService.request('/dashboard/priorities/');
  },
};

export default dashboardService;
