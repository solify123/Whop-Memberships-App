import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  whopAppId: string;
  whopAgentUserId: string;
  whopCompanyId: string;
  whopApiKey: string;
  v2ProductsToken: string;
  port: number;
  nodeEnv: string;
  baseUrl: string;
  productsUrl: string;
  membershipsUrl: string;
  messagesUrl: string;
}

const config: Config = {
  // Whop API Configuration
  whopAppId: process.env.WHOP_APP_ID || 'app_9ywTRXHkgq2gtA',
  whopAgentUserId: process.env.WHOP_AGENT_USER_ID || 'user_F6eSYcqz7e560',
  whopCompanyId: process.env.WHOP_COMPANY_ID || 'biz_sWgLZiLIGrPlj3',
  whopApiKey: process.env.WHOP_API_KEY || 'Y1NTaf4evLV7tIw2oclIFKzpSAOxiOLcKMw1xEXpD1A',
  v2ProductsToken: process.env.V2_PRODUCTS_TOKEN || 'YQTLCygWYbVDuCk88fskCAnKpthL2PoHKXcA8NZtQDE',
  
  // Server Configuration
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // API URLs
  baseUrl: 'https://api.whop.com',
  productsUrl: '/api/v2/products?page=1&per=10',
  membershipsUrl: '/api/v2/memberships',
  messagesUrl: '/api/v2/messages'
};

export default config;
