from datetime import datetime, timedelta
import os
import asyncio
import aiohttp
import json

# Step configuration
config = {
    "type": "event",
    "name": "ContentPersonalization",
    "description": "AI-powered content personalization for email campaigns using Appwrite Storage",
    "subscribes": ["users-segmented"],
    "emits": ["content-personalized"],
    "input": {
        "type": "object",
        "properties": {
            "campaignId": {"type": "string"},
            "name": {"type": "string"},
            "subject": {"type": "string"},
            "template": {"type": "string"},
            "personalizeContent": {"type": "boolean"},
            "scheduledFor": {"type": "string"},
            "recipients": {"type": "array"},
            "totalRecipients": {"type": "number"},
        },
        "required": [
            "campaignId",
            "name",
            "subject",
            "template",
            "personalizeContent",
            "recipients",
            "totalRecipients",
        ],
    },
    "flows": ["email-automation"],
}


async def handler(input_data, ctx):
    """Step 03 - AI-powered content personalization with Appwrite Storage integration"""

    campaign_id = input_data["campaignId"]
    recipients = input_data["recipients"]
    base_subject = input_data["subject"]
    template_name = input_data["template"]
    personalize = input_data["personalizeContent"]

    try:
        ctx.logger.info(
            f"Starting content personalization - campaignId: {campaign_id}, recipients: {len(recipients)}, personalize: {personalize}, template: {template_name}"
        )

        # Fetch template from Appwrite Storage
        template_content = await fetch_template_from_storage(template_name, ctx)
        if not template_content:
            ctx.logger.error(f"Failed to fetch template: {template_name}")
            template_content = get_fallback_template()

        personalized_emails = []

        # Process each recipient
        for i, recipient_data in enumerate(recipients):
            try:
                if personalize:
                    # AI-powered personalization
                    personalized_subject = await personalize_subject_with_ai(
                        recipient_data, base_subject, ctx
                    )
                    personalized_content = await personalize_content_with_ai(
                        recipient_data, template_content, base_subject, ctx
                    )
                else:
                    # Basic personalization (template replacement only)
                    personalized_subject = replace_placeholders(
                        base_subject, recipient_data
                    )
                    personalized_content = replace_placeholders(
                        template_content, recipient_data
                    )

                # Create personalized email object
                email = {
                    "id": f"email_{int(datetime.now().timestamp())}_{recipient_data['id']}",
                    "campaignId": campaign_id,
                    "userId": recipient_data["id"],
                    "email": recipient_data["email"],
                    "subject": personalized_subject,
                    "content": personalized_content,
                    "status": "queued",
                    "createdAt": datetime.now().isoformat(),
                }

                personalized_emails.append(email)

                ctx.logger.info(
                    f"Personalized email {i + 1}/{len(recipients)} for user {recipient_data['id']}"
                )

            except Exception as e:
                ctx.logger.warn(
                    f"Failed to personalize email for user {recipient_data['id']}: {str(e)}"
                )
                continue

        # Store personalized emails in state
        await ctx.state.set("personalized_emails", campaign_id, personalized_emails)

        ctx.logger.info(
            f"Content personalization completed - campaignId: {campaign_id}, personalizedEmails: {len(personalized_emails)}"
        )

        # Emit event for next step
        await ctx.emit(
            {
                "topic": "content-personalized",
                "data": {
                    "campaignId": campaign_id,
                    "scheduledFor": input_data.get("scheduledFor"),
                    "personalizedEmails": personalized_emails,
                    "totalEmails": len(personalized_emails),
                },
            }
        )

    except Exception as e:
        ctx.logger.error(
            f"Content personalization failed: {str(e)} - campaignId: {campaign_id}"
        )

        await ctx.emit(
            {
                "topic": "processing.failed",
                "data": {
                    "campaignId": campaign_id,
                    "step": "content-personalization",
                    "error": str(e),
                },
            }
        )


