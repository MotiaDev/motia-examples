/**
 * SpiceDB Service for Harvest Logbook
 * Handles all authorization checks using SpiceDB
 */

import { v1 } from '@authzed/authzed-node';

export interface SpiceDBConfig {
  endpoint: string;
  token: string;
}

export interface CheckPermissionParams {
  userId: string;
  resourceType: 'organization' | 'farm' | 'harvest_entry' | 'query_session';
  resourceId: string;
  permission: 'view' | 'edit' | 'query' | 'manage' | 'delete' | 'execute' | 'view_results';
}

export interface CreateRelationshipParams {
  subjectType: 'user' | 'organization' | 'farm';
  subjectId: string;
  relation: string;
  resourceType: 'organization' | 'farm' | 'harvest_entry' | 'query_session';
  resourceId: string;
}

export class SpiceDBService {
  private client: ReturnType<typeof v1.NewClient>['promises'];
  private static instance: SpiceDBService;

  private constructor(config: SpiceDBConfig) {
    // Use insecure connection for localhost, secure for remote endpoints
    const security = config.endpoint.startsWith('localhost:') || config.endpoint.startsWith('127.0.0.1:')
      ? v1.ClientSecurity.INSECURE_LOCALHOST_ALLOWED
      : v1.ClientSecurity.SECURE;

    const clientWithCallbacks = v1.NewClient(config.token, config.endpoint, security);
    this.client = clientWithCallbacks.promises;
  }

  /**
   * Get singleton instance of SpiceDBService
   */
  static getInstance(): SpiceDBService {
    if (!SpiceDBService.instance) {
      const config: SpiceDBConfig = {
        endpoint: process.env.SPICEDB_ENDPOINT || process.env.AUTHZED_ENDPOINT || 'grpc.authzed.com:443',
        token: process.env.SPICEDB_TOKEN || process.env.AUTHZED_TOKEN || '',
      };

      if (!config.token) {
        throw new Error('SPICEDB_TOKEN (or AUTHZED_TOKEN) environment variable is required');
      }

      SpiceDBService.instance = new SpiceDBService(config);
    }
    return SpiceDBService.instance;
  }

  /**
   * Check if a user has permission on a resource
   */
  async checkPermission(params: CheckPermissionParams): Promise<boolean> {
    try {
      const request = v1.CheckPermissionRequest.create({
        consistency: v1.Consistency.create({
          requirement: {
            oneofKind: 'fullyConsistent',
            fullyConsistent: true,
          },
        }),
        resource: v1.ObjectReference.create({
          objectType: params.resourceType,
          objectId: params.resourceId,
        }),
        permission: params.permission,
        subject: v1.SubjectReference.create({
          object: v1.ObjectReference.create({
            objectType: 'user',
            objectId: params.userId,
          }),
        }),
      });

      const response = await this.client.checkPermission(request);

      return (response as any).permissionship === v1.CheckPermissionResponse_Permissionship.HAS_PERMISSION;
    } catch (error) {
      console.error('AuthZed permission check failed:', error);
      throw new Error('Authorization check failed');
    }
  }

  /**
   * Create a relationship between subject and resource
   */
  async createRelationship(params: CreateRelationshipParams): Promise<void> {
    try {
      const request = v1.WriteRelationshipsRequest.create({
        updates: [
          v1.RelationshipUpdate.create({
            operation: v1.RelationshipUpdate_Operation.TOUCH,
            relationship: v1.Relationship.create({
              resource: v1.ObjectReference.create({
                objectType: params.resourceType,
                objectId: params.resourceId,
              }),
              relation: params.relation,
              subject: v1.SubjectReference.create({
                object: v1.ObjectReference.create({
                  objectType: params.subjectType,
                  objectId: params.subjectId,
                }),
              }),
            }),
          }),
        ],
      });

      await this.client.writeRelationships(request);
    } catch (error) {
      console.error('AuthZed relationship creation failed:', error);
      throw new Error('Failed to create authorization relationship');
    }
  }

  /**
   * Delete a relationship between subject and resource
   */
  async deleteRelationship(params: CreateRelationshipParams): Promise<void> {
    try {
      const request = v1.WriteRelationshipsRequest.create({
        updates: [
          v1.RelationshipUpdate.create({
            operation: v1.RelationshipUpdate_Operation.DELETE,
            relationship: v1.Relationship.create({
              resource: v1.ObjectReference.create({
                objectType: params.resourceType,
                objectId: params.resourceId,
              }),
              relation: params.relation,
              subject: v1.SubjectReference.create({
                object: v1.ObjectReference.create({
                  objectType: params.subjectType,
                  objectId: params.subjectId,
                }),
              }),
            }),
          }),
        ],
      });

      await this.client.writeRelationships(request);
    } catch (error) {
      console.error('AuthZed relationship deletion failed:', error);
      throw new Error('Failed to delete authorization relationship');
    }
  }

  /**
   * Lookup all resources of a type that a user has permission on
   */
  async lookupResources(
    userId: string,
    resourceType: 'organization' | 'farm' | 'harvest_entry',
    permission: string
  ): Promise<string[]> {
    try {
      const request = v1.LookupResourcesRequest.create({
        consistency: v1.Consistency.create({
          requirement: {
            oneofKind: 'fullyConsistent',
            fullyConsistent: true,
          },
        }),
        resourceObjectType: resourceType,
        permission: permission,
        subject: v1.SubjectReference.create({
          object: v1.ObjectReference.create({
            objectType: 'user',
            objectId: userId,
          }),
        }),
      });

      const resourceIds: string[] = [];

      for await (const response of this.client.lookupResources(request) as any) {
        if (response.resourceObjectId) {
          resourceIds.push(response.resourceObjectId);
        }
      }

      return resourceIds;
    } catch (error) {
      console.error('AuthZed resource lookup failed:', error);
      throw new Error('Failed to lookup authorized resources');
    }
  }

  /**
   * Write authorization schema to SpiceDB
   * This should be run during initial setup
   */
  async writeSchema(schema: string): Promise<void> {
    try {
      const request = v1.WriteSchemaRequest.create({ schema });
      await this.client.writeSchema(request);
    } catch (error) {
      console.error('AuthZed schema write failed:', error);
      throw new Error('Failed to write authorization schema');
    }
  }

  /**
   * Read current authorization schema from SpiceDB
   */
  async readSchema(): Promise<string> {
    try {
      const request = v1.ReadSchemaRequest.create({});
      const response = await this.client.readSchema(request);
      return (response as any).schemaText;
    } catch (error) {
      console.error('AuthZed schema read failed:', error);
      throw new Error('Failed to read authorization schema');
    }
  }
}

/**
 * Get singleton instance of SpiceDBService
 */
export function getSpiceDBService(): SpiceDBService {
  return SpiceDBService.getInstance();
}

// Legacy export for backwards compatibility
export const getAuthZedService = getSpiceDBService;
export type AuthZedService = SpiceDBService;
export type AuthZedConfig = SpiceDBConfig;
