import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import appwriteService from "../services/appwrite.service";

export const config: ApiRouteConfig = {
  type: "api",
  name: "GetUsers",
  description: "Fetches all users from the database",
  flows: ["email-automation"],

  method: "GET",
  path: "/users",
  emits: [],
  responseSchema: {
    200: z.array(
      z.object({
        $id: z.string(),
        email: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        status: z.string(),
        preferences: z.string(),
        metadata: z.string(),
        $createdAt: z.string().optional(),
      })
    ),
    500: z.object({
      success: z.boolean(),
      error: z.string(),
    }),
  },
};

export const handler: Handlers["GetUsers"] = async (
  req,
  { logger, traceId }
) => {
  logger.info("Fetching all users");

  try {
    const users = await appwriteService.getUsers();
    
    logger.info("Users fetched successfully", { count: users.length });
    
    // Transform users to match the response schema
    const transformedUsers = users.map((user: any) => ({
      $id: user.$id || user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      preferences: typeof user.preferences === 'string' 
        ? user.preferences 
        : JSON.stringify(user.preferences),
      metadata: typeof user.metadata === 'string'
        ? user.metadata
        : JSON.stringify(user.metadata),
      $createdAt: user.$createdAt,
    }));
    
    return {
      status: 200,
      body: transformedUsers,
    };
  } catch (error) {
    logger.error("Failed to fetch users", { error });
    
    return {
      status: 500,
      body: {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch users",
      },
    };
  }
};

