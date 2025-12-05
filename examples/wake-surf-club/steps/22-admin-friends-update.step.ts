import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { Friend } from "../types/models";
import { normalizePhone, isValidPhoneE164 } from "../types/utils";

export const config: ApiRouteConfig = {
  type: "api",
  name: "AdminFriendsUpdate",
  description: "Update a friend's information from admin panel",
  method: "PATCH",
  path: "/api/admin/friends/:friendId",
  bodySchema: z.object({
    name: z.string().min(1).optional(),
    phone: z.string().optional(),
    active: z.boolean().optional(),
  }),
  responseSchema: {
    200: z.object({
      message: z.string(),
      friend: z.object({
        id: z.string(),
        name: z.string(),
        phoneE164: z.string(),
        active: z.boolean(),
        createdAt: z.string(),
      }),
    }),
    400: z.object({ error: z.string() }),
    404: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  emits: [],
  flows: ["wake-surf-club"],
};

export const handler: Handlers["AdminFriendsUpdate"] = async (
  req,
  { logger, state, traceId }
) => {
  try {
    const friendId = req.pathParams.friendId;
    const { name, phone, active } = req.body;

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

    // Prepare updated friend object
    let updatedFriend: Friend = { ...friend };
    let oldPhoneE164 = friend.phoneE164;

    // Update name if provided
    if (name !== undefined) {
      updatedFriend.name = name.trim();
    }

    // Update active status if provided
    if (active !== undefined) {
      updatedFriend.active = active;
    }

    // Update phone if provided
    if (phone !== undefined && phone !== friend.phoneE164) {
      const normalizedPhone = normalizePhone(phone);

      if (!isValidPhoneE164(normalizedPhone)) {
        return {
          status: 400 as const,
          body: { error: "Invalid phone number format" },
        };
      }

      // Check if new phone already exists for another friend
      const existingFriend = (await state.get("friends", normalizedPhone)) as
        | Friend
        | undefined;
      if (existingFriend && existingFriend.id !== friendId) {
        return {
          status: 400 as const,
          body: { error: "Phone number already exists for another friend" },
        };
      }

      updatedFriend.phoneE164 = normalizedPhone;
    }

    // Update friend in state
    await state.set("friends", friendId, updatedFriend);
    await state.set("friends", updatedFriend.phoneE164, updatedFriend);

    // If phone changed, delete old phone lookup
    if (oldPhoneE164 !== updatedFriend.phoneE164) {
      await state.delete("friends", oldPhoneE164);
    }

    // Update friends list
    const existingFriendsList: Friend[] =
      ((await state.get("friends", "list")) as Friend[]) || [];
    const updatedFriendsList = existingFriendsList.map((f: Friend) =>
      f.id === friendId ? updatedFriend : f
    );
    await state.set("friends", "list", updatedFriendsList);

    logger.info("Friend updated by admin", {
      friendId,
      friendName: updatedFriend.name,
      changes: { name, phone, active },
      traceId,
    });

    return {
      status: 200 as const,
      body: {
        message: "Friend updated successfully",
        friend: updatedFriend,
      },
    };
  } catch (error: any) {
    logger.error("Failed to update friend", {
      error: error.message,
      friendId: req.pathParams.friendId,
      traceId,
    });

    return {
      status: 500 as const,
      body: { error: "Failed to update friend" },
    };
  }
};
