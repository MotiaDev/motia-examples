import { Client, TablesDB, ID, Permission, Role } from "node-appwrite";
import * as dotenv from "dotenv";

dotenv.config();

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
  .setProject(process.env.APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const tablesDB = new TablesDB(client);

async function setupDatabase() {
  try {
    const databaseId = "email-marketing-db";

    // Delete database if it exists
    console.log("Checking for existing database...");
    try {
      await tablesDB.delete({ databaseId });
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
    const database = await tablesDB.create({
      databaseId,
      name: "Email Marketing DB",
    });
    console.log("✓ Database created");

    // Create Users table (not collection!)
    console.log("\nCreating users table...");
    await tablesDB.createTable({
      databaseId,
      tableId: "users",
      name: "Users",
      permissions: [
        Permission.read(Role.any()),
        Permission.create(Role.any()),
        Permission.update(Role.any()),
        Permission.delete(Role.any()),
      ],
    });
    console.log("✓ Users table created");

    // Add columns (not attributes!) to Users table
    console.log("Adding user columns...");
    await tablesDB.createStringColumn({
      databaseId,
      tableId: "users",
      key: "email",
      size: 255,
      required: true,
    });
    await tablesDB.createStringColumn({
      databaseId,
      tableId: "users",
      key: "firstName",
      size: 100,
      required: true,
    });
    await tablesDB.createStringColumn({
      databaseId,
      tableId: "users",
      key: "lastName",
      size: 100,
      required: true,
    });
    await tablesDB.createStringColumn({
      databaseId,
      tableId: "users",
      key: "status",
      size: 50,
      required: true,
    });
    await tablesDB.createStringColumn({
      databaseId,
      tableId: "users",
      key: "preferences",
      size: 2048,
      required: true,
    });
    await tablesDB.createStringColumn({
      databaseId,
      tableId: "users",
      key: "metadata",
      size: 2048,
      required: true,
    });
    console.log("✓ User columns created");

    // Create Campaigns table
    console.log("\nCreating campaigns table...");
    await tablesDB.createTable({
      databaseId,
      tableId: "campaigns",
      name: "Campaigns",
      permissions: [
        Permission.read(Role.any()),
        Permission.create(Role.any()),
        Permission.update(Role.any()),
        Permission.delete(Role.any()),
      ],
    });
    console.log("✓ Campaigns table created");

    // Add columns to Campaigns table
    console.log("Adding campaign columns...");
    await tablesDB.createStringColumn({
      databaseId,
      tableId: "campaigns",
      key: "name",
      size: 255,
      required: true,
    });
    await tablesDB.createStringColumn({
      databaseId,
      tableId: "campaigns",
      key: "subject",
      size: 255,
      required: true,
    });
    await tablesDB.createStringColumn({
      databaseId,
      tableId: "campaigns",
      key: "template",
      size: 255,
      required: true,
    });
    await tablesDB.createStringColumn({
      databaseId,
      tableId: "campaigns",
      key: "targetAudience",
      size: 100,
      required: true,
    });
    await tablesDB.createStringColumn({
      databaseId,
      tableId: "campaigns",
      key: "status",
      size: 200,
      required: true,
    });
    await tablesDB.createStringColumn({
      databaseId,
      tableId: "campaigns",
      key: "metrics",
      size: 1000,
      required: true,
    });
    await tablesDB.createBooleanColumn({
      databaseId,
      tableId: "campaigns",
      key: "personalizeContent",
      required: true,
    });
    await tablesDB.createDatetimeColumn({
      databaseId,
      tableId: "campaigns",
      key: "scheduledFor",
      required: false,
    });
    console.log("✓ Campaign columns created");

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
