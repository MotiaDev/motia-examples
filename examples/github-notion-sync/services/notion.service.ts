import { Client } from '@notionhq/client';

export interface NotionPageData {
  issueId: number;
  issueNumber: number;
  title: string;
  url: string;
  repository?: string;
}

export interface NotionUpdateData {
  issueId: number;
  title?: string;
  updateType: 'edit' | 'close' | 'reopen';
}

export interface NotionCommentData {
  body: string;
  user: string;
  createdAt: string;
  url: string;
}

export class NotionService {
  private client: Client;
  private databaseId: string;
  private validated = false;
  private requiredProperties = [
    { name: 'Name', type: 'title' },
    { name: 'Issue ID', type: 'number' },
    { name: 'Issue Number', type: 'number' },
    { name: 'URL', type: 'url' },
    { name: 'Repository', type: 'rich_text' },
    { name: 'Closed', type: 'checkbox' },
  ];

  constructor() {
    const apiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!apiKey) {
      throw new Error('NOTION_API_KEY environment variable is required');
    }

    if (!databaseId) {
      throw new Error('NOTION_DATABASE_ID environment variable is required');
    }

    this.client = new Client({ auth: apiKey });
    this.databaseId = databaseId;
  }

  private async ensureValidated(): Promise<void> {
    if (this.validated) {
      return;
    }

    console.log('\n🔍 Validating Notion database (first use)...');
    const result = await this.validateDatabaseSchema();
    
    if (!result.valid) {
      throw new Error(
        `Notion database validation failed. Missing properties: ${result.missingProperties.join(', ')}\n` +
        `Please add these properties to your database and try again.`
      );
    }
    
    console.log('✅ Notion database validated successfully!\n');
    this.validated = true;
  }

  async validateDatabaseSchema(): Promise<{ valid: boolean; missingProperties: string[] }> {
    try {
      const database = await this.client.databases.retrieve({
        database_id: this.databaseId,
      });

      const existingProperties = Object.keys((database as any).properties);
      const missingProperties: string[] = [];

      for (const required of this.requiredProperties) {
        if (!existingProperties.includes(required.name)) {
          missingProperties.push(required.name);
        }
      }

      if (missingProperties.length > 0) {
        console.error('\n❌ Notion Database Missing Properties:');
        console.error('─────────────────────────────────────');
        console.error('The following properties need to be added to your Notion database:\n');
        
        for (const required of this.requiredProperties) {
          if (missingProperties.includes(required.name)) {
            const typeDisplay = required.type === 'rich_text' ? 'Text' : required.type.charAt(0).toUpperCase() + required.type.slice(1);
            console.error(`  ⚠️  ${required.name} (${typeDisplay})`);
          }
        }
        
        console.error('\n📝 How to add properties:');
        console.error('  1. Open your database: https://notion.so/' + this.databaseId.replace(/-/g, ''));
        console.error('  2. Click "+ Add property"');
        console.error('  3. Add each missing property with the exact name and type shown above');
        console.error('  4. Restart the Motia server\n');
        console.error('⚠️  Property names are case-sensitive!\n');

        return { valid: false, missingProperties };
      }

      console.log('✅ Notion database schema validated successfully');
      return { valid: true, missingProperties: [] };

    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Could not find database')) {
          console.error('\n❌ Notion Database Not Found');
          console.error('─────────────────────────────────────');
          console.error('Database ID: ' + this.databaseId);
          console.error('\n📝 Troubleshooting:');
          console.error('  1. Verify NOTION_DATABASE_ID in .env is correct');
          console.error('  2. Make sure you shared the database with your integration');
          console.error('  3. Go to: Settings → Connections in your Notion workspace');
          console.error('  4. Add your integration to the database\n');
        }
      }
      throw error;
    }
  }

  async createPage(data: NotionPageData): Promise<string> {
    await this.ensureValidated();
    
    try {
      const response = await this.client.pages.create({
      parent: {
        database_id: this.databaseId,
      },
      properties: {
        Name: {
          title: [{ text: { content: data.title } }],
        },
        'Issue ID': {
          number: data.issueId,
        },
        'Issue Number': {
          number: data.issueNumber,
        },
        URL: {
          url: data.url,
        },
        ...(data.repository && {
          Repository: {
            rich_text: [{ text: { content: data.repository } }],
          },
        }),
        Closed: {
          checkbox: false,
        },
      },
      });

      return response.id;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Could not find property')) {
        const match = error.message.match(/Could not find property with name or id: (.+)/);
        const propertyName = match ? match[1] : 'unknown';
        
        throw new Error(
          `Missing Notion property: "${propertyName}"\n\n` +
          `Please add this property to your Notion database:\n` +
          `1. Open: https://notion.so/${this.databaseId.replace(/-/g, '')}\n` +
          `2. Click "+ Add property"\n` +
          `3. Add property "${propertyName}" with the correct type\n\n` +
          `Required properties:\n` +
          this.requiredProperties.map(p => `  - ${p.name} (${p.type})`).join('\n')
        );
      }
      throw error;
    }
  }

  async findPageByIssueId(issueId: number): Promise<string | null> {
    const response = await this.client.databases.query({
      database_id: this.databaseId,
      filter: {
        property: 'Issue ID',
        number: {
          equals: issueId,
        },
      },
    });

    if (response.results.length === 0) {
      return null;
    }

    return response.results[0].id;
  }

  async updatePageTitle(pageId: string, title: string): Promise<void> {
    await this.client.pages.update({
      page_id: pageId,
      properties: {
        Name: {
          title: [{ text: { content: title } }],
        },
      },
    });
  }

  async closeIssuePage(pageId: string): Promise<void> {
    await this.client.pages.update({
      page_id: pageId,
      properties: {
        Closed: {
          checkbox: true,
        },
      },
    });
  }

  async reopenIssuePage(pageId: string): Promise<void> {
    await this.client.pages.update({
      page_id: pageId,
      properties: {
        Closed: {
          checkbox: false,
        },
      },
    });
  }

  async archivePage(pageId: string): Promise<void> {
    await this.client.pages.update({
      page_id: pageId,
      archived: true,
    });
  }

  async addComment(pageId: string, comment: NotionCommentData): Promise<void> {
    const formattedDate = new Date(comment.createdAt).toLocaleString();
    
    await this.client.comments.create({
      parent: {
        page_id: pageId,
      },
      rich_text: [
        {
          type: 'text',
          text: {
            content: `💬 ${comment.user} (${formattedDate}):\n\n${comment.body}\n\n`,
          },
        },
        {
          type: 'text',
          text: {
            content: 'View on GitHub',
            link: {
              url: comment.url,
            },
          },
        },
      ],
    });
  }
}

export const notionService = new NotionService();
