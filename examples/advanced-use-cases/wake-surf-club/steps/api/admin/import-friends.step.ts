import { ApiRouteConfig, Handlers } from "motia";
import {
  Friend,
  ImportFriendsRequestSchema,
  ImportFriendsResponseSchema,
} from "../../../src/types/models";
import { normalizePhone, isValidPhoneE164 } from "../../../src/types/utils";

export const config: ApiRouteConfig = {
  type: "api",
  name: "ImportFriends",
  description: "Import friends list for the surf club",
  method: "POST",
  path: "/admin/friends/import",
  bodySchema: ImportFriendsRequestSchema,
  responseSchema: {
    200: ImportFriendsResponseSchema,
    401: { error: "string" },
    500: { error: "string" },
  },
  emits: [],
  flows: ["wake-surf-club"],
};

export const handler: Handlers["ImportFriends"] = async (
  req,
  { emit, logger, state, traceId }
) => {
  try {
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

          // Update in friends list
          const friendsList =
            (await state.get<Friend[]>("friends", "list")) || [];
          const updatedFriendsList = friendsList.map((f) =>
            f.id === existingFriend.id ? updatedFriend : f
          );
          await state.set("friends", "list", updatedFriendsList);

          imported.push(updatedFriend);

          logger.info("Friend updated", {
            friendId: existingFriend.id,
            name: name.trim(),
            phoneE164: normalizedPhone,
            traceId,
          });
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

          // Update friends list
          const existingFriendsList =
            (await state.get<Friend[]>("friends", "list")) || [];
          await state.set("friends", "list", [
            ...existingFriendsList,
            newFriend,
          ]);

          imported.push(newFriend);

          logger.info("Friend created", {
            friendId,
            name: name.trim(),
            phoneE164: normalizedPhone,
            traceId,
          });
        }
      } catch (error: any) {
        errors.push({
          name: friendData.name || "",
          phone: friendData.phone || "",
          error: error.message,
        });

        logger.error("Friend import error", {
          name: friendData.name,
          phone: friendData.phone,
          error: error.message,
          traceId,
        });
      }
    }

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
    logger.error("Friends import failed", {
      error: error.message,
      stack: error.stack,
      traceId,
    });

    return {
      status: 500,
      body: { error: "Import failed" },
    };
  }
};
