# Email Template Setup Guide

This guide walks you through creating and uploading email templates to Appwrite Storage for the email marketing automation system.

## Prerequisites

- Access to your Appwrite Console
- Basic understanding of HTML email design
- Project already created in Appwrite

## Step 1: Create Templates Bucket

1. Open your Appwrite Console and navigate to **Storage**
2. Click **Create bucket**
3. Configure the bucket:

   - **Bucket ID**: `templates`
   - **Name**: `Email Templates`
   - **File Security**: Enabled (recommended)
   - **Maximum File Size**: 5MB (sufficient for HTML templates)
   - **Allowed File Extensions**: `html, htm` (optional but recommended)

4. Click **Create** to finish

## Step 2: Set Bucket Permissions

Configure permissions to allow your application to read template files:

### Read Permissions

- **Any**: Allow any authenticated user to read templates
- **Or specify your app's user role**: More restrictive approach

### Create/Update/Delete Permissions

- **Users**: Allow authenticated users to manage templates
- **Or limit to admin roles**: For production environments

## Step 3: Create Email Templates

Create the following HTML template files on your local machine:

### VIP Template (`vip-template.html`)

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VIP Exclusive Offer</title>
  </head>
  <body
    style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;"
  >
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 0;">
          <div
            style="max-width: 600px; margin: 0 auto; background-color: #ffffff;"
          >
            <!-- Header -->
            <div
              style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center;"
            >
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">
                🌟 VIP Exclusive Access
              </h1>
              <p style="font-size: 18px; margin: 10px 0 0 0;">
                Hello {{firstName}}!
              </p>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              {{personalizedSection}}

              <div
                style="background-color: #ffd700; padding: 25px; margin: 25px 0; border-radius: 10px; text-align: center; border: 2px solid #ffcd00;"
              >
                <h2 style="margin: 0 0 10px 0; color: #333; font-size: 24px;">
                  🎯 Exclusive VIP Benefits
                </h2>
                <p style="margin: 0; color: #666; font-size: 16px;">
                  Early access • Premium support • Special pricing • Priority
                  handling
                </p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a
                  href="#"
                  style="display: inline-block; background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);"
                  >🚀 Claim Your VIP Access</a
                >
              </div>

              <div
                style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;"
              >
                <p
                  style="margin: 0; color: #666; font-size: 14px; line-height: 1.5;"
                >
                  Thank you for being a valued VIP member, {{firstName}}. Your
                  loyalty means everything to us, and we're committed to
                  providing you with the best possible experience.
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div
              style="background-color: #333; color: white; padding: 25px; text-align: center;"
            >
              <p style="margin: 0 0 10px 0; font-size: 14px;">
                You're receiving this because you're a VIP member.
              </p>
              <p style="margin: 0; font-size: 12px;">
                <a
                  href="#"
                  style="color: #ccc; text-decoration: none; margin: 0 10px;"
                  >Update preferences</a
                >
                |
                <a
                  href="#"
                  style="color: #ccc; text-decoration: none; margin: 0 10px;"
                  >Unsubscribe</a
                >
              </p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>
```

### Basic Template (`basic-template.html`)

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Newsletter Update</title>
  </head>
  <body
    style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;"
  >
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 20px 0;">
          <div
            style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);"
          >
            <!-- Header -->
            <div
              style="background-color: #007bff; color: white; padding: 30px; text-align: center;"
            >
              <h1 style="margin: 0; font-size: 24px;">Hello {{firstName}}!</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
                We have something special for you
              </p>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              {{personalizedSection}}

              <div
                style="background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #007bff;"
              >
                <h3 style="margin: 0 0 10px 0; color: #333; font-size: 18px;">
                  What's New
                </h3>
                <p style="margin: 0; color: #666; line-height: 1.5;">
                  Stay updated with our latest features, community highlights,
                  and exclusive content just for you.
                </p>
              </div>

              <p style="color: #666; line-height: 1.6; margin: 20px 0;">
                Thank you for being part of our community, {{firstName}}. Your
                engagement and feedback help us grow better every day.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a
                  href="#"
                  style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;"
                  >Learn More</a
                >
              </div>
            </div>

            <!-- Footer -->
            <div
              style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;"
            >
              <p style="margin: 0 0 5px 0; color: #666; font-size: 12px;">
                You're receiving this because you subscribed to our updates.
              </p>
              <p style="margin: 0; font-size: 12px;">
                <a href="#" style="color: #007bff; text-decoration: none;"
                  >Unsubscribe</a
                >
                |
                <a href="#" style="color: #007bff; text-decoration: none;"
                  >Update Preferences</a
                >
              </p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>
```

