from datetime import datetime, timedelta
import os

# Step configuration
config = {
    "type": "event",
    "name": "ContentPersonalization",
    "description": "AI-powered content personalization for email campaigns",
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
    """Step 03 - AI-powered content personalization for email campaigns"""

    campaign_id = input_data["campaignId"]
    recipients = input_data["recipients"]
    base_subject = input_data["subject"]
    base_template = input_data["template"]
    personalize = input_data["personalizeContent"]

    try:
        ctx.logger.info(
            f"Starting content personalization - campaignId: {campaign_id}, recipients: {len(recipients)}, personalize: {personalize}"
        )

        personalized_emails = []

        # Process each recipient
        for i, recipient_data in enumerate(recipients):
            try:
                if personalize:
                    # AI-powered personalization
                    personalized_subject = await personalize_subject(
                        recipient_data, base_subject, ctx
                    )
                    personalized_content = await personalize_content(
                        recipient_data, base_template, ctx
                    )
                else:
                    # Basic personalization (just name replacement)
                    personalized_subject = base_subject
                    personalized_content = base_template.replace(
                        "{{firstName}}", recipient_data["firstName"]
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


async def personalize_subject(user_data, base_subject, ctx):
    """AI-powered subject line personalization"""

    try:
        # In real implementation, this would call OpenAI API
        # openai_key = os.getenv("OPENAI_API_KEY")

        first_name = user_data["firstName"]
        metadata = user_data["metadata"]

        # Mock AI personalization logic
        if metadata["vipStatus"]:
            return f"🌟 VIP Exclusive: {base_subject}"
        elif metadata["totalPurchases"] > 5:
            return f"Hi {first_name}! {base_subject}"
        elif is_new_user(user_data):
            return f"Welcome {first_name}! {base_subject}"
        else:
            return f"{first_name}, {base_subject}"

    except Exception as e:
        ctx.logger.warn(f"Subject personalization failed, using base subject: {str(e)}")
        return base_subject


async def personalize_content(user_data, base_template, ctx):
    """AI-powered content personalization"""

    try:
        # Replace basic placeholders
        content = base_template.replace("{{firstName}}", user_data["firstName"])
        content = content.replace("{{lastName}}", user_data["lastName"])

        metadata = user_data["metadata"]
        preferences = user_data["preferences"]

        # Add personalized sections based on user data
        if metadata["vipStatus"]:
            vip_section = """
            <div style="background-color: #ffd700; padding: 15px; margin: 10px 0; border-radius: 5px;">
                <h3>🌟 VIP Member Benefits</h3>
                <p>As a valued VIP member, you get exclusive access to premium features and early releases!</p>
            </div>
            """
            content = content.replace("{{personalizedSection}}", vip_section)

        elif metadata["totalPurchases"] > 5:
            loyal_section = f"""
            <div style="background-color: #e8f5e8; padding: 15px; margin: 10px 0; border-radius: 5px;">
                <h3>💚 Thank You for Your Loyalty</h3>
                <p>We've noticed you're one of our valued customers with {metadata["totalPurchases"]} purchases. Here's something special for you!</p>
            </div>
            """
            content = content.replace("{{personalizedSection}}", loyal_section)

        elif is_new_user(user_data):
            welcome_section = """
            <div style="background-color: #e3f2fd; padding: 15px; margin: 10px 0; border-radius: 5px;">
                <h3>🎉 Welcome to Our Community!</h3>
                <p>We're excited to have you join us! Here's a beginner's guide to get you started.</p>
            </div>
            """
            content = content.replace("{{personalizedSection}}", welcome_section)
        else:
            content = content.replace("{{personalizedSection}}", "")

        # Add frequency-based messaging
        frequency = preferences["frequency"]
        if frequency == "daily":
            content += "<p><small>You're receiving daily updates. <a href='#'>Change frequency</a></small></p>"
        elif frequency == "weekly":
            content += "<p><small>You're receiving weekly updates. <a href='#'>Change frequency</a></small></p>"
        else:
            content += "<p><small>You're receiving monthly updates. <a href='#'>Change frequency</a></small></p>"

        return content

    except Exception as e:
        ctx.logger.warn(
            f"Content personalization failed, using base template: {str(e)}"
        )
        return base_template.replace("{{firstName}}", user_data.get("firstName", ""))


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
