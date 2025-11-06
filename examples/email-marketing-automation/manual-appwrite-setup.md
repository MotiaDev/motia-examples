# Manual Appwrite Database Setup

If you prefer to set up your Appwrite database manually through the console instead of using the automated script, follow these detailed steps:

## Prerequisites

- Access to your Appwrite Console
- Project already created in Appwrite

## Step 1: Create a Database

1. Go to your Appwrite Console
2. Navigate to **Databases** → **Create Database**
3. Name it `email-marketing-db`
4. Copy the Database ID to your `.env` file:
   ```bash
   APPWRITE_DATABASE_ID=your-database-id-here
   ```

## Step 2: Create the Users Table

1. Click **"Add a Table"** → Name it `users`
2. Add these columns with the specified attributes:

```
1. email (String, 255, required)
2. firstName (String, 100, required)
3. lastName (String, 100, required)
4. status (String, 50, required)
5. preferences (String, 2048, required)
6. metadata (String, 2048, required)
```

### Column Details:

- **email**: User's email address
- **firstName**: User's first name
- **lastName**: User's last name
- **status**: Subscription status (active, inactive, unsubscribed)
- **preferences**: JSON string for user preferences and settings
- **metadata**: Additional user data and tracking information

## Step 3: Create the Campaigns Table

1. Click **"Create a Table"** → Name it `campaigns`
2. Add these columns with the specified attributes:

```
1. name (String, 255, required)
2. subject (String, 255, required)
3. template (String, 255, required)
4. targetAudience (String, 100, required)
5. status (String, 200, required)
6. metrics (String, 1000, required)
7. personalizeContent (Boolean, required)
8. scheduledFor (Datetime, optional)
```

### Column Details:

- **name**: Campaign name for internal reference
- **subject**: Email subject line
- **template**: Template identifier or content
- **targetAudience**: Audience segment targeting
- **status**: Campaign status (draft, scheduled, sent, completed)
- **metrics**: JSON string for campaign performance data
- **personalizeContent**: Whether to enable AI personalization
- **scheduledFor**: When to send the campaign (optional for immediate sends)

## Step 4: Set Permissions

For both tables, configure these permissions to allow your application to interact with the data:

### Required Permissions:

1. **Read**: Any
2. **Create**: Any
3. **Update**: Any
4. **Delete**: Any

> **Note**: In a production environment, you should implement more restrictive permissions based on user roles and authentication requirements.

## Step 5: Verify Setup

After creating both tables:

1. Confirm both `users` and `campaigns` tables appear in your database
2. Verify all columns are present with correct data types
3. Check that permissions are properly configured
4. Test database connectivity with your application

## Next Steps

Once your database is set up manually, return to the main tutorial to continue with:

- Configuring Motia workflows
- Setting up email automation
- Testing the complete system

Your manual database setup is now complete and ready for integration with Motia's event-driven architecture.