### Newsletter Template (`newsletter-template.html`)

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Weekly Newsletter</title>
  </head>
  <body
    style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;"
  >
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 20px 0;">
          <div
            style="max-width: 600px; margin: 0 auto; background-color: #ffffff;"
          >
            <!-- Header -->
            <div
              style="background-color: #6c757d; color: white; padding: 25px; text-align: center;"
            >
              <h1 style="margin: 0; font-size: 26px;">📰 Weekly Newsletter</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">
                Hi {{firstName}}, here's what happened this week
              </p>
            </div>

            <!-- Content -->
            <div style="padding: 25px;">
              {{personalizedSection}}

              <!-- Article Section -->
              <div style="margin: 25px 0;">
                <h2 style="color: #333; font-size: 20px; margin: 0 0 15px 0;">
                  This Week's Highlights
                </h2>
                <div
                  style="border-bottom: 1px solid #e9ecef; padding-bottom: 15px; margin-bottom: 15px;"
                >
                  <h3
                    style="color: #495057; font-size: 16px; margin: 0 0 5px 0;"
                  >
                    Feature Update
                  </h3>
                  <p style="color: #666; margin: 0; line-height: 1.5;">
                    New improvements to enhance your experience.
                  </p>
                </div>
                <div
                  style="border-bottom: 1px solid #e9ecef; padding-bottom: 15px; margin-bottom: 15px;"
                >
                  <h3
                    style="color: #495057; font-size: 16px; margin: 0 0 5px 0;"
                  >
                    Community Spotlight
                  </h3>
                  <p style="color: #666; margin: 0; line-height: 1.5;">
                    Amazing achievements from our community members.
                  </p>
                </div>
              </div>

              <div style="text-align: center; margin: 25px 0;">
                <a
                  href="#"
                  style="display: inline-block; background-color: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;"
                  >Read Full Newsletter</a
                >
              </div>
            </div>

            <!-- Footer -->
            <div
              style="background-color: #f8f9fa; padding: 20px; text-align: center;"
            >
              <p style="margin: 0; color: #666; font-size: 12px;">
                Weekly newsletter • Delivered every Tuesday
              </p>
              <p style="margin: 5px 0 0 0; font-size: 12px;">
                <a href="#" style="color: #6c757d;">Unsubscribe</a>
              </p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>
```

### Welcome Template (`welcome-template.html`)

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Welcome Aboard!</title>
  </head>
  <body
    style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;"
  >
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 20px 0;">
          <div
            style="max-width: 600px; margin: 0 auto; background-color: #ffffff;"
          >
            <!-- Header -->
            <div
              style="background-color: #28a745; color: white; padding: 30px; text-align: center;"
            >
              <h1 style="margin: 0; font-size: 28px;">
                🎉 Welcome {{firstName}}!
              </h1>
              <p style="margin: 10px 0 0 0; font-size: 18px;">
                We're thrilled to have you join us
              </p>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              {{personalizedSection}}

              <div
                style="background-color: #d1ecf1; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #17a2b8;"
              >
                <h3 style="margin: 0 0 10px 0; color: #0c5460;">
                  🚀 Quick Start Guide
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #0c5460;">
                  <li>Complete your profile setup</li>
                  <li>Explore our key features</li>
                  <li>Join our community discussions</li>
                  <li>Check out our getting started resources</li>
                </ul>
              </div>

              <p style="color: #666; line-height: 1.6;">
                You've made a great choice, {{firstName}}! Our platform is
                designed to help you achieve your goals efficiently and
                effectively.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a
                  href="#"
                  style="display: inline-block; background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;"
                  >Get Started Now</a
                >
              </div>
            </div>

            <!-- Footer -->
            <div
              style="background-color: #f8f9fa; padding: 20px; text-align: center;"
            >
              <p style="margin: 0; color: #666; font-size: 12px;">
                Welcome to the community! Need help? Just reply to this email.
              </p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>
```

