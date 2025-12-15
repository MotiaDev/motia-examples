import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { Friend } from "../../../src/types/models";

export const config: ApiRouteConfig = {
  type: "api",
  name: "ListFriends",
  description: "Get list of all friends for admin panel",
  method: "GET",
  path: "/admin/friends",
  responseSchema: {
    200: z.object({
      friends: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          phone: z.string(),
          phoneE164: z.string(),
          active: z.boolean(),
          createdAt: z.string(),
        })
      ),
    }),
    500: { error: "string" },
  },
  emits: [],
  flows: ["wake-surf-club"],
};

export const handler: Handlers["ListFriends"] = async (
  req,
  { logger, state, traceId }
) => {
  try {
    logger.info("Starting friends list retrieval", { traceId });

    // Get friends list from state
    const friendsData = (await state.get<Friend[]>("friends", "list")) || [];

    logger.info("Raw friends data from state", {
      friendsDataLength: Array.isArray(friendsData) ? friendsData.length : 0,
      traceId,
    });

    // Transform for admin display
    const friendsList = friendsData
      .filter((friend: any) => friend && friend.id) // Filter out invalid entries
      .map((friend: Friend) => ({
        id: friend.id,
        name: friend.name,
        phone: friend.phoneE164, // Use phoneE164 as phone
        phoneE164: friend.phoneE164,
        active: friend.active !== false, // Default to true if not set
        createdAt: friend.createdAt || new Date().toISOString(),
      }));

    logger.info("Retrieved friends list for admin", {
      count: friendsList.length,
      traceId,
    });

    return {
      status: 200,
      body: { friends: friendsList },
    };
  } catch (error: any) {
    logger.error("Failed to retrieve friends list", {
      error: error.message,
      stack: error.stack,
      traceId,
    });

    return {
      status: 500,
      body: { error: "Failed to retrieve friends list" },
    };
  }
};
