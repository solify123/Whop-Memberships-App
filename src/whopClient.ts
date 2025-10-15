import axios from 'axios';
import config from './config';
import { WhopServerSdk } from "@whop/api";

export const whopSdk = WhopServerSdk({
  appId: config.whopAppId,
  appApiKey: config.whopApiKey,
  onBehalfOfUserId: config.whopAgentUserId,
  companyId: config.whopCompanyId,
});

export interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  status?: string;
  [key: string]: any;
}

export interface Membership {
  id: string;
  user: string;
  product: string;
  email?: string;
  status: string;
  valid: boolean;
  [key: string]: any;
}

export interface Attachment {
  directUploadId?: string;
  id?: string;
}

export interface MessagePayload {
  toUserIdOrUsername: string;
  message: string;
  attachments?: Attachment[];
}

export interface ApiResponse<T> {
  data: T;
  error: string | null;
}

export interface MessageResponse {
  success: boolean;
  data: any;
  error: string | null;
}

export class WhopClient {
  private v2ProductsToken: string;
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey: string = config.whopApiKey) {
    this.v2ProductsToken = config.v2ProductsToken;
    this.apiKey = apiKey;
    this.baseURL = config.baseUrl;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.v2ProductsToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }

  async getProducts(): Promise<ApiResponse<Product[]>> {
    try {
      const response = await axios.get(`${this.baseURL}${config.productsUrl}`, {
        headers: this.getHeaders(),
        timeout: 20000
      });

      return { data: response.data.data || [], error: null };
    } catch (error: any) {
      console.error('[WhopClient] Error fetching products:', error.message);
      return { data: [], error: error.message };
    }
  }

  async getMemberships(): Promise<ApiResponse<Membership[]>> {
    try {
      const response = await axios.get(`${this.baseURL}${config.membershipsUrl}`, {
        headers: this.getHeaders(),
        timeout: 20000
      });

      return { data: response.data.data || [], error: null };
    } catch (error: any) {
      console.error('[WhopClient] Error fetching memberships:', error.message);
      return { data: [], error: error.message };
    }
  }

  async sendDirectMessage(
    toUserIdOrUsername: string,
    message: string,
    attachments: Attachment[] = []
  ): Promise<MessageResponse> {
    try {
      const result = await whopSdk.messages.sendDirectMessageToUser({
        toUserIdOrUsername,
        message,
        attachments
      });

      return { success: true, data: result, error: null };
    } catch (error: any) {
      console.error('[WhopClient] Error sending message:', error.message);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }
}

export default WhopClient;
