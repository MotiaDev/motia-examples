import axios from 'axios';

const devToApiKey = process.env.DEVTO_API_KEY;

export class DevToService {
  constructor() {
    this.api = axios.create({
      baseURL: 'https://dev.to/api',
      headers: {
        'api-key': devToApiKey,
      },
    });
  }

  async getLastPublishedArticle() {
    try {
      const response = await this.api.get('/articles/me/published?page=1&per_page=1');
      return response.data?.[0] || null;
    } catch (error) {
      console.error('Failed to fetch Dev.to articles:', error.message);
      return null;
    }
  }
}