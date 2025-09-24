import { workbenchXPath, TutorialStep } from "@motiadev/workbench";

export const steps: TutorialStep[] = [
  {
    title: "Email Marketing Automation Engine",
    image: {
      height: 200,
      src: "https://github.com/MotiaDev/motia/raw/main/packages/docs/public/github-readme-banner.png",
    },
    description: () => (
      <p>
        Welcome to the Email Marketing Automation Engine! This comprehensive
        system demonstrates how to build a complete email marketing platform
        with campaign management, user segmentation, AI-powered personalization,
        and behavioral triggers.
        <br />
        <br />
        You'll learn how to create campaigns, segment users, personalize
        content, schedule deliveries, track analytics, and handle user
        preferences through an event-driven architecture.
        <br />
        <br />
        💡 This example showcases advanced workflow orchestration,
        multi-provider integrations, and enterprise-scale email automation
        patterns.
      </p>
    ),
  },

  // Campaign Creation API

  {
    elementXpath: workbenchXPath.flows.node("createcampaign"),
    title: "Campaign Creation API",
    link: "https://www.motia.dev/docs/concepts/steps/api",
    description: () => (
      <p>
        Let's start with the foundation of our email automation system - the{" "}
        <b>Campaign Creation API</b>.
        <br />
        <br />
        This API endpoint allows marketers to create new email campaigns with
        comprehensive configuration options including target audiences,
        templates, scheduling, and personalization settings.
        <br />
        <br />
        The endpoint validates campaign data and immediately triggers the email
        automation workflow.
      </p>
    ),
    before: [
      { type: "click", selector: workbenchXPath.links.flows },
      {
        type: "click",
        selector: workbenchXPath.flows.dropdownFlow("email-automation-engine"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.flows.previewButton("createcampaign"),
    title: "Code Preview",
    description: () => (
      <p>
        Click on this icon to visualize the source code for the Campaign
        Creation API step.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.closePanelButton,
        optional: true,
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "API Endpoint Configuration",
    description: () => (
      <p>
        The Campaign Creation API is configured as a POST endpoint at{" "}
        <code>/campaigns</code>
        with comprehensive validation for all campaign parameters.
        <br />
        <br />
        The configuration includes request validation, response schemas, and
        event emission setup to trigger the email automation workflow.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.previewButton("createcampaign"),
      },
      {
        type: "click",
        selector: workbenchXPath.flows.feature("api-configuration"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Request Body Schema",
    description: () => (
      <p>
        The request schema validates campaign data including name, subject,
        template, target audience, and scheduling options using Zod validation.
        <br />
        <br />
        This ensures all campaign data is properly structured before processing
        begins, preventing errors in downstream steps.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("request-validation"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Campaign Object Creation",
    description: () => (
      <p>
        The system creates a comprehensive campaign object with status logic,
        metrics initialization, and proper data structure.
        <br />
        <br />
        Each campaign is assigned a unique ID and initialized with tracking
        metrics for performance monitoring throughout its lifecycle.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("campaign-creation"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Database Storage",
    description: () => (
      <p>
        Campaign data is stored in Appwrite database with automatic ID
        generation and timestamp tracking.
        <br />
        <br />
        This provides persistent storage for campaign data and enables tracking
        across the entire email automation workflow.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("appwrite-integration"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Workflow Trigger",
    description: () => (
      <p>
        After creating the campaign, the API emits a{" "}
        <code>campaign-created</code>
        event to trigger the email automation workflow.
        <br />
        <br />
        This event-driven approach allows the system to process campaigns
        asynchronously while providing immediate feedback to the user.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("event-emission"),
      },
    ],
  },

  // User Segmentation

  {
    elementXpath: workbenchXPath.flows.node("usersegmentation"),
    title: "User Segmentation Engine",
    description: () => (
      <p>
        The <b>User Segmentation Engine</b> is responsible for identifying and
        filtering the right audience for each campaign. It subscribes to{" "}
        <code>campaign-created</code>
        events and applies sophisticated segmentation logic.
        <br />
        <br />
        The system supports multiple audience types including new users, active
        users, VIP customers, and custom segments with advanced filtering
        capabilities.
        <br />
        <br />
        💡 Proper segmentation is crucial for campaign effectiveness and
        compliance.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.closePanelButton }],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Event Step Configuration",
    description: () => (
      <p>
        The User Segmentation step is configured as an event step that
        subscribes to campaign-created events and emits users-segmented events
        for downstream processing.
        <br />
        <br />
        This configuration enables automatic segmentation whenever new campaigns
        are created.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.previewButton("usersegmentation"),
      },
      {
        type: "click",
        selector: workbenchXPath.flows.feature("event-configuration"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "User Segmentation Logic",
    description: () => (
      <p>
        The core segmentation logic fetches users from Appwrite and applies
        audience-specific filtering criteria.
        <br />
        <br />
        The system supports filtering by user signup date, activity levels,
        subscription status, and custom user attributes for precise targeting.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("user-segmentation"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Campaign State Storage",
    description: () => (
      <p>
        Segmented users are stored in Motia state for campaign processing, and
        campaign metrics are updated in Appwrite.
        <br />
        <br />
        This state management ensures that all campaign data persists throughout
        the automation workflow for reliable processing.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("state-management"),
      },
    ],
  },

  // Content Personalization

  {
    elementXpath: workbenchXPath.flows.node("contentpersonalization"),
    title: "AI Content Personalization",
    description: () => (
      <p>
        The <b>Content Personalization Engine</b> uses AI to create personalized
        email content for each recipient. It processes segmented users and
        applies advanced personalization techniques.
        <br />
        <br />
        The system supports both AI-powered personalization using language
        models and rule-based personalization based on user data and
        preferences.
        <br />
        <br />
        💡 This Python step showcases multi-language support in Motia workflows.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.closePanelButton }],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Python Event Step",
    description: () => (
      <p>
        This step is implemented in Python and subscribes to users-segmented
        events to process content personalization for each recipient.
        <br />
        <br />
        Motia supports multiple programming languages, allowing teams to use the
        best tool for each specific task.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.previewButton("contentpersonalization"),
      },
      {
        type: "click",
        selector: workbenchXPath.flows.feature("event-configuration"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "AI-Powered Personalization",
    description: () => (
      <p>
        Advanced AI personalization functions create personalized subject lines
        and content based on user metadata, VIP status, and purchase history.
        <br />
        <br />
        The system uses language models to generate contextually relevant
        content that resonates with individual recipients.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("ai-personalization"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Personalized Content Storage",
    description: () => (
      <p>
        Personalized emails are stored in Motia state and the system emits
        content-personalized events to continue the automation workflow.
        <br />
        <br />
        This ensures that personalized content is preserved and can be accessed
        by subsequent steps in the email delivery process.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("state-storage"),
      },
    ],
  },

  // Email Delivery

  {
    elementXpath: workbenchXPath.flows.node("emaildelivery"),
    title: "Email Delivery Engine",
    description: () => (
      <p>
        The <b>Email Delivery Engine</b> handles the actual sending of emails
        with batch processing, rate limiting, and scheduling capabilities.
        <br />
        <br />
        It processes personalized content and delivers emails through various
        email service providers with comprehensive error handling and retry
        logic.
        <br />
        <br />
        💡 The system supports both immediate delivery and scheduled campaigns.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.closePanelButton }],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Campaign Scheduling Logic",
    description: () => (
      <p>
        The system checks if campaigns are scheduled for future delivery and
        stores them for cron job processing, otherwise processes immediately.
        <br />
        <br />
        This flexible scheduling system allows marketers to plan campaigns in
        advance and ensures timely delivery.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.previewButton("emaildelivery"),
      },
      {
        type: "click",
        selector: workbenchXPath.flows.feature("scheduling-logic"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Batch Email Processing",
    description: () => (
      <p>
        Emails are processed in batches with parallel execution and rate
        limiting to avoid overwhelming email service providers.
        <br />
        <br />
        This ensures reliable delivery while maintaining good relationships with
        email service providers and preventing rate limit issues.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("batch-processing"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Individual Email Sending",
    description: () => (
      <p>
        Each email is sent through the email provider with comprehensive error
        tracking and status updates in state.
        <br />
        <br />
        The system tracks delivery success and failures, providing detailed
        analytics for campaign performance monitoring.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("email-sending"),
      },
    ],
  },

  // Email Scheduler

  {
    elementXpath: workbenchXPath.flows.node("emailscheduler"),
    title: "Email Scheduler",
    description: () => (
      <p>
        The <b>Email Scheduler</b> is a cron job that runs every 5 minutes to
        check for scheduled campaigns and trigger them when ready.
        <br />
        <br />
        It manages campaign timing, prevents duplicate sends, and maintains
        system cleanliness by removing old campaign data.
        <br />
        <br />
        💡 This demonstrates how cron steps handle time-based automation.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.closePanelButton }],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Scheduled Campaign Processing",
    description: () => (
      <p>
        The scheduler retrieves all scheduled campaigns from state and checks if
        they're ready to be sent based on their scheduled time.
        <br />
        <br />
        This automated processing ensures campaigns are delivered exactly when
        marketers intend them to be sent.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.previewButton("emailscheduler"),
      },
      {
        type: "click",
        selector: workbenchXPath.flows.feature("scheduled-campaign-check"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Campaign Cleanup",
    description: () => (
      <p>
        The system cleans up old triggered campaigns and removes completed
        campaigns older than 24 hours to maintain state hygiene.
        <br />
        <br />
        This cleanup process prevents state bloat and ensures optimal system
        performance over time.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("cleanup-logic"),
      },
    ],
  },

  // Analytics Tracker

  {
    elementXpath: workbenchXPath.flows.node("emailanalyticstracker"),
    title: "Email Analytics Tracker",
    description: () => (
      <p>
        The <b>Email Analytics Tracker</b> monitors email engagement and tracks
        comprehensive metrics across the entire email automation system.
        <br />
        <br />
        It subscribes to multiple email events (delivered, opened, clicked,
        bounced) and maintains detailed analytics for campaign performance
        optimization.
        <br />
        <br />
        💡 This step showcases real-time analytics and milestone detection.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.closePanelButton }],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Email Metrics Management",
    description: () => (
      <p>
        The system creates and updates email metrics for individual emails,
        tracking status changes and event timestamps.
        <br />
        <br />
        This granular tracking provides detailed insights into email performance
        at both individual and campaign levels.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.previewButton("emailanalyticstracker"),
      },
      {
        type: "click",
        selector: workbenchXPath.flows.feature("email-metrics-tracking"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Campaign Analytics Update",
    description: () => (
      <p>
        Campaign-level analytics are updated with aggregated metrics and
        calculated performance rates (delivery, open, click rates).
        <br />
        <br />
        These aggregated metrics provide marketers with clear visibility into
        campaign performance and ROI.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("campaign-analytics"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Engagement Milestone Detection",
    description: () => (
      <p>
        The system detects engagement milestones and triggers milestone events
        when performance thresholds are reached.
        <br />
        <br />
        This enables automated responses to high-performing campaigns and alerts
        for underperforming ones.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("engagement-milestones"),
      },
    ],
  },

  // Webhook Handler

  {
    elementXpath: workbenchXPath.flows.node("webhookhandler"),
    title: "Multi-Provider Webhook Handler",
    description: () => (
      <p>
        The <b>Webhook Handler</b> processes webhooks from various email service
        providers and external systems with comprehensive event mapping and
        security.
        <br />
        <br />
        It supports multiple providers (SendGrid, Resend, Mailgun, Stripe) and
        maps provider-specific events to standardized internal events.
        <br />
        <br />
        💡 This demonstrates enterprise-grade webhook processing and security.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.closePanelButton }],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Webhook Signature Verification",
    description: () => (
      <p>
        The system verifies webhook authenticity using cryptographic signatures
        for different email service providers ensuring secure webhook
        processing.
        <br />
        <br />
        This security layer prevents unauthorized webhook requests and protects
        the system from malicious attacks.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.previewButton("webhookhandler"),
      },
      {
        type: "click",
        selector: workbenchXPath.flows.feature("webhook-verification"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Multi-Provider Processing",
    description: () => (
      <p>
        The webhook processor handles different email service providers with
        provider-specific event mapping and data extraction.
        <br />
        <br />
        This unified approach allows the system to work with multiple email
        providers while maintaining consistent internal processing.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("multi-provider-processing"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Email Event Mapping",
    description: () => (
      <p>
        Provider-specific events are mapped to standardized email events
        (delivered, opened, clicked, bounced, unsubscribed) for consistent
        processing.
        <br />
        <br />
        This standardization ensures that analytics and automation work
        consistently regardless of the email provider used.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("email-event-mapping"),
      },
    ],
  },

  // Behavioral Triggers

  {
    elementXpath: workbenchXPath.flows.node("behavioraltriggerengine"),
    title: "Behavioral Trigger Engine",
    description: () => (
      <p>
        The <b>Behavioral Trigger Engine</b> processes user behavior patterns
        and initiates targeted email campaigns based on specific triggers.
        <br />
        <br />
        It handles cart abandonment, inactivity detection, high engagement
        recognition, and purchase readiness signals for automated marketing.
        <br />
        <br />
        💡 This showcases advanced behavioral marketing automation.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.closePanelButton }],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Campaign Condition Evaluation",
    description: () => (
      <p>
        The system evaluates behavioral campaigns against user conditions
        including engagement scores, purchase history, and cart values.
        <br />
        <br />
        This sophisticated evaluation ensures that behavioral triggers are fired
        only when specific conditions are met.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.previewButton("behavioraltriggerengine"),
      },
      {
        type: "click",
        selector: workbenchXPath.flows.feature("campaign-evaluation"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Campaign Cooldown Management",
    description: () => (
      <p>
        Cooldown periods prevent spam and ensure users don't receive the same
        behavioral campaign too frequently.
        <br />
        <br />
        This responsible approach maintains good customer relationships and
        prevents email fatigue.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("cooldown-management"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Behavioral Content Generation",
    description: () => (
      <p>
        The system generates personalized email content for different behavioral
        triggers including cart abandonment, inactivity, and purchase readiness.
        <br />
        <br />
        Each trigger type has specialized content templates that are
        personalized based on user data and behavior patterns.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("content-personalization"),
      },
    ],
  },

  // User Activity Tracking

  {
    elementXpath: workbenchXPath.flows.node("useractivitytracker"),
    title: "User Activity Tracker",
    description: () => (
      <p>
        The <b>User Activity Tracker</b> monitors user behavior patterns and
        maintains engagement profiles for behavioral trigger detection.
        <br />
        <br />
        It tracks various user activities and calculates engagement scores that
        feed into the behavioral trigger engine and segmentation system.
        <br />
        <br />
        💡 This creates the data foundation for behavioral marketing.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.closePanelButton }],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Behavior Profile Management",
    description: () => (
      <p>
        The system creates and updates user behavior profiles with engagement
        scores, activity counts, and behavioral triggers.
        <br />
        <br />
        These profiles provide a comprehensive view of user engagement and
        enable sophisticated behavioral targeting.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.previewButton("useractivitytracker"),
      },
      {
        type: "click",
        selector: workbenchXPath.flows.feature("behavior-profile"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Engagement Score Calculation",
    description: () => (
      <p>
        Engagement scores are calculated based on user activities with weighted
        scoring for different activity types and engagement levels.
        <br />
        <br />
        This scoring system enables precise targeting based on user engagement
        levels and behavioral patterns.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("engagement-scoring"),
      },
    ],
  },

  // Daily Analytics Report

  {
    elementXpath: workbenchXPath.flows.node("dailyanalyticsreport"),
    title: "Daily Analytics Report",
    description: () => (
      <p>
        The <b>Daily Analytics Report</b> generates comprehensive daily reports
        with campaign metrics, system insights, and performance analytics.
        <br />
        <br />
        Running daily at 6 AM, it aggregates data from all system components and
        provides executive-level reporting and anomaly detection.
        <br />
        <br />
        💡 This showcases enterprise reporting and business intelligence.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.closePanelButton }],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Metrics Aggregation",
    description: () => (
      <p>
        The system aggregates metrics from multiple sources including campaigns,
        emails, users, and behavioral data for comprehensive reporting.
        <br />
        <br />
        This creates a unified view of system performance and business metrics
        for stakeholder reporting.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.previewButton("dailyanalyticsreport"),
      },
      {
        type: "click",
        selector: workbenchXPath.flows.feature("metrics-aggregation"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Anomaly Detection System",
    description: () => (
      <p>
        The system detects performance anomalies and generates alerts for
        delivery rate drops, bounce rate spikes, and system health issues.
        <br />
        <br />
        This proactive monitoring helps maintain system health and prevents
        issues before they impact campaign performance.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("anomaly-detection"),
      },
    ],
  },

  // Testing the System

  {
    elementXpath: workbenchXPath.links.endpoints,
    title: "Testing Campaign Creation",
    description: () => (
      <p>
        Now let's test the email automation system! Click on the{" "}
        <b>Endpoints</b> section to access the campaign creation API.
        <br />
        <br />
        You'll be able to create test campaigns with different audience types,
        templates, and scheduling options to see the complete workflow in
        action.
        <br />
        <br />
        💡 Make sure your email provider credentials are configured for full
        testing.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.closePanelButton }],
  },
  {
    elementXpath: workbenchXPath.endpoints.endpoint("POST", "/campaigns"),
    title: "Campaign Creation Endpoint",
    description: () => (
      <p>
        This is the main campaign creation endpoint. Click on it to open the
        testing interface where you can create various types of email campaigns.
        <br />
        <br />
        The endpoint accepts POST requests with JSON payloads containing
        campaign configuration, target audience, and scheduling information.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.links.endpoints }],
  },
  {
    elementXpath: workbenchXPath.endpoints.callPanel,
    title: "Campaign Testing Interface",
    description: () => (
      <p>
        Use this form to test different campaign scenarios:
        <br />
        <br />• <b>Immediate campaigns</b> - Process and send immediately
        <br />• <b>Scheduled campaigns</b> - Schedule for future delivery
        <br />• <b>Different audiences</b> - Test segmentation logic
        <br />• <b>Various templates</b> - Test personalization features
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.endpoints.endpoint("POST", "/campaigns"),
      },
      { type: "click", selector: workbenchXPath.endpoints.callTab },
    ],
  },
  {
    elementXpath: workbenchXPath.endpoints.playButton,
    title: "Create Test Campaign",
    description: () => (
      <p>
        Click the <b>Play</b> button to create your test campaign.
        <br />
        <br />
        You'll receive a response with campaign details including ID, status,
        and trace ID for tracking the campaign through the automation workflow.
      </p>
    ),
    before: [
      {
        type: "fill-editor",
        content: {
          name: "Test Email Campaign",
          subject: "Welcome to our platform!",
          template: "welcome",
          targetAudience: "new_users",
          sendImmediately: true,
        },
      },
    ],
  },
  {
    elementXpath: workbenchXPath.endpoints.response,
    title: "Campaign Response",
    description: () => (
      <p>
        Once your campaign is created, you'll see the response containing:
        <br />
        <br />• <b>Campaign ID</b> - Unique identifier for tracking
        <br />• <b>Status</b> - Current campaign status
        <br />• <b>Creation time</b> - When the campaign was created
        <br />
        <br />
        The email automation workflow is now running asynchronously!
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.endpoints.playButton }],
  },

  // Observability

  {
    elementXpath: workbenchXPath.links.tracing,
    title: "Email Workflow Observability",
    description: () => (
      <p>
        After creating a campaign, use Motia's observability tools to track the
        complete email automation workflow.
        <br />
        <br />
        The <b>Tracing</b> section shows how your campaign flows through each
        step: creation → segmentation → personalization → delivery → analytics.
        <br />
        <br />
        Each step is traced with detailed timing and performance information.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.links.tracing }],
  },
  {
    elementXpath: workbenchXPath.tracing.trace(1),
    title: "Email Automation Workflow Trace",
    description: () => (
      <p>
        Click on the most recent trace to see the complete email automation
        workflow execution.
        <br />
        <br />
        You'll see each step's execution time, success status, and detailed logs
        for the entire campaign processing pipeline.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.tracing.trace(1) }],
  },
  {
    elementXpath: workbenchXPath.tracing.details,
    title: "Step-by-Step Campaign Analysis",
    description: () => (
      <p>
        The trace timeline shows exactly how your campaign moved through the
        automation pipeline:
        <br />
        <br />
        1. <b>CreateCampaign</b> - Initial campaign creation
        <br />
        2. <b>UserSegmentation</b> - Audience targeting and filtering
        <br />
        3. <b>ContentPersonalization</b> - AI-powered content generation
        <br />
        4. <b>EmailDelivery</b> - Batch processing and sending
        <br />
        5. <b>EmailAnalyticsTracker</b> - Performance monitoring
        <br />
        <br />
        Click on any step to see detailed execution information.
      </p>
    ),
  },

  // State Management

  {
    elementXpath: workbenchXPath.links.states,
    title: "Campaign State Management",
    description: () => (
      <p>
        The <b>State Management</b> tool shows all persisted data from your
        email automation workflows.
        <br />
        <br />
        Campaign data, user segments, personalized content, and analytics are
        all stored with structured keys for easy access and debugging.
        <br />
        <br />
        This provides complete visibility into the campaign lifecycle and
        enables advanced debugging and monitoring.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.links.states }],
  },
  {
    elementXpath: workbenchXPath.states.container,
    title: "Campaign Data",
    description: () => (
      <p>
        Click on any campaign entry to see comprehensive campaign data
        including:
        <br />
        <br />
        • Campaign configuration and metadata
        <br />
        • Segmented user lists and targeting criteria
        <br />
        • Personalized email content for each recipient
        <br />
        • Delivery status and performance metrics
        <br />
        • Analytics and engagement tracking data
        <br />
        <br />
        This complete data model supports advanced campaign management and
        performance analysis.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.states.row(1) }],
  },

  // Conclusion

  {
    title: "Email Marketing Automation Complete! 🎉",
    link: "https://www.motia.dev/docs",
    description: () => (
      <p>
        Congratulations! You've built a comprehensive email marketing automation
        engine with enterprise-grade features:
        <br />
        <br />✅ <b>Campaign Management</b> - Full lifecycle campaign handling
        <br />✅ <b>User Segmentation</b> - Advanced audience targeting
        <br />✅ <b>AI Personalization</b> - Intelligent content generation
        <br />✅ <b>Multi-language Support</b> - Python and TypeScript steps
        <br />✅ <b>Behavioral Triggers</b> - Automated behavioral marketing
        <br />✅ <b>Analytics & Reporting</b> - Comprehensive performance
        tracking
        <br />✅ <b>Multi-provider Support</b> - Flexible email service
        integration
        <br />✅ <b>Compliance Features</b> - GDPR and CAN-SPAM compliance
        <br />
        <br />
        This system can handle enterprise-scale email marketing with advanced
        automation, personalization, and analytics capabilities.
        <br />
        <br />
        Ready to build more? Explore other Motia examples or create your own
        automation workflows. Join our{" "}
        <a
          href="https://discord.com/invite/nJFfsH5d6v"
          target="_blank"
          rel="noopener noreferrer"
        >
          Discord
        </a>{" "}
        community to share your implementations!
      </p>
    ),
  },
];
