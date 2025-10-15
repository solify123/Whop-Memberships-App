const axios = require('axios');
const config = require('./config');

class WhopClient {
  constructor(apiKey = config.whopApiKey) {
    this.v2ProductsToken = config.v2ProductsToken;
    this.apiKey = apiKey;
    this.baseURL = config.baseUrl;
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.v2ProductsToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }

  async getProducts() {
    try {
      const response = await axios.get(`${this.baseURL}${config.productsUrl}`, {
        headers: this.getHeaders(),
        timeout: 20000
      });
      
      return { data: response.data.data || [], error: null };
    } catch (error) {
      console.error('[WhopClient] Error fetching products:', error.message);
      return { data: [], error: error.message };
    }
  }

  async getMemberships() {
    try {
      const response = await axios.get(`${this.baseURL}${config.membershipsUrl}`, {
        headers: this.getHeaders(),
        timeout: 20000
      });
      
      return { data: response.data.data || [], error: null };
    } catch (error) {
      console.error('[WhopClient] Error fetching memberships:', error.message);
      return { data: [], error: error.message };
    }
  }

  async sendDirectMessage(toUserIdOrUsername, message, attachments = []) {
    try {
      
      const payload = {
        toUserIdOrUsername,
        message
      };

      if (attachments && attachments.length > 0) {
        payload.attachments = attachments;
      }
      console.log('[WhopClient] Message payload:', payload);

      const response = await axios.post(`${this.baseURL}${config.messagesUrl}`, payload, {
        headers: this.getHeaders(),
        timeout: 30000
      });

      console.log('[WhopClient] Message response:', response.data);
      return { success: true, data: response.data, error: null };
    } catch (error) {
      console.error('[WhopClient] Error sending message:', error.response?.data || error.message);
      return { 
        success: false, 
        data: null, 
        error: error.response?.data?.message || error.message 
      };
    }
  }
}

module.exports = WhopClient;
