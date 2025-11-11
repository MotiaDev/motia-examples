import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";

export const config: ApiRouteConfig = {
  type: "api",
  name: "AdminSettingsUpdate",
  description: "Update default session configuration settings",
  method: "PATCH",
  path: "/admin/settings",
  bodySchema: z.object({
    capacity: z.number().min(1).max(20).optional(),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(), // HH:MM format
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(), // HH:MM format
    location: z.string().optional().nullable(),
  }),
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      message: z.string(),
      settings: z.object({
        capacity: z.number(),
        startTime: z.string(),
        endTime: z.string(),
        location: z.string().nullable(),
      }),
    }),
    400: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  emits: [],
  flows: ["wake-surf-club"],
};

export const handler: Handlers["AdminSettingsUpdate"] = async (
  req,
  { logger, state, traceId }
) => {
  try {
    const updates = req.body;

    logger.info("Admin updating settings", {
      updates,
      traceId,
    });

    // Get current settings or use hardcoded defaults as fallbacks
    const currentSettings: {
      capacity: number;
      startTime: string;
      endTime: string;
      location: string | null;
    } = ((await state.get("settings", "defaults")) as {
      capacity: number;
      startTime: string;
      endTime: string;
      location: string | null;
    }) || {
      capacity: 3,
      startTime: "07:00",
      endTime: "09:00",
      location: null,
    };

    // Merge updates with current settings (patch operation)
    const updatedSettings: {
      capacity: number;
      startTime: string;
      endTime: string;
      location: string | null;
    } = {
      capacity: updates.capacity ?? currentSettings.capacity,
      startTime: updates.startTime ?? currentSettings.startTime,
      endTime: updates.endTime ?? currentSettings.endTime,
      location:
        (updates.location as string | null | undefined) ??
        currentSettings.location,
    };

    // Validate time logic (end time should be after start time)
    if (updatedSettings.startTime && updatedSettings.endTime) {
      const [startHour, startMin] = updatedSettings.startTime
        .split(":")
        .map(Number);
      const [endHour, endMin] = updatedSettings.endTime.split(":").map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (endMinutes <= startMinutes) {
        return {
          status: 400 as const,
          body: { error: "End time must be after start time" },
        };
      }
    }

    // Persist the updated settings
    await state.set("settings", "defaults", updatedSettings);

    logger.info("Settings updated successfully", {
      oldSettings: currentSettings,
      newSettings: updatedSettings,
      traceId,
    });

    return {
      status: 200 as const,
      body: {
        success: true,
        message: "Settings updated successfully",
        settings: updatedSettings,
      },
    };
  } catch (error: any) {
    logger.error("Failed to update settings", {
      error: error.message,
      traceId,
    });

    return {
      status: 500 as const,
      body: { error: "Failed to update settings" },
    };
  }
};
