import { Client, Databases, ID, Permission, Role } from "node-appwrite";
import * as dotenv from "dotenv";

dotenv.config();

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
  .setProject(process.env.APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);

async function setupDatabase() {
  try {
    const databaseId = "email-marketing-db";

    // Delete database if it exists
    console.log("Checking for existing database...");
    try {
      await databases.delete(databaseId);
      console.log("✓ Existing database deleted");
    } catch (error: any) {
      if (error.code === 404) {
        console.log("✓ No existing database to delete");
      } else {
        throw error;
      }
    }

    // Create fresh database
    console.log("\nCreating new database...");
    const database = await databases.create(databaseId, "Email Marketing DB");
    console.log("✓ Database created");

    // Create Users collection
    console.log("\nCreating users collection...");
    await databases.createCollection(databaseId, "users", "Users", [
      Permission.read(Role.any()),
      Permission.create(Role.any()),
      Permission.update(Role.any()),
      Permission.delete(Role.any()),
    ]);
    console.log("✓ Users collection created");

    // Add attributes to Users collection
    console.log("Adding user attributes...");
    await databases.createStringAttribute(
      databaseId,
      "users",
      "email",
      255,
      true
    );
    await databases.createStringAttribute(
      databaseId,
      "users",
      "firstName",
      100,
      true
    );
    await databases.createStringAttribute(
      databaseId,
      "users",
      "lastName",
      100,
      true
    );
    await databases.createStringAttribute(
      databaseId,
      "users",
      "status",
      50,
      true
    );
    await databases.createStringAttribute(
      databaseId,
      "users",
      "preferences",
      2048,
      true
    );
    await databases.createStringAttribute(
      databaseId,
      "users",
      "metadata",
      2048,
      true
    );
    console.log("✓ User attributes created");

    // Create Campaigns collection
    console.log("\nCreating campaigns collection...");
    await databases.createCollection(databaseId, "campaigns", "Campaigns", [
      Permission.read(Role.any()),
      Permission.create(Role.any()),
      Permission.update(Role.any()),
      Permission.delete(Role.any()),
    ]);
    console.log("✓ Campaigns collection created");

    // Add attributes to Campaigns collection
    console.log("Adding campaign attributes...");
    await databases.createStringAttribute(
      databaseId,
      "campaigns",
      "name",
      255,
      true
    );
    await databases.createStringAttribute(
      databaseId,
      "campaigns",
      "subject",
      255,
      true
    );
    await databases.createStringAttribute(
      databaseId,
      "campaigns",
      "template",
      255,
      true
    );
    await databases.createStringAttribute(
      databaseId,
      "campaigns",
      "targetAudience",
      100,
      true
    );
    await databases.createStringAttribute(
      databaseId,
      "campaigns",
      "status",
      200,
      true
    );
    await databases.createStringAttribute(
      databaseId,
      "campaigns",
      "metrics",
      1000,
      true
    );
    await databases.createBooleanAttribute(
      databaseId,
      "campaigns",
      "personalizeContent",
      true
    );
    await databases.createDatetimeAttribute(
      databaseId,
      "campaigns",
      "scheduledFor",
      false
    );
    console.log("✓ Campaign attributes created");

    console.log("\n✅ Setup completed successfully!");
    console.log(`\nAdd this to your .env file:`);
    console.log(`APPWRITE_DATABASE_ID=${database.$id}`);
  } catch (error: any) {
    console.error("❌ Setup failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

setupDatabase();