async def fetch_template_from_storage(template_name, ctx):
    """Fetch email template from Appwrite Storage"""
    try:
        # Map template names to file IDs
        template_mapping = {
            "vip": "vip-template",
            "basic": "basic-template",
            "newsletter": "newsletter-template",
            "welcome": "welcome-template",
            "winback": "winback-template",
        }

        file_id = template_mapping.get(template_name, "vip-template")

        # Make HTTP request to Appwrite Storage API
        endpoint = os.getenv("APPWRITE_ENDPOINT", "https://cloud.appwrite.io/v1")
        project_id = os.getenv("APPWRITE_PROJECT_ID")
        api_key = os.getenv("APPWRITE_API_KEY")

        if not all([endpoint, project_id, api_key]):
            ctx.logger.warn("Missing Appwrite credentials, using fallback template")
            return None

        url = f"{endpoint}/storage/buckets/templates/files/{file_id}/download"
        headers = {
            "X-Appwrite-Project": project_id,
            "X-Appwrite-Key": api_key,
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    content = await response.text()
                    ctx.logger.info(f"Successfully fetched template: {template_name}")
                    return content
                else:
                    ctx.logger.warn(
                        f"Failed to fetch template {template_name}: {response.status}"
                    )
                    return None

    except Exception as e:
        ctx.logger.warn(f"Error fetching template from storage: {str(e)}")
        return None


async def personalize_subject_with_ai(user_data, base_subject, ctx):
    """AI-powered subject line personalization using OpenAI"""
    try:
        openai_key = os.getenv("OPENAI_API_KEY")
        if not openai_key:
            ctx.logger.warn(
                "No OpenAI API key, falling back to rule-based personalization"
            )
            return personalize_subject_fallback(user_data, base_subject)

        # Prepare user context
        user_context = prepare_user_context(user_data)

        prompt = f"""
        Personalize this email subject line for a user with the following profile:
        
        Base Subject: "{base_subject}"
        User Profile: {user_context}
        
        Requirements:
        - Keep it engaging and relevant to their profile
        - Maximum 60 characters
        - Maintain the core message
        - Use their name if appropriate
        - Consider their VIP status, purchase history, and engagement level
        
        Return only the personalized subject line, no explanations.
        """

        personalized_subject = await call_openai_api(prompt, ctx, max_tokens=20)

        if personalized_subject and len(personalized_subject.strip()) > 0:
            return personalized_subject.strip().replace('"', "")
        else:
            return personalize_subject_fallback(user_data, base_subject)

    except Exception as e:
        ctx.logger.warn(f"AI subject personalization failed: {str(e)}")
        return personalize_subject_fallback(user_data, base_subject)


async def personalize_content_with_ai(user_data, template_content, subject, ctx):
    """AI-powered content personalization using OpenAI"""
    try:
        openai_key = os.getenv("OPENAI_API_KEY")
        if not openai_key:
            ctx.logger.warn("No OpenAI API key, falling back to template replacement")
            return personalize_content_fallback(user_data, template_content)

        # Replace basic placeholders first
        content = replace_placeholders(template_content, user_data)

        # Generate AI-powered personalized section
        if "{{personalizedSection}}" in content:
            user_context = prepare_user_context(user_data)

            prompt = f"""
            Create a personalized message section for this email recipient:
            
            User Profile: {user_context}
            Email Subject: "{subject}"
            
            Requirements:
            - 2-3 sentences maximum
            - Relevant to their profile and engagement level
            - Professional and friendly tone
            - Include specific benefits or recommendations based on their status
            - HTML format with appropriate styling
            
            Return only the HTML content for the personalized section.
            """

            personalized_section = await call_openai_api(prompt, ctx, max_tokens=150)

            if personalized_section:
                ctx.logger.info(f"✅ OPENAI RESPONSE RECEIVED")
                ctx.logger.info(f"🎯 GENERATED CONTENT: {personalized_section}")
                content = content.replace(
                    "{{personalizedSection}}", personalized_section.strip()
                )
            else:
                content = content.replace(
                    "{{personalizedSection}}",
                    get_fallback_personalized_section(user_data),
                )

        return content

    except Exception as e:
        ctx.logger.warn(f"AI content personalization failed: {str(e)}")
        return personalize_content_fallback(user_data, template_content)


async def call_openai_api(prompt, ctx, max_tokens=100):
    """Make API call to OpenAI"""
    try:
        openai_key = os.getenv("OPENAI_API_KEY")
        url = "https://api.openai.com/v1/chat/completions"

        headers = {
            "Authorization": f"Bearer {openai_key}",
            "Content-Type": "application/json",
        }

        data = {
            "model": "gpt-3.5-turbo",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
            "temperature": 0.7,
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=data) as response:
                if response.status == 200:
                    result = await response.json()
                    return result["choices"][0]["message"]["content"]
                else:
                    ctx.logger.warn(f"OpenAI API error: {response.status}")
                    return None

    except Exception as e:
        ctx.logger.warn(f"OpenAI API call failed: {str(e)}")
        return None


def prepare_user_context(user_data):
    """Prepare user data context for AI"""
    metadata = user_data.get("metadata", {})
    preferences = user_data.get("preferences", {})

    context = {
        "name": user_data.get("firstName", ""),
        "vip_status": metadata.get("vipStatus", False),
        "total_purchases": metadata.get("totalPurchases", 0),
        "is_new_user": is_new_user(user_data),
        "email_frequency": preferences.get("frequency", "monthly"),
        "engagement_level": get_engagement_level(user_data),
    }

    return json.dumps(context)


def get_engagement_level(user_data):
    """Determine user engagement level"""
    metadata = user_data.get("metadata", {})
    purchases = metadata.get("totalPurchases", 0)
    vip = metadata.get("vipStatus", False)

    if vip:
        return "high"
    elif purchases > 5:
        return "medium"
    elif is_new_user(user_data):
        return "new"
    else:
        return "low"


def personalize_subject_fallback(user_data, base_subject):
    """Fallback subject personalization when AI is unavailable"""
    first_name = user_data.get("firstName", "")
    metadata = user_data.get("metadata", {})

    if metadata.get("vipStatus"):
        return f"🌟 VIP: {base_subject}"
    elif metadata.get("totalPurchases", 0) > 5:
        return f"Hi {first_name}! {base_subject}"
    elif is_new_user(user_data):
        return f"Welcome {first_name}! {base_subject}"
    else:
        return f"{first_name}, {base_subject}" if first_name else base_subject


def personalize_content_fallback(user_data, template_content):
    """Fallback content personalization when AI is unavailable"""
    content = replace_placeholders(template_content, user_data)

    if "{{personalizedSection}}" in content:
        fallback_section = get_fallback_personalized_section(user_data)
        content = content.replace("{{personalizedSection}}", fallback_section)

    return content


def get_fallback_personalized_section(user_data):
    """Generate fallback personalized section"""
    metadata = user_data.get("metadata", {})

    if metadata.get("vipStatus"):
        return """
        <div style="background-color: #ffd700; padding: 15px; margin: 10px 0; border-radius: 5px;">
            <h3>🌟 VIP Member Benefits</h3>
            <p>As a valued VIP member, you get exclusive access to premium features and early releases!</p>
        </div>
        """
    elif metadata.get("totalPurchases", 0) > 5:
        return f"""
        <div style="background-color: #e8f5e8; padding: 15px; margin: 10px 0; border-radius: 5px;">
            <h3>💚 Thank You for Your Loyalty</h3>
            <p>We've noticed you're one of our valued customers with {metadata.get("totalPurchases", 0)} purchases. Here's something special for you!</p>
        </div>
        """
    elif is_new_user(user_data):
        return """
        <div style="background-color: #e3f2fd; padding: 15px; margin: 10px 0; border-radius: 5px;">
            <h3>🎉 Welcome to Our Community!</h3>
            <p>We're excited to have you join us! Here's a beginner's guide to get you started.</p>
        </div>
        """
    else:
        return """
        <div style="background-color: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px;">
            <p>We have something special prepared just for you based on your interests.</p>
        </div>
        """


def replace_placeholders(content, user_data):
    """Replace template placeholders with user data"""
    replacements = {
        "{{firstName}}": user_data.get("firstName", ""),
        "{{lastName}}": user_data.get("lastName", ""),
        "{{email}}": user_data.get("email", ""),
        "{{companyName}}": "Your Company",
    }

    for placeholder, value in replacements.items():
        content = content.replace(placeholder, str(value))

    return content


def get_fallback_template():
    """Fallback HTML template when storage fetch fails"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Email</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px;">
            <h1>Hello {{firstName}}!</h1>
            
            {{personalizedSection}}
            
            <p>Thank you for being part of our community.</p>
            
            <footer style="margin-top: 40px; color: #666; font-size: 12px;">
                <p>You're receiving this because you subscribed to our updates.</p>
            </footer>
        </div>
    </body>
    </html>
    """


def is_new_user(user_data):
    """Check if user signed up in the last 7 days"""
    try:
        signup_date = datetime.fromisoformat(
            user_data["metadata"]["signupDate"].replace("Z", "+00:00")
        )
        seven_days_ago = datetime.now() - timedelta(days=7)
        return signup_date >= seven_days_ago.replace(tzinfo=signup_date.tzinfo)
    except Exception:
        return False
