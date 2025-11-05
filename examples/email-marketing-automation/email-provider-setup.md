# Email Provider Setup Guide

This guide walks you through configuring email messaging providers and topics in Appwrite for the email marketing automation system.

## Prerequisites

- Access to your Appwrite Console
- Email service provider account (Mailgun, SendGrid, SMTP server, or Resend)
- Project already created in Appwrite

## Understanding Appwrite Messaging

Appwrite's messaging service provides a unified API for sending emails, SMS, and push notifications. For email marketing automation, you'll need:

1. **Email Provider**: Service that actually sends the emails (Mailgun, SendGrid, etc.)
2. **Topics**: Groups of subscribers who will receive messages
3. **Subscribers**: Individual users subscribed to topics

## Step 1: Choose Your Email Provider

Appwrite supports several email providers. Choose based on your needs:

### Mailgun (Recommended for High Volume)

- **Pros**: Reliable delivery, detailed analytics, good free tier
- **Cons**: Requires domain verification
- **Best for**: Production applications, high email volumes
- **Free tier**: 5,000 emails/month for 3 months

### SendGrid (Popular Choice)

- **Pros**: Easy setup, good documentation, reliable
- **Cons**: Stricter content policies
- **Best for**: Established businesses, marketing emails
- **Free tier**: 100 emails/day

### SMTP (Most Flexible)

- **Pros**: Works with any SMTP server, full control
- **Cons**: Requires technical setup
- **Best for**: Custom email servers, specific requirements

### Resend (Developer Friendly)

- **Pros**: Modern API, good developer experience
- **Cons**: Newer service, smaller scale
- **Best for**: Development, small to medium volumes
- **Free tier**: 3,000 emails/month

## Step 2: Create Email Provider

### Option A: Mailgun Setup

