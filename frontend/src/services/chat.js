// Team chat service — polling-based for v1.

import apiService from "./api";

const chatService = {
  async listChannels() {
    return apiService.request("/chat/channels/");
  },

  async getChannel(id) {
    return apiService.request(`/chat/channels/${id}/`);
  },

  async createChannel(payload) {
    return apiService.request("/chat/channels/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async listMessages(channelId, { before_id } = {}) {
    const params = new URLSearchParams();
    if (before_id) params.set("before_id", before_id);
    const qs = params.toString() ? `?${params}` : "";
    return apiService.request(
      `/chat/messages/channel/${channelId}/${qs}`
    );
  },

  async sendMessage({ channel, body }) {
    return apiService.request("/chat/messages/", {
      method: "POST",
      body: JSON.stringify({ channel, body }),
    });
  },

  async markRead(channelId) {
    return apiService.request(`/chat/channels/${channelId}/mark-read/`, {
      method: "POST",
    });
  },

  // ---- Group details ----
  async updateChannel(id, patch) {
    return apiService.request(`/chat/channels/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async deleteChannel(id) {
    return apiService.request(`/chat/channels/${id}/`, { method: "DELETE" });
  },

  async listMembers(channelId) {
    return apiService.request(`/chat/channels/${channelId}/members/`);
  },

  async addMembers(channelId, userIds) {
    return apiService.request(`/chat/channels/${channelId}/members/`, {
      method: "POST",
      body: JSON.stringify({ user_ids: userIds }),
    });
  },

  async removeMember(channelId, userId) {
    return apiService.request(
      `/chat/channels/${channelId}/members/${userId}/`,
      { method: "DELETE" },
    );
  },

  // ---- Reactions / pins / delete on messages ----
  async toggleReaction(messageId, emoji) {
    return apiService.request(`/chat/messages/${messageId}/react/`, {
      method: "POST",
      body: JSON.stringify({ emoji }),
    });
  },

  async togglePin(messageId) {
    return apiService.request(`/chat/messages/${messageId}/pin/`, {
      method: "POST",
    });
  },

  async deleteMessage(messageId) {
    return apiService.request(`/chat/messages/${messageId}/`, {
      method: "DELETE",
    });
  },
};

export default chatService;
