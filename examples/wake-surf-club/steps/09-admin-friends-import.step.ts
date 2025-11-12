import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { ImportFriendsRequestSchema } from "../types/models";
import {
  verifyHostToken,
  normalizePhone,
  isValidPhoneE164,
} from "../types/utils";
import { Friend } from "../types/models";

export const config: ApiRouteConfig = {
  type: "api",
  name: "AdminImportFriends",
  description: "Import friends list for the surf club",
  method: "POST",
  path: "/admin/friends/import",
  bodySchema: ImportFriendsRequestSchema,
  responseSchema: {
    200: z.object({
      imported: z.number(),
      errors: z.array(
        z.object({
          name: z.string(),
          phone: z.string(),
          error: z.string(),
        })
      ),
    }),
    401: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  emits: [],
  flows: ["wake-surf-club"],
};

export const handler: Handlers["AdminImportFriends"] = async (
  req,
  { emit, logger, state, traceId }
) => {
  try {
    // Authentication removed for development
    const { friends } = req.body;

    logger.info("Importing friends", { count: friends.length, traceId });

    const imported: Friend[] = [];
    const errors: Array<{ name: string; phone: string; error: string }> = [];

    for (const friendData of friends) {
      try {
        const { name, phone } = friendData;

        if (!name || !phone) {
          errors.push({
            name: name || "",
            phone: phone || "",
            error: "Name and phone are required",
          });
          continue;
        }

        // Normalize phone number
        const normalizedPhone = normalizePhone(phone);

        if (!isValidPhoneE164(normalizedPhone)) {
          errors.push({
            name,
            phone,
            error: "Invalid phone number format",
          });
          continue;
        }

        // Check if friend already exists
        const existingFriend = (await state.get(
          "friends",
          normalizedPhone
        )) as Friend;
        if (existingFriend) {
          // Update existing friend
          const updatedFriend: Friend = {
            ...existingFriend,
            name: name.trim(),
          };

          await state.set("friends", normalizedPhone, updatedFriend);
          await state.set("friends", existingFriend.id, updatedFriend);

          imported.push(updatedFriend);
        } else {
          // Create new friend
          const friendId = crypto.randomUUID();
          const newFriend: Friend = {
            id: friendId,
            name: name.trim(),
            phoneE164: normalizedPhone,
            active: true,
            createdAt: new Date().toISOString(),
          };

          await state.set("friends", normalizedPhone, newFriend);
          await state.set("friends", friendId, newFriend);

          imported.push(newFriend);
        }
      } catch (error: any) {
        errors.push({
          name: friendData.name || "",
          phone: friendData.phone || "",
          error: error.message,
        });
      }
    }

    const existingFriendsList = (await state.get("friends", "list")) || [];
    console.log("existingFriendsList", existingFriendsList);
    const updatedFriendsList = [
      ...(existingFriendsList as Friend[])?.filter(
        (f) => !imported.find((imp) => imp.id === f.id)
      ),
      ...imported,
    ];
    console.log("updatedFriendsList", updatedFriendsList);
    await state.set("friends", "list", updatedFriendsList);

    logger.info("Friends import completed", {
      imported: imported.length,
      errors: errors.length,
      traceId,
    });

    return {
      status: 200,
      body: {
        imported: imported.length,
        errors,
      },
    };
  } catch (error: any) {
    logger.error("Friends import failed", { error: error.message, traceId });

    return {
      status: 500,
      body: { error: "Import failed" },
    };
  }
};