### Winback Template (`winback-template.html`)

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>We Miss You!</title>
  </head>
  <body
    style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;"
  >
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 20px 0;">
          <div
            style="max-width: 600px; margin: 0 auto; background-color: #ffffff;"
          >
            <!-- Header -->
            <div
              style="background-color: #ff6b6b; color: white; padding: 30px; text-align: center;"
            >
              <h1 style="margin: 0; font-size: 26px;">
                💔 We miss you, {{firstName}}!
              </h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">
                It's been a while since we've seen you
              </p>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              {{personalizedSection}}

              <div
                style="background-color: #fff3cd; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #ffc107;"
              >
                <h3 style="margin: 0 0 10px 0; color: #856404;">
                  🎁 Special Welcome Back Offer
                </h3>
                <p style="margin: 0; color: #856404; line-height: 1.5;">
                  We've prepared something special just for you! Get 30% off
                  your next purchase and rediscover what you've been missing.
                </p>
              </div>

              <div style="margin: 25px 0;">
                <h3 style="color: #333; font-size: 18px; margin: 0 0 15px 0;">
                  What's New Since You've Been Away:
                </h3>
                <ul style="color: #666; line-height: 1.6; padding-left: 20px;">
                  <li>New features and improvements</li>
                  <li>Enhanced user experience</li>
                  <li>Exclusive content and resources</li>
                  <li>Growing community of like-minded members</li>
                </ul>
              </div>

              <p style="color: #666; line-height: 1.6;">
                We'd love to have you back, {{firstName}}. Your account is still
                active and waiting for you!
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a
                  href="#"
                  style="display: inline-block; background-color: #ff6b6b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;"
                  >Welcome Me Back</a
                >
              </div>
            </div>

            <!-- Footer -->
            <div
              style="background-color: #f8f9fa; padding: 20px; text-align: center;"
            >
              <p style="margin: 0 0 5px 0; color: #666; font-size: 12px;">
                Not interested? You can
                <a href="#" style="color: #666;">unsubscribe here</a>.
              </p>
              <p style="margin: 0; color: #666; font-size: 12px;">
                We respect your inbox and will only send relevant updates.
              </p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>
```

## Step 4: Upload Templates to Appwrite

1. In your **templates** bucket, click **Create file**
2. For each template file:
   - Click **Upload file**
   - Select your HTML file
   - **Important**: Set the **File ID** exactly as shown:
     - `vip-template` (not vip-template.html)
     - `basic-template`
     - `newsletter-template`
     - `welcome-template`
     - `winback-template`
3. Click **Create** to upload

## Step 5: Verify Template Setup

Test that your templates are accessible:

1. Navigate to your **templates** bucket
2. Click on each template file
3. Verify you can preview the HTML content
4. Check that file IDs match exactly (no file extensions)

## Template Features Explained

### Placeholders

- `{{firstName}}` - Replaced with user's first name
- `{{lastName}}` - Replaced with user's last name
- `{{personalizedSection}}` - AI-generated personalized content

### Responsive Design

- All templates use table-based layouts for email client compatibility
- Inline CSS for maximum compatibility
- Mobile-friendly viewport meta tags

### Accessibility

- Proper semantic HTML structure
- Alt text ready for images (when added)
- High contrast color schemes
- Clear call-to-action buttons

## Testing Your Templates

Once uploaded, you can test the system with these campaign payloads:

```json
{
  "name": "VIP Exclusive Offer",
  "subject": "Exclusive early access for our VIP members",
  "template": "vip",
  "targetAudience": "vip_users",
  "personalizeContent": true
}
```

```json
{
  "name": "Weekly Newsletter",
  "subject": "This week's highlights and updates",
  "template": "newsletter",
  "targetAudience": "all",
  "personalizeContent": false
}
```

## Troubleshooting

### Common Issues

1. **Template not found error**

   - Verify file ID matches exactly (no extensions)
   - Check bucket permissions
   - Ensure template is uploaded successfully

2. **Template content not loading**

   - Verify your Appwrite credentials in environment variables
   - Check network connectivity to Appwrite
   - Review error logs in the content personalization step

3. **Personalization not working**
   - Ensure `{{personalizedSection}}` placeholder exists in template
   - Check OpenAI API key configuration
   - Verify `personalizeContent: true` in campaign payload

### File ID Mapping

The system maps template names to file IDs as follows:

```javascript
const templateMapping = {
  vip: "vip-template",
  basic: "basic-template",
  newsletter: "newsletter-template",
  welcome: "welcome-template",
  winback: "winback-template",
};
```

Make sure your file IDs match the values on the right side of this mapping.

## Next Steps

With your templates set up, you can now:

1. Test campaign creation with different template types
2. Experiment with AI personalization
3. Create custom templates for specific use cases
4. Set up behavioral triggers that use specific templates

Your email marketing automation system is now ready for comprehensive testing!
