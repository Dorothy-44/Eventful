import axios, { AxiosInstance } from 'axios';

class PaystackService {
  private client: AxiosInstance;
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || '';
    
    if (!this.secretKey) {
      throw new Error('PAYSTACK_SECRET_KEY is not defined in environment variables');
    }

    this.client = axios.create({
      baseURL: 'https://api.paystack.co',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });
  }
   // Initialize a payment transaction

  async initializeTransaction(params: {
    email: string;
    amount: number; // In kobo 
    reference: string;
    metadata?: Record<string, any>;
  }) {
    try {
      const response = await this.client.post('/transaction/initialize', params);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Payment initialization failed');
    }
  }
   // Verify a transaction

  async verifyTransaction(reference: string) {
    try {
      const response = await this.client.get(`/transaction/verify/${reference}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Payment verification failed');
    }
  }

   // Get transaction details
   
  async getTransaction(id: string) {
    try {
      const response = await this.client.get(`/transaction/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get transaction');
    }
  }
   // List transactions
   
  async listTransactions(params?: { perPage?: number; page?: number }) {
    try {
      const response = await this.client.get('/transaction', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to list transactions');
    }
  }
}

export default new PaystackService();