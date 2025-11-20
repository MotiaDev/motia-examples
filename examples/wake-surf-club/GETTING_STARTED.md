# Getting Started with Tuesday WakeSurf Club

## 🚀 Quick Start (5 minutes)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Setup Environment
```bash
pnpm setup
```
This generates a secure JWT secret and creates your `.env` file.

### 3. Configure Twilio (Optional for testing)
Edit `.env` file with your Twilio credentials:
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+1234567890
```

### 4. Start the Application
```bash
pnpm dev:full
```

### 5. Access the App
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Motia Workbench**: http://localhost:8000/workbench

## 🧪 Testing the App

### Generate Test Data
```bash
pnpm seed
```
This creates test booking links and admin tokens for testing.

### Test the Flow
1. Visit http://localhost:3000/admin
2. Use the admin token from `pnpm seed`
3. Import the test friends data
4. Use the generated booking links to test booking flow

## 📱 SMS Testing

For SMS testing with Twilio:
1. Get a sandbox number from Twilio console
2. Update `TWILIO_FROM_NUMBER` in `.env`
3. Use sandbox numbers for testing (format: +1XXXXXXXXXX)

## 🏄‍♂️ How It Works

### Weekly Schedule
- **Friday 12:00pm**: Creates next Tuesday's session
- **Monday 3:00pm**: Sends SMS invites to all friends
- **Tuesday 5:30am**: Sends morning reminders with roster

### Booking Flow
1. Friend receives SMS with booking link
2. Taps link → lands on booking page
3. Clicks "Book My Spot" → gets confirmation
4. Receives calendar invite and cancellation link

### Admin Features
- Import friends list
- View session details and bookings
- Send manual invites
- Monitor booking status

## 🔧 Development

### Project Structure
```
steps/          # Motia workflow steps (backend logic)
src/            # React frontend
types/          # TypeScript definitions
scripts/        # Setup and testing utilities
```

### Key Files
- `steps/` - All backend logic (APIs, events, cron jobs)
- `src/App.tsx` - Main React application
- `src/Admin.tsx` - Admin interface
- `types/models.ts` - Data models and schemas
- `types/utils.ts` - Utility functions

### Adding Features
1. Create new step files in `steps/`
2. Define event subscriptions and emissions
3. Update TypeScript types
4. Add frontend components
5. Test with Motia Workbench

## 🚀 Deployment

### Backend (Motia Cloud)
```bash
pnpm build
motia deploy
```

### Frontend (Vercel)
```bash
pnpm build:frontend
vercel --prod
```

### Environment Variables
Set these in your deployment:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `HOST_SIGNING_SECRET`
- `PUBLIC_APP_URL`

## 🎯 Features Implemented

✅ **Complete SMS Integration** - Twilio with retry logic  
✅ **Booking System** - One-click booking with capacity management  
✅ **Calendar Integration** - Automatic ICS invite generation  
✅ **Admin Panel** - Friend management and session oversight  
✅ **Automated Scheduling** - Cron jobs for invites and reminders  
✅ **Mobile-First UI** - Responsive React frontend  
✅ **Security** - JWT-signed links with expiration  
✅ **Error Handling** - Comprehensive error management  
✅ **Testing Tools** - Setup scripts and test data generation  

## 📞 Support

- Check the main README.md for detailed documentation
- Use Motia Workbench for step visualization and debugging
- Review logs in development console
- Test with Twilio sandbox for SMS functionality

---

**Ready to surf! 🏄‍♂️**
