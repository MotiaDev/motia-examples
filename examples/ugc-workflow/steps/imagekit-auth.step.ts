import { ApiRouteConfig, Handlers } from "motia";
import crypto from "crypto";
import { v4 as uuid } from "uuid";

export const config: ApiRouteConfig = {
  type: "api",
  name: "ImageKitAuthAPI",
  description: "Generate ImageKit upload authentication token",
  path: "/imagekit-auth",
  method: "GET",
  flows: ["ugc-generation"],
  emits: [],
};

export const handler: Handlers["ImageKitAuthAPI"] = async (req, { logger }) => {
  const token = uuid();
  const expire = Math.floor(Date.now() / 1000) + 3500;

  const signature = crypto
    .createHmac("sha1", process.env.IMAGEKIT_PRIVATE_KEY!)
    .update(token + expire.toString())
    .digest("hex");

  logger.info(`Generating ImageKit upload authentication token`, {
    token,
    expire,
    signature,
  });

  return {
    status: 200,
    body: { token, expire, signature },
  };
};
