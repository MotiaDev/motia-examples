import {
  Client,
  Messaging,
  Users,
  ID,
  MessagingProviderType,
} from "node-appwrite";

interface EmailProvider {
  send(email: EmailData): Promise<EmailResult>;
}

interface EmailData {
  to: string;
  subject: string;
  htmlContent: string;
  campaignId: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class AppwriteMessagingProvider implements EmailProvider {
  private client: Client;
  private messaging: Messaging;
  private users: Users;

  constructor() {
    this.client = new Client()
      .setEndpoint(
        process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1"
      )
      .setProject(process.env.APPWRITE_PROJECT_ID || "")
      .setKey(process.env.APPWRITE_API_KEY || "");

    this.messaging = new Messaging(this.client);
    this.users = new Users(this.client);
  }

  async send(email: EmailData): Promise<EmailResult> {
    try {
      // Step 1: Create or find user with this email
      const userId = await this.ensureUserExists(email.to);

      // Step 2: Create or find email target for this user
      const targetId = await this.ensureEmailTarget(userId, email.to);

      // Step 3: Send email using target ID (not email address)
      const result = await this.messaging.createEmail(
        ID.unique(), // messageId
        email.subject, // subject
        email.htmlContent, // content
        [], // topics (empty)
        [], // users (empty - don't use this for direct emails)
        [targetId], // targets - use target IDs, not email addresses!
        [], // cc
        [], // bcc
        [], // attachments
        false, // draft
        true, // html
        undefined // scheduledAt
      );

      return {
        success: true,
        messageId: result.$id,
      };
    } catch (error) {
      console.error("Appwrite email send failed:", error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Email delivery failed",
      };
    }
  }

  // Helper method to create user if doesn't exist
  private async ensureUserExists(email: string): Promise<string> {
    try {
      // Try to find existing user by email
      const usersList = await this.users.list([`email:${email}`]);

      if (usersList.users.length > 0) {
        return usersList.users[0].$id;
      }

      // User doesn't exist, create one
      const newUser = await this.users.create(
        ID.unique(), // userId
        email, // email
        undefined, // phone (optional)
        undefined, // password (optional)
        email.split("@")[0] // name - use part before @ as name
      );

      return newUser.$id;
    } catch (error) {
      console.error("Failed to ensure user exists:", error);
      throw error;
    }
  }

  // Helper method to create email target for user
  private async ensureEmailTarget(
    userId: string,
    email: string
  ): Promise<string> {
    try {
      // Check if user already has an email target
      const targets = await this.users.listTargets(userId);

      // Find existing email target
      const emailTarget = targets.targets.find(
        (target) =>
          target.providerType === "email" && target.identifier === email
      );

      if (emailTarget) {
        return emailTarget.$id;
      }

      // Create new email target
      const newTarget = await this.users.createTarget(
        userId, // userId
        ID.unique(), // targetId
        MessagingProviderType.Email, // providerType
        email, // identifier (the actual email address)
        undefined, // providerId (optional - uses default provider)
        `Email for ${email}` // name (optional)
      );

      return newTarget.$id;
    } catch (error) {
      console.error("Failed to ensure email target:", error);
      throw error;
    }
  }
}

export default AppwriteMessagingProvider;