1. **Sign up for Mailgun**:

   - Go to [mailgun.com](https://mailgun.com) and create an account
   - Verify your domain (or use sandbox for testing)
   - Get your API key and domain from the dashboard

2. **Create Provider in Appwrite**:
   - Navigate to **Messaging** → **Providers**
   - Click **Create provider**
   - Select **Mailgun**
   - Configure the settings:

```
Provider Name: Mailgun Email Provider
API Key: [Your Mailgun API key]
Domain: [Your verified domain or sandbox domain]
EU Region: [Enable if using EU region]
Sender Email: [Your verified sender email]
Sender Name: [Your company/app name] (optional)
```

3. **Test the Provider**:
   - Click **Create** to save
   - Send a test email to verify configuration

### Option B: SendGrid Setup

1. **Sign up for SendGrid**:

   - Go to [sendgrid.com](https://sendgrid.com) and create an account
   - Create an API key with Mail Send permissions
   - Verify your sender identity

2. **Create Provider in Appwrite**:
   - Navigate to **Messaging** → **Providers**
   - Click **Create provider**
   - Select **SendGrid**
   - Configure the settings:

```
Provider Name: SendGrid Email Provider
API Key: [Your SendGrid API key]
Sender Email: [Your verified sender email]
Sender Name: [Your company/app name] (optional)
```

### Option C: SMTP Setup

1. **Gather SMTP Details**:

   - SMTP server hostname
   - Port number (usually 587 for TLS)
   - Username and password
   - Encryption method (TLS/SSL)

2. **Create Provider in Appwrite**:
   - Navigate to **Messaging** → **Providers**
   - Click **Create provider**
   - Select **SMTP**
   - Configure the settings:

```
Provider Name: SMTP Email Provider
Host: [SMTP server hostname]
Port: [Port number, e.g., 587]
Username: [SMTP username]
Password: [SMTP password]
Encryption: [TLS or SSL]
Sender Email: [Your verified sender email]
Sender Name: [Your company/app name] (optional)
```

### Option D: Resend Setup

1. **Sign up for Resend**:

   - Go to [resend.com](https://resend.com) and create an account
   - Create an API key in the dashboard
   - Add and verify your domain

2. **Create Provider in Appwrite**:
   - Navigate to **Messaging** → **Providers**
   - Click **Create provider**
   - Select **Resend**
   - Configure the settings:

```
Provider Name: Resend Email Provider
API Key: [Your Resend API key]
Sender Email: [Your verified sender email]
Sender Name: [Your company/app name] (optional)
```

## Step 3: Create Email Topic

Topics in Appwrite are groups of subscribers who receive messages together. For email marketing, you'll create a topic for your email subscribers.

### Create the Topic

1. **Navigate to Topics**:

   - Go to **Messaging** → **Topics**
   - Click **Create topic**

2. **Configure Topic Settings**:

```
Topic Name: Email Subscribers
Topic ID: email-subscribers (or auto-generated)
Description: Main email list for marketing campaigns
```

3. **Click Create** to save the topic

### Understanding Topic Usage

In the automation system:

- Users are automatically subscribed to topics based on their preferences
- Campaigns target specific topics or segments
- The system manages subscriptions and unsubscriptions automatically

## Step 4: Add Test Subscribers

Before testing your campaigns, add some test subscribers to your topic.

### Manual Subscriber Addition

1. **In your email topic**, click **Add subscriber**
2. **Choose Email** as the target type
3. **Enter test email addresses**:
   - Use your own email for testing
   - Add team member emails
   - Include test accounts

### Subscriber Management

The automation system will automatically:

- Add new users to appropriate topics
- Remove unsubscribed users
- Manage subscriber preferences
- Handle bounces and complaints

## Step 5: Environment Variables

Update your `.env` file with the necessary Appwrite messaging configuration:

```env
# Appwrite Configuration
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key

# Email Provider Configuration (if needed for custom integration)
APPWRITE_EMAIL_PROVIDER_ID=your-provider-id
APPWRITE_EMAIL_TOPIC_ID=email-subscribers

# Optional: Email service specific configs
MAILGUN_API_KEY=your-mailgun-key
MAILGUN_DOMAIN=your-domain
SENDGRID_API_KEY=your-sendgrid-key
```

## Step 6: Test Your Setup

### Send Test Message

1. **Navigate to Messages**:

   - Go to **Messaging** → **Messages**
   - Click **Create message**

2. **Configure Test Message**:

   - **Message Type**: Email
   - **Topics**: Select your email-subscribers topic
   - **Subject**: "Test Email Setup"
   - **Content**: Simple test message

3. **Send and Verify**:
   - Click **Send now**
   - Check that test emails are received
   - Verify sender information is correct

### Troubleshoot Common Issues

**Provider Not Working**:

- Verify API keys are correct
- Check domain verification status
- Ensure sender email is verified
- Review provider-specific requirements

**Messages Not Delivered**:

- Check spam folders
- Verify subscriber email addresses
- Review provider sending limits
- Check Appwrite logs for errors

**Permission Issues**:

- Ensure API key has proper permissions
- Verify Appwrite project settings
- Check provider account status

## Step 7: Integration with Automation System

### How the System Uses Messaging

The email marketing automation system integrates with Appwrite messaging as follows:

1. **Campaign Creation**: Creates campaigns in your database
2. **User Segmentation**: Identifies target subscribers
3. **Content Personalization**: Generates personalized email content
4. **Email Delivery**: Uses Appwrite messaging to send emails via your configured provider
5. **Analytics Tracking**: Monitors delivery, opens, clicks, and bounces

### Provider Selection in Code

The system uses the `AppwriteMessagingProvider` class to send emails:

```typescript
// Email delivery uses your configured Appwrite provider
const emailProvider = new AppwriteMessagingProvider();
const result = await emailProvider.send({
  to: user.email,
  subject: personalizedSubject,
  htmlContent: personalizedContent,
  campaignId: campaign.id,
});
```

### Topic Management

Users are automatically managed in topics based on:

- Email marketing preferences
- Subscription status
- Segmentation criteria
- Unsubscribe requests

## Provider Comparison

| Provider     | Setup Complexity | Free Tier           | Reliability       | Analytics | Best For                          |
| ------------ | ---------------- | ------------------- | ----------------- | --------- | --------------------------------- |
| **Mailgun**  | Medium           | 5K/month (3 months) | Excellent         | Detailed  | High volume, production           |
| **SendGrid** | Easy             | 100/day             | Excellent         | Good      | Marketing, established businesses |
| **SMTP**     | Hard             | Varies              | Depends on server | Basic     | Custom setups, full control       |
| **Resend**   | Easy             | 3K/month            | Good              | Good      | Development, modern APIs          |

## Security Best Practices

### API Key Management

- Store API keys in environment variables
- Use different keys for development/production
- Regularly rotate API keys
- Limit API key permissions to minimum required

### Domain Verification

- Always verify your sending domains
- Use DKIM and SPF records
- Monitor domain reputation
- Set up DMARC policies

### Compliance

- Implement proper unsubscribe mechanisms
- Maintain subscription preferences
- Log all email activities
- Follow GDPR/CAN-SPAM requirements

## Monitoring and Maintenance

### Regular Checks

- Monitor email delivery rates
- Review bounce and complaint rates
- Check provider account status
- Update API keys before expiration

### Performance Optimization

- Monitor sending volumes and limits
- Optimize email content for deliverability
- Segment audiences for better engagement
- A/B test email templates and timing

## Next Steps

With your email provider configured:

1. **Test the complete automation workflow**
2. **Monitor initial campaign performance**
3. **Adjust provider settings based on delivery metrics**
4. **Scale up email volumes gradually**
5. **Implement advanced features like webhooks for delivery tracking**

Your email marketing automation system is now ready to send personalized emails through your configured Appwrite messaging provider!

## Troubleshooting Guide

### Common Error Messages

**"Provider not found"**

- Solution: Ensure provider is created and enabled in Appwrite console

**"Invalid API key"**

- Solution: Verify API key is correct and has proper permissions

**"Domain not verified"**

- Solution: Complete domain verification process with your email provider

**"Rate limit exceeded"**

- Solution: Check provider sending limits and implement rate limiting

**"Template not found"**

- Solution: Ensure email templates are uploaded to Appwrite Storage

For additional support, consult the [Appwrite Messaging Documentation](https://appwrite.io/docs/products/messaging) or your email provider's support resources.
