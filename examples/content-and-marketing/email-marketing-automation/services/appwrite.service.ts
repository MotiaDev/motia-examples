import { Client, TablesDB, Users, Storage, ID, Query } from "node-appwrite";

interface AppwriteConfig {
  endpoint: string;
  projectId: string;
  apiKey: string;
  databaseId: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  preferences: {
    emailMarketing: boolean;
    frequency: "daily" | "weekly" | "monthly";
    categories: string[];
  };
  metadata: {
    signupDate: string;
    lastActiveDate: string;
    totalPurchases: number;
    vipStatus: boolean;
  };
}

interface Campaign {
  id: string;
  $id: string;
  $createdAt: string;
  name: string;
  subject: string;
  template: string;
  targetAudience: string;
  status: string;
  createdAt: string;
  metrics: string;
}

class AppwriteService {
  private client: Client;
  private tablesDB: TablesDB;
  private users: Users;
  private storage: Storage;
  private config: AppwriteConfig;

  constructor() {
    this.config = {
      endpoint: process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1",
      projectId: process.env.APPWRITE_PROJECT_ID || "",
      apiKey: process.env.APPWRITE_API_KEY || "",
      databaseId: process.env.APPWRITE_DATABASE_ID || "",
    };

    this.client = new Client()
      .setEndpoint(this.config.endpoint)
      .setProject(this.config.projectId)
      .setKey(this.config.apiKey);

    this.tablesDB = new TablesDB(this.client);
    this.users = new Users(this.client);
    this.storage = new Storage(this.client);
  }

  // Table IDs (formerly collections)
  private tables = {
    users: "users",
    campaigns: "campaigns",
    emails: "emails",
    analytics: "analytics",
    templates: "templates",
    sequences: "sequences",
  };

  // User Management
  async getUsers(queries: string[] = []): Promise<User[]> {
    try {
      const response = await this.tablesDB.listRows({
        databaseId: this.config.databaseId,
        tableId: this.tables.users,
        queries,
      });
      return response.rows as unknown as User[];
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const response = await this.tablesDB.getRow({
        databaseId: this.config.databaseId,
        tableId: this.tables.users,
        rowId: userId,
      });
      return response as unknown as User;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      console.error("Error fetching user:", error);
      throw error;
    }
  }

