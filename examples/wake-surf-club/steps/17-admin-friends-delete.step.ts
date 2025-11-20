import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { Friend } from "../types/models";

export const config: ApiRouteConfig = {
  type: "api",
  name: "AdminFriendsDelete",
  description: "Delete a friend from admin panel",
  method: "DELETE",
  path: "/api/admin/friends/:friendId",
  responseSchema: {
    200: z.object({
      message: z.string(),
    }),
    400: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  emits: [],
  flows: ["wake-surf-club"],
};

export const handler: Handlers["AdminFriendsDelete"] = async (
  req,
  { logger, state, traceId }
) => {
  try {
    const friendId = req.pathParams.friendId;

    if (!friendId) {
      return {
        status: 400 as const,
        body: { error: "Friend ID is required" },
      };
    }

    // Check if friend exists
    const friend = (await state.get("friends", friendId)) as Friend | undefined;
    if (!friend) {
      return {
        status: 404 as const,
        body: { error: "Friend not found" },
      };
    }

    // Delete the friend
    await state.delete("friends", friendId);

    // Also delete from phone lookup if exists
    if (friend.phoneE164) {
      await state.delete("friends", friend.phoneE164);
    }

    // Update friends list for efficient retrieval
    const existingFriendsList: Friend[] =
      ((await state.get("friends", "list")) as Friend[]) || [];
    const updatedFriendsList = existingFriendsList.filter(
      (f: Friend) => f.id !== friendId
    );
    await state.set("friends", "list", updatedFriendsList);

    logger.info("Friend deleted by admin", {
      friendId,
      friendName: friend.name,
      traceId,
    });

    return {
      status: 200 as const,
      body: { message: "Friend deleted successfully" },
    };
  } catch (error: any) {
    logger.error("Failed to delete friend", {
      error: error.message,
      friendId: req.pathParams.friendId,
      traceId,
    });

    return {
      status: 500 as const,
      body: { error: "Failed to delete friend" },
    };
  }
};
