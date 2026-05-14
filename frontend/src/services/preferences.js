import apiService from './api';

const preferencesService = {
  /**
   * Get current user's preferences
   * @returns {Promise<Object>} User preferences
   */
  async getPreferences() {
    const response = await apiService.request('/users/me/preferences/');
    return response;
  },

  /**
   * Update user preferences
   * @param {Object} preferences - Preferences to update
   * @returns {Promise<Object>} Updated preferences
   */
  async updatePreferences(preferences) {
    const response = await apiService.request('/users/me/preferences/', {
      method: 'PATCH',
      body: JSON.stringify(preferences),
    });
    return response;
  },

  /**
   * Update quick action IDs
   * @param {Array<string>} actionIds - Array of action IDs
   * @returns {Promise<Object>} Updated preferences
   */
  async updateQuickActions(actionIds) {
    return this.updatePreferences({ quick_action_ids: actionIds });
  },

  /**
   * Update insight IDs
   * @param {Array<string>} insightIds - Array of insight IDs
   * @returns {Promise<Object>} Updated preferences
   */
  async updateInsights(insightIds) {
    return this.updatePreferences({ insight_ids: insightIds });
  },
};

export default preferencesService;