  async createUser(userData: Partial<User>): Promise<User> {
    try {
      const response = await this.tablesDB.createRow({
        databaseId: this.config.databaseId,
        tableId: this.tables.users,
        rowId: userData.id || ID.unique(),
        data: userData,
      });
      return response as unknown as User;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<User> {
    try {
      const response = await this.tablesDB.updateRow({
        databaseId: this.config.databaseId,
        tableId: this.tables.users,
        rowId: userId,
        data: userData,
      });
      return response as unknown as User;
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  async getUsersBySegment(segment: string): Promise<User[]> {
    try {
      const queries = [Query.equal("preferences.emailMarketing", true)];

      switch (segment) {
        case "new_users":
          const sevenDaysAgo = new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000
          ).toISOString();
          queries.push(Query.greaterThan("metadata.signupDate", sevenDaysAgo));
          break;

        case "active_users":
          const thirtyDaysAgo = new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000
          ).toISOString();
          queries.push(
            Query.greaterThan("metadata.lastActiveDate", thirtyDaysAgo)
          );
          break;

        case "vip_users":
          queries.push(Query.equal("metadata.vipStatus", true));
          break;
      }

      return await this.getUsers(queries);
    } catch (error) {
      console.error("Error fetching users by segment:", error);
      throw error;
    }
  }

  // Campaign Management
  async createCampaign(campaignData: Partial<Campaign>): Promise<Campaign> {
    try {
      const response = await this.tablesDB.createRow({
        databaseId: this.config.databaseId,
        tableId: this.tables.campaigns,
        rowId: campaignData.id || ID.unique(),
        data: campaignData,
      });
      return response as unknown as Campaign;
    } catch (error) {
      console.error("Error creating campaign:", error);
      throw error;
    }
  }

  async getCampaign(campaignId: string): Promise<Campaign | null> {
    try {
      const response = await this.tablesDB.getRow({
        databaseId: this.config.databaseId,
        tableId: this.tables.campaigns,
        rowId: campaignId,
      });
      return response as unknown as Campaign;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      console.error("Error fetching campaign:", error);
      throw error;
    }
  }

  async updateCampaign(
    campaignId: string,
    campaignData: Partial<Campaign>
  ): Promise<Campaign> {
    try {
      const response = await this.tablesDB.updateRow({
        databaseId: this.config.databaseId,
        tableId: this.tables.campaigns,
        rowId: campaignId,
        data: campaignData,
      });
      return response as unknown as Campaign;
    } catch (error) {
      console.error("Error updating campaign:", error);
      throw error;
    }
  }

  async getCampaigns(queries: string[] = []): Promise<Campaign[]> {
    try {
      const response = await this.tablesDB.listRows({
        databaseId: this.config.databaseId,
        tableId: this.tables.campaigns,
        queries,
      });
      return response.rows as unknown as Campaign[];
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      throw error;
    }
  }

  // Email Management
  async createEmail(emailData: any): Promise<any> {
    try {
      const response = await this.tablesDB.createRow({
        databaseId: this.config.databaseId,
        tableId: this.tables.emails,
        rowId: emailData.id || ID.unique(),
        data: emailData,
      });
      return response;
    } catch (error) {
      console.error("Error creating email:", error);
      throw error;
    }
  }

  async updateEmail(emailId: string, emailData: any): Promise<any> {
    try {
      const response = await this.tablesDB.updateRow({
        databaseId: this.config.databaseId,
        tableId: this.tables.emails,
        rowId: emailId,
        data: emailData,
      });
      return response;
    } catch (error) {
      console.error("Error updating email:", error);
      throw error;
    }
  }

  async getEmails(queries: string[] = []): Promise<any[]> {
    try {
      const response = await this.tablesDB.listRows({
        databaseId: this.config.databaseId,
        tableId: this.tables.emails,
        queries,
      });
      return response.rows;
    } catch (error) {
      console.error("Error fetching emails:", error);
      throw error;
    }
  }

  // Analytics Management
  async createAnalyticsRecord(analyticsData: any): Promise<any> {
    try {
      const response = await this.tablesDB.createRow({
        databaseId: this.config.databaseId,
        tableId: this.tables.analytics,
        rowId: analyticsData.id || ID.unique(),
        data: analyticsData,
      });
      return response;
    } catch (error) {
      console.error("Error creating analytics record:", error);
      throw error;
    }
  }

  async updateAnalyticsRecord(
    recordId: string,
    analyticsData: any
  ): Promise<any> {
    try {
      const response = await this.tablesDB.updateRow({
        databaseId: this.config.databaseId,
        tableId: this.tables.analytics,
        rowId: recordId,
        data: analyticsData,
      });
      return response;
    } catch (error) {
      console.error("Error updating analytics record:", error);
      throw error;
    }
  }

  async getAnalyticsRecords(queries: string[] = []): Promise<any[]> {
    try {
      const response = await this.tablesDB.listRows({
        databaseId: this.config.databaseId,
        tableId: this.tables.analytics,
        queries,
      });
      return response.rows;
    } catch (error) {
      console.error("Error fetching analytics records:", error);
      throw error;
    }
  }

  // Template Management
  async uploadTemplate(file: File, filename: string): Promise<any> {
    try {
      const response = await this.storage.createFile({
        bucketId: "templates",
        fileId: ID.unique(),
        file: file,
      });
      return response;
    } catch (error) {
      console.error("Error uploading template:", error);
      throw error;
    }
  }

  async getTemplate(fileId: string): Promise<Buffer> {
    try {
      const response = await this.storage.getFileDownload({
        bucketId: "templates",
        fileId: fileId,
      });
      return Buffer.from(response);
    } catch (error) {
      console.error("Error fetching template:", error);
      throw error;
    }
  }

  // Sequence Management
  async createSequence(sequenceData: any): Promise<any> {
    try {
      const response = await this.tablesDB.createRow({
        databaseId: this.config.databaseId,
        tableId: this.tables.sequences,
        rowId: sequenceData.id || ID.unique(),
        data: sequenceData,
      });
      return response;
    } catch (error) {
      console.error("Error creating sequence:", error);
      throw error;
    }
  }

  async updateSequence(sequenceId: string, sequenceData: any): Promise<any> {
    try {
      const response = await this.tablesDB.updateRow({
        databaseId: this.config.databaseId,
        tableId: this.tables.sequences,
        rowId: sequenceId,
        data: sequenceData,
      });
      return response;
    } catch (error) {
      console.error("Error updating sequence:", error);
      throw error;
    }
  }

  async getSequences(queries: string[] = []): Promise<any[]> {
    try {
      const response = await this.tablesDB.listRows({
        databaseId: this.config.databaseId,
        tableId: this.tables.sequences,
        queries,
      });
      return response.rows;
    } catch (error) {
      console.error("Error fetching sequences:", error);
      throw error;
    }
  }

  // Health Check
  async healthCheck(): Promise<boolean> {
    try {
      await this.tablesDB.list();
      return true;
    } catch (error) {
      console.error("Appwrite health check failed:", error);
      return false;
    }
  }
}

// Export singleton instance
export const appwriteService = new AppwriteService();
export default appwriteService;
