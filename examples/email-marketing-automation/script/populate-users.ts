import { Client, TablesDB, ID, Permission, Role } from "node-appwrite";
import * as dotenv from "dotenv";

dotenv.config();

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
  .setProject(process.env.APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const tablesDB = new TablesDB(client);

interface User {
  email: string;
  firstName: string;
  lastName: string;
  status: "active" | "inactive";
  preferences: {
    emailMarketing: boolean;
    frequency: "daily" | "weekly" | "monthly";
    categories: string[];
  };
  metadata: {
    signupDate: string;
    lastActiveDate: string;
    totalPurchases: number;
    vipStatus: boolean;
  };
}

const sampleUsers: User[] = [
  // VIP Users (for vip_customers segment)
  {
    email: "sarah.anderson@example.com",
    firstName: "Sarah",
    lastName: "Anderson",
    status: "active",
    preferences: {
      emailMarketing: true,
      frequency: "weekly",
      categories: ["premium", "exclusive"],
    },
    metadata: {
      signupDate: "2023-01-15",
      lastActiveDate: "2025-11-09",
      totalPurchases: 45,
      vipStatus: true,
    },
  },
  {
    email: "michael.chen@example.com",
    firstName: "Michael",
    lastName: "Chen",
    status: "active",
    preferences: {
      emailMarketing: true,
      frequency: "daily",
      categories: ["tech", "premium"],
    },
    metadata: {
      signupDate: "2022-08-20",
      lastActiveDate: "2025-11-10",
      totalPurchases: 67,
      vipStatus: true,
    },
  },
  {
    email: "emily.rodriguez@example.com",
    firstName: "Emily",
    lastName: "Rodriguez",
    status: "active",
    preferences: {
      emailMarketing: true,
      frequency: "weekly",
      categories: ["fashion", "premium"],
    },
    metadata: {
      signupDate: "2023-03-10",
      lastActiveDate: "2025-11-08",
      totalPurchases: 52,
      vipStatus: true,
    },
  },

  // Active Users (for active_users segment)
  {
    email: "james.wilson@example.com",
    firstName: "James",
    lastName: "Wilson",
    status: "active",
    preferences: {
      emailMarketing: true,
      frequency: "weekly",
      categories: ["tech", "gadgets"],
    },
    metadata: {
      signupDate: "2024-05-12",
      lastActiveDate: "2025-11-09",
      totalPurchases: 12,
      vipStatus: false,
    },
  },
  {
    email: "olivia.martinez@example.com",
    firstName: "Olivia",
    lastName: "Martinez",
    status: "active",
    preferences: {
      emailMarketing: true,
      frequency: "weekly",
      categories: ["home", "lifestyle"],
    },
    metadata: {
      signupDate: "2024-07-22",
      lastActiveDate: "2025-11-10",
      totalPurchases: 8,
      vipStatus: false,
    },
  },
  {
    email: "david.lee@example.com",
    firstName: "David",
    lastName: "Lee",
    status: "active",
    preferences: {
      emailMarketing: true,
      frequency: "monthly",
      categories: ["books", "education"],
    },
    metadata: {
      signupDate: "2024-09-05",
      lastActiveDate: "2025-11-07",
      totalPurchases: 5,
      vipStatus: false,
    },
  },

  // New Signups (for new_signups segment)
  {
    email: "sophia.taylor@example.com",
    firstName: "Sophia",
    lastName: "Taylor",
    status: "active",
    preferences: {
      emailMarketing: true,
      frequency: "weekly",
      categories: ["fashion", "beauty"],
    },
    metadata: {
      signupDate: "2025-11-01",
      lastActiveDate: "2025-11-10",
      totalPurchases: 1,
      vipStatus: false,
    },
  },
  {
    email: "daniel.brown@example.com",
    firstName: "Daniel",
    lastName: "Brown",
    status: "active",
    preferences: {
      emailMarketing: true,
      frequency: "weekly",
      categories: ["sports", "outdoor"],
    },
    metadata: {
      signupDate: "2025-11-03",
      lastActiveDate: "2025-11-09",
      totalPurchases: 0,
      vipStatus: false,
    },
  },
  {
    email: "ava.johnson@example.com",
    firstName: "Ava",
    lastName: "Johnson",
    status: "active",
    preferences: {
      emailMarketing: true,
      frequency: "daily",
      categories: ["tech", "gaming"],
    },
    metadata: {
      signupDate: "2025-11-05",
      lastActiveDate: "2025-11-10",
      totalPurchases: 2,
      vipStatus: false,
    },
  },

  // Inactive Users
  {
    email: "william.davis@example.com",
    firstName: "William",
    lastName: "Davis",
    status: "active",
    preferences: {
      emailMarketing: true,
      frequency: "monthly",
      categories: ["home"],
    },
    metadata: {
      signupDate: "2024-02-14",
      lastActiveDate: "2025-08-15",
      totalPurchases: 3,
      vipStatus: false,
    },
  },
  {
    email: "isabella.garcia@example.com",
    firstName: "Isabella",
    lastName: "Garcia",
    status: "active",
    preferences: {
      emailMarketing: true,
      frequency: "weekly",
      categories: ["fashion"],
    },
    metadata: {
      signupDate: "2024-01-20",
      lastActiveDate: "2025-07-20",
      totalPurchases: 6,
      vipStatus: false,
    },
  },

  // Users who opted out
  {
    email: "ethan.miller@example.com",
    firstName: "Ethan",
    lastName: "Miller",
    status: "inactive",
    preferences: {
      emailMarketing: false,
      frequency: "monthly",
      categories: [],
    },
    metadata: {
      signupDate: "2023-11-10",
      lastActiveDate: "2025-06-10",
      totalPurchases: 4,
      vipStatus: false,
    },
  },

  // More diverse users for realistic data
  {
    email: "mia.anderson@example.com",
    firstName: "Mia",
    lastName: "Anderson",
    status: "active",
    preferences: {
      emailMarketing: true,
      frequency: "weekly",
      categories: ["beauty", "wellness"],
    },
    metadata: {
      signupDate: "2024-10-12",
      lastActiveDate: "2025-11-09",
      totalPurchases: 9,
      vipStatus: false,
    },
  },
  {
    email: "alexander.white@example.com",
    firstName: "Alexander",
    lastName: "White",
    status: "active",
    preferences: {
      emailMarketing: true,
      frequency: "daily",
      categories: ["tech", "business"],
    },
    metadata: {
      signupDate: "2024-06-18",
      lastActiveDate: "2025-11-10",
      totalPurchases: 15,
      vipStatus: false,
    },
  },
  {
    email: "charlotte.harris@example.com",
    firstName: "Charlotte",
    lastName: "Harris",
    status: "active",
    preferences: {
      emailMarketing: true,
      frequency: "weekly",
      categories: ["home", "decor"],
    },
    metadata: {
      signupDate: "2025-10-25",
      lastActiveDate: "2025-11-08",
      totalPurchases: 0,
      vipStatus: false,
    },
  },
];

async function populateUsers() {
  try {
    const databaseId = "email-marketing-db";
    const tableId = "users";

    console.log("🚀 Starting user population...\n");

    // Check if table exists
    try {
      await tablesDB.get({ databaseId, tableId });
      console.log("✓ Users table found");
    } catch (error: any) {
      console.error("❌ Users table not found. Please run setup-appwrite.ts first.");
      process.exit(1);
    }

    // Add each user
    let successCount = 0;
    let skipCount = 0;

    for (const user of sampleUsers) {
      try {
        await tablesDB.createRow({
          databaseId,
          tableId,
          rowId: ID.unique(),
          data: {
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            status: user.status,
            preferences: JSON.stringify(user.preferences),
            metadata: JSON.stringify(user.metadata),
          },
          permissions: [
            Permission.read(Role.any()),
            Permission.update(Role.any()),
            Permission.delete(Role.any()),
          ],
        });
        console.log(`✓ Added: ${user.firstName} ${user.lastName} (${user.email})`);
        successCount++;
      } catch (error: any) {
        if (error.code === 409) {
          console.log(`⊘ Skipped: ${user.email} (already exists)`);
          skipCount++;
        } else {
          console.error(`✗ Failed to add ${user.email}:`, error.message);
        }
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ User population completed!");
    console.log("=".repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   • Total users: ${sampleUsers.length}`);
    console.log(`   • Successfully added: ${successCount}`);
    console.log(`   • Skipped (already exist): ${skipCount}`);
    console.log("\n📈 User Breakdown:");
    console.log(`   • VIP Customers: 3 users (Sarah, Michael, Emily)`);
    console.log(`   • Active Users: 3 users (James, Olivia, David)`);
    console.log(`   • New Signups: 3 users (Sophia, Daniel, Ava)`);
    console.log(`   • Inactive Users: 2 users (William, Isabella)`);
    console.log(`   • Opted Out: 1 user (Ethan)`);
    console.log(`   • Other Active: 3 users (Mia, Alexander, Charlotte)`);
    console.log("\n🎯 You can now create campaigns targeting different segments!");
    console.log("   Navigate to http://localhost:3001/campaigns/new to get started.\n");
  } catch (error: any) {
    console.error("\n❌ Population failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

populateUsers();

