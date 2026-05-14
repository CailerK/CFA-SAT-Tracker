import apiService from './api';

const notificationService = {
  /**
   * Get all notifications for the current user
   * @returns {Promise<Array>} List of notifications
   */
  async getNotifications() {
    const response = await apiService.request('/notifications/');
    return response;
  },

  /**
   * Get unread notification count
   * @returns {Promise<{unread_count: number}>}
   */
  async getUnreadCount() {
    const response = await apiService.request('/notifications/unread-count/');
    return response;
  },

  /**
   * Mark a single notification as read
   * @param {number} id - Notification ID
   * @returns {Promise<Object>} Updated notification
   */
  async markAsRead(id) {
    const response = await apiService.request(`/notifications/${id}/mark-read/`, {
      method: 'POST',
    });
    return response;
  },

  /**
   * Mark all notifications as read
   * @returns {Promise<{marked_read: number}>}
   */
  async markAllAsRead() {
    const response = await apiService.request('/notifications/mark-all-read/', {
      method: 'POST',
    });
    return response;
  },
};

export default notificationService;
