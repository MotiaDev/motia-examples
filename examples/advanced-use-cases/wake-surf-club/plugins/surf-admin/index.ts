/**
 * Surf Club Admin Plugin
 *
 * Adds a workbench component for managing friends, sessions, and bookings
 * for the Wake Surf Club booking system.
 */

import path from "node:path";
import type { MotiaPlugin, MotiaPluginContext } from "motia";

export default function surfAdminPlugin(
  motia: MotiaPluginContext
): MotiaPlugin {
  // Register a health check endpoint for the plugin
  motia.registerApi(
    {
      method: "GET",
      path: "/__motia/surf-admin/health",
    },
    async (_req, _ctx) => {
      return {
        status: 200,
        body: {
          plugin: "surf-admin",
          status: "healthy",
          version: "1.0.0",
          features: [
            "friends-management",
            "sessions-management",
            "bookings-overview",
            "manual-triggers",
            "analytics",
          ],
          endpoints: {
            importFriends: "POST /admin/friends/import",
            listFriends: "GET /admin/friends",
            deleteFriend: "DELETE /admin/friends/:friendId",
            createSession: "POST /admin/session/create",
            getSessions: "GET /api/sessions",
            triggerInvites: "POST /admin/invite/send",
          },
        },
      };
    }
  );

  return {
    dirname: path.join(__dirname),
    workbench: [
      {
        componentName: "SurfAdminPanel",
        packageName: "~/plugins/surf-admin/components/surf-admin-panel",
        label: "Surf Club Admin",
        labelIcon: "waves",
        position: "top",
      },
    ],
  };
}
