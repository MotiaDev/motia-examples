import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { Friend } from "../../../src/types/models";

export const config: ApiRouteConfig = {
  type: "api",
  name: "DeleteFriend",
  description: "Delete a friend from admin panel",
  method: "DELETE",
  path: "/admin/friends/:friendId",
  responseSchema: {
    200: z.object({ message: z.string() }),
    400: { error: "string" },
    404: { error: "string" },
    500: { error: "string" },
  },
  emits: [],
  flows: ["wake-surf-club"],
};

export const handler: Handlers["DeleteFriend"] = async (
  req,
  { logger, state, traceId }
) => {
  try {
    const friendId = (req as any).params?.friendId as string | undefined;

    if (!friendId) {
      return {
        status: 400,
        body: { error: "Friend ID is required" },
      };
    }

    logger.info("Deleting friend", { friendId, traceId });

    // Get friend to find phoneE164
    const friend = (await state.get("friends", friendId)) as Friend;

    if (!friend) {
      return {
        status: 404,
        body: { error: "Friend not found" },
      };
    }

    // Delete from all indexes
    await state.delete("friends", friendId);
    await state.delete("friends", friend.phoneE164);

    // Remove from friends list
    const friendsList =
      ((await state.get("friends", "list")) as Friend[] | null) || [];
    const updatedFriendsList = friendsList.filter((f) => f.id !== friendId);
    await state.set("friends", "list", updatedFriendsList);

    logger.info("Friend deleted successfully", {
      friendId,
      friendName: friend.name,
      phoneE164: friend.phoneE164,
      traceId,
    });

    return {
      status: 200,
      body: { message: "Friend deleted successfully" },
    };
  } catch (error: any) {
    logger.error("Failed to delete friend", {
      error: error.message,
      stack: error.stack,
      friendId: (req as any).params?.friendId,
      traceId,
    });

    return {
      status: 500,
      body: { error: "Failed to delete friend" },
    };
  }
};
