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
};

export default chatService;
