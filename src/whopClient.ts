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
  notificationType?: string;
  timestamp?: string;
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
      const allProducts: Product[] = [];
      let currentPage = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        const response = await axios.get(`${this.baseURL}/api/v2/products?page=${currentPage}&per=50`, {
          headers: this.getHeaders(),
          timeout: 3000
        });

        const products = response.data.data || [];
        allProducts.push(...products);
        const total_page = 3;

        hasMorePages = currentPage < total_page;
        currentPage++;
        if (currentPage > 100) {
          console.warn('[WhopClient] Reached maximum page limit (100), stopping pagination');
          break;
        }

      }

      console.log(`[WhopClient] ✅ Fetched ${allProducts.length} products total`);
      console.log(`[WhopClient] Processed ${currentPage - 1} pages`);
      return { data: allProducts, error: null };
    } catch (error: any) {
      console.error('[WhopClient] Error fetching products:', error.message);
      return { data: [], error: error.message };
    }
  }

  async getMemberships(): Promise<ApiResponse<Membership[]>> {
    try {
      const allMemberships: Membership[] = [];
      let currentPage = 1;
      let hasMorePages = true;

      // while (hasMorePages) {
      console.log(`[WhopClient] Fetching memberships page ${currentPage}...`);

      const response = await axios.get(`${this.baseURL}${config.membershipsUrl}?page=${currentPage}&per=50`, {
        headers: this.getHeaders(),
        timeout: 3000
      });

      const memberships = response.data.data || [];
      allMemberships.push(...memberships);

      // Check multiple possible pagination structures
      const pagination = response.data.pagination || response.data.meta;
      const totalPages = 5;
      const currentPageNum = pagination?.current_page || currentPage;
      const perPage = pagination?.per_page || 100;
      const total = pagination?.total || pagination?.total_count || 0;

      hasMorePages = currentPage < totalPages;
      currentPage++;



      // Additional safety: if we got fewer memberships than expected per page, we might be at the end
      if (memberships.length < perPage && currentPage <= totalPages) {
        console.log(`[WhopClient] Got ${memberships.length} memberships (less than ${perPage} per page), likely at end`);
      }
      // }

      console.log(`[WhopClient] ✅ Fetched ${allMemberships.length} memberships total`);
      console.log(`[WhopClient] Processed ${currentPage - 1} pages`);
      return { data: allMemberships, error: null };
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
      // Validate input
      if (!toUserIdOrUsername || toUserIdOrUsername.trim() === '') {
        const errorMsg = 'User ID or username is required';
        console.error('[WhopClient] Validation error:', errorMsg);
        return {
          success: false,
          data: null,
          error: errorMsg
        };
      }

      if (!message || message.trim() === '') {
        const errorMsg = 'Message content is required';
        console.error('[WhopClient] Validation error:', errorMsg);
        return {
          success: false,
          data: null,
          error: errorMsg
        };
      }

      const result = await whopSdk.messages.sendDirectMessageToUser({
        toUserIdOrUsername,
        message,
        attachments
      });

      console.log(`[WhopClient] ✅ DM sent successfully to: ${toUserIdOrUsername}`);
      return { success: true, data: result, error: null };
    } catch (error: any) {
      console.error('[WhopClient] Error sending DM:', error.message);
      return { success: false, data: null, error: error.message };
    }
  }
}

export default WhopClient;
