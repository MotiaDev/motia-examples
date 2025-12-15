import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";

export const config: ApiRouteConfig = {
  type: "api",
  name: "DownloadCalendar",
  description: "Download ICS calendar file for a booking",
  method: "GET",
  path: "/api/calendar/download/:sessionId/:friendId",
  responseSchema: {
    200: z.object({ content: z.string() }),
    404: { error: "string" },
    500: { error: "string" },
  },
  emits: [],
  flows: ["wake-surf-club"],
};

export const handler: Handlers["DownloadCalendar"] = async (
  req,
  { logger, state, traceId }
) => {
  try {
    const { sessionId, friendId } = req.pathParams;

    logger.info("Calendar download request", { sessionId, friendId, traceId });

    // Get the stored ICS content
    const icsKey = `ics_${sessionId}_${friendId}`;
    const icsData = (await state.get(traceId, icsKey)) as
      | { content: string }
      | undefined;

    if (!icsData || !icsData.content) {
      return {
        status: 404,
        body: { error: "Calendar invite not found" },
      };
    }

    logger.info("Calendar download successful", {
      sessionId,
      friendId,
      traceId,
    });

    return {
      status: 200,
      headers: {
        "Content-Type": "text/calendar",
        "Content-Disposition": `attachment; filename="surf-session-${sessionId}.ics"`,
      },
      body: { content: icsData.content },
    };
  } catch (error: any) {
    logger.error("Calendar download failed", {
      error: error.message,
      stack: error.stack,
      traceId,
    });

    return {
      status: 500,
      body: { error: "Failed to download calendar" },
    };
  }
};
