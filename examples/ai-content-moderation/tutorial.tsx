import { workbenchXPath, TutorialStep } from "@motiadev/workbench";

export const steps: TutorialStep[] = [
  {
    title: "AI Content Moderation with Human-in-the-Loop",
    image: {
      height: 200,
      src: "https://github.com/MotiaDev/motia-examples/blob/main/examples/ai-content-moderation/assets/workflow.png?raw=true",
    },
    description: () => (
      <p>
        Welcome to the AI Content Moderation tutorial! This system demonstrates
        how to build a comprehensive content moderation pipeline that combines
        AI analysis with human review through Slack integration.
        <br />
        <br />
        You'll learn how to process user-generated content (text and image
        URLs), analyze it with AI, route decisions based on confidence scores,
        and enable human moderators to review uncertain content through
        interactive Slack messages.
        <br />
        <br />
        💡 This example showcases event-driven architecture, state management,
        and third-party integrations.
      </p>
    ),
  },

  // Content Submission API

  {
    elementXpath: workbenchXPath.flows.node("contentsubmitapi"),
    title: "Content Submission API",
    link: "https://www.motia.dev/docs/concepts/steps/api",
    description: () => (
      <p>
        Let's start with the entry point of our moderation system - the{" "}
        <b>Content Submit API</b>.
        <br />
        <br />
        This API endpoint receives user-generated content for moderation. It
        accepts both text and image URLs, along with metadata like user ID and
        platform information.
        <br />
        <br />
        The endpoint immediately emits a <code>content.submitted</code> event to
        trigger the moderation workflow.
      </p>
    ),
    before: [
      { type: "click", selector: workbenchXPath.links.flows },
      {
        type: "click",
        selector: workbenchXPath.flows.dropdownFlow("content-moderation"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.flows.previewButton("contentsubmitapi"),
    title: "Code Preview",
    description: () => (
      <p>
        Click on this icon to visualize the source code for the Content Submit
        API step.
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
    title: "Step Configuration",
    description: () => (
      <p>
        The API step is configured with a flexible schema that supports both
        text and image content moderation.
        <br />
        <br />
        The configuration includes the endpoint definition, request body schema,
        and event emission setup for the moderation workflow.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.previewButton("contentsubmitapi"),
      },
      {
        type: "click",
        selector: workbenchXPath.flows.feature("step-configuration"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "API Endpoint Definition",
    description: () => (
      <p>
        The API step is configured as a POST endpoint at{" "}
        <code>/content/submit</code> that accepts content moderation requests
        and emits events for async processing.
        <br />
        <br />
        Notice how the <b>emits</b> array declares the{" "}
        <code>content.submitted</code> topic that will trigger the downstream AI
        analysis step.
      </p>
    ),
    before: [
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
        The bodySchema defines the structure for content submissions through a
        Zod schema that supports:
        <br />
        <br />• <b>text</b> - Optional text content to moderate
        <br />• <b>imageUrl</b> - Optional image URL for visual content
        moderation
        <br />• <b>userId</b> - Required user identifier for tracking
        <br />• <b>platform</b> - Source platform (web, mobile, etc.)
        <br />
        <br />
        Content can include text, images, or both, making the system flexible
        for various content types.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("request-body"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Event Emission",
    description: () => (
      <p>
        The API emits <code>content.submitted</code> events to trigger the
        moderation workflow asynchronously.
        <br />
        <br />
        This event-driven architecture allows the system to process content
        asynchronously while immediately responding to the client with a
        submission confirmation.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("event-driven-architecture"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Request Handler",
    description: () => (
      <p>
        The handler processes content submissions, generates unique IDs, and
        triggers the moderation workflow via events.
        <br />
        <br />
        It extracts the content data, validates it against the schema, and
        prepares it for the AI analysis pipeline.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("handler"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Submission ID Generation",
    description: () => (
      <p>
        The system creates unique submission identifiers using timestamp and
        random string for tracking throughout the workflow.
        <br />
        <br />
        The submission ID follows the pattern:{" "}
        <code>sub_[timestamp]_[randomString]</code>
        <br />
        <br />
        💡 This ID serves as a unique identifier throughout the entire
        moderation workflow.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("submission-id-generation"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Structured Logging",
    description: () => (
      <p>
        The system logs submission details with structured data including
        content types and user information for observability.
        <br />
        <br />
        This logging helps with debugging, monitoring, and understanding content
        submission patterns across your platform.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("logger"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Workflow Trigger",
    description: () => (
      <p>
        After processing the submission, the API emits a structured event
        containing all submission data to start the AI analysis and moderation
        workflow asynchronously.
        <br />
        <br />
        The event includes the submission ID, content, user information, and
        metadata needed by downstream steps.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("event-emission"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "API Response",
    description: () => (
      <p>
        The API returns a confirmation response with the submission ID, allowing
        clients to track their content through the moderation process.
        <br />
        <br />
        This immediate response ensures good user experience while the actual
        moderation happens asynchronously in the background.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("http-response"),
      },
    ],
  },

  // Content Analyzer

  {
    elementXpath: workbenchXPath.flows.node("contentanalyzer"),
    title: "AI Content Analysis",
    description: () => (
      <p>
        The <b>Content Analyzer</b> is the brain of our moderation system. It
        subscribes to
        <code>content.submitted</code> events and uses OpenAI's APIs to analyze
        content for safety.
        <br />
        <br />
        For text content, it uses the Moderation API to detect toxicity,
        harassment, violence, and other harmful content. For images, it
        leverages GPT-4 Vision to identify inappropriate visual content.
        <br />
        <br />
        💡 The analyzer handles both content types and combines their risk
        scores for an overall assessment.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.closePanelButton }],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Event Step Configuration",
    description: () => (
      <p>
        The analyzer is configured as an event step that subscribes to
        content.submitted events and performs AI analysis using OpenAI APIs.
        <br />
        <br />
        The step configuration includes subscription setup, handler definition,
        and event emission for downstream processing.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.previewButton("contentanalyzer"),
      },
      {
        type: "click",
        selector: workbenchXPath.flows.feature("step-configuration"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Input Schema",
    description: () => (
      <p>
        The input schema defines the expected structure of content submission
        data received from the content.submitted topic.
        <br />
        <br />
        This ensures type safety and validates that the analyzer receives all
        necessary data for content analysis including text, images, and
        metadata.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("input-schema"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "OpenAI Client Setup",
    description: () => (
      <p>
        The analyzer initializes an OpenAI client using the API key from
        environment variables.
        <br />
        <br />
        This client will be used for both text moderation analysis and image
        safety analysis using different OpenAI endpoints.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("openai-initialization"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Text Content Analysis",
    description: () => (
      <p>
        For text content, the analyzer uses OpenAI's Moderation API to analyze
        text content for toxicity, harassment, violence, and other harmful
        content.
        <br />
        <br />
        The analysis provides detailed category scores and flagged status for
        comprehensive safety assessment.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("text-analysis"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Moderation API Call",
    description: () => (
      <p>
        The system calls OpenAI's moderation endpoint to get toxicity scores and
        flagged categories for text content.
        <br />
        <br />
        The API returns detailed results including:
        <br />• <b>Category scores</b> - Numerical risk assessment (0-1)
        <br />• <b>Flagged status</b> - Binary safe/unsafe determination
        <br />• <b>Category classification</b> - Specific violation types
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("text-moderation-api"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Text Analysis Processing",
    description: () => (
      <p>
        The system processes moderation results to extract toxicity scores,
        flagged categories, and confidence levels.
        <br />
        <br />
        The processing captures the maximum category score as the overall text
        risk level and prepares structured data for decision making.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("text-analysis-processing"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Image Content Analysis",
    description: () => (
      <p>
        For image content, the system uses GPT-4 Vision to analyze images for
        inappropriate visual content including violence, sexual content, and
        hate symbols.
        <br />
        <br />
        The vision analysis provides comprehensive safety assessment for visual
        content moderation.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("image-analysis"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Vision API Prompt",
    description: () => (
      <p>
        The system uses a structured prompt that instructs GPT-4 Vision to
        analyze images for specific types of inappropriate content:
        <br />
        <br />
        • Violence, gore, or weapons
        <br />
        • Sexual or suggestive content
        <br />
        • Hate symbols or offensive imagery
        <br />
        • Harassment or bullying content
        <br />• Illegal activities
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("vision-api-prompt"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Vision API Call",
    description: () => (
      <p>
        The system makes an API call to GPT-4 Vision with the image and
        moderation prompt, requesting a structured JSON response.
        <br />
        <br />
        The API returns safety scores and violation categories in a format
        optimized for automated decision making.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("vision-api-call"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Image Analysis Processing",
    description: () => (
      <p>
        The system processes the vision API response to extract safety scores,
        unsafe flags, and content categories.
        <br />
        <br />
        This processing ensures consistent scoring across text and image
        analysis for unified decision making.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("image-analysis-processing"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Overall Score Calculation",
    description: () => (
      <p>
        The analyzer combines text and image analysis scores to determine an
        overall risk level and recommendation.
        <br />
        <br />
        The system takes the maximum score from text and image analysis to
        ensure the highest risk is properly identified.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("score-calculation"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Recommendation Logic",
    description: () => (
      <p>
        The system applies threshold-based logic to determine whether content
        should be approved, reviewed, or rejected:
        <br />
        <br />
        • Generates approve/review/reject recommendations
        <br />
        • Uses configurable confidence thresholds
        <br />• Ensures consistent decision making across content types
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("recommendation-logic"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "State Persistence",
    description: () => (
      <p>
        The analyzer stores the original submission data in Motia's state
        management system using the key pattern{" "}
        <code>submission:submissionId</code>.
        <br />
        <br />
        This allows later steps in the workflow to access the original content,
        user information, and submission metadata when making decisions or
        sending notifications.
        <br />
        <br />
        💡 State management ensures data persistence across the entire async
        workflow.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("state-management"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Analysis Results Event",
    description: () => (
      <p>
        After completing the analysis, the system emits a content.analyzed event
        with AI analysis results, scores, and recommendations for routing
        decisions.
        <br />
        <br />
        This event contains all the data needed by the content router to make
        informed decisions about the moderation workflow.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("analysis-event-emission"),
      },
    ],
  },
  // Content Router

  {
    elementXpath: workbenchXPath.flows.node("contentrouter"),
    title: "Decision Routing Logic",
    description: () => (
      <p>
        The <b>Content Router</b> makes intelligent routing decisions based on
        AI confidence scores. It subscribes to <code>content.analyzed</code>{" "}
        events and determines whether content should be:
        <br />
        <br />• <b>Auto-approved</b> - Very low risk content (≤5%)
        <br />• <b>Auto-rejected</b> - Very high risk content (≥95%)
        <br />• <b>Human review</b> - Uncertain content (5-95%)
        <br />
        <br />
        This confidence-based routing ensures human moderators focus on
        genuinely ambiguous cases.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.closePanelButton }],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Router Step Configuration",
    description: () => (
      <p>
        The router is configured as an event step that routes content based on
        AI analysis confidence scores to determine auto-action vs human review.
        <br />
        <br />
        The step configuration includes subscription to content.analyzed events
        and emission setup for routing decisions.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.previewButton("contentrouter"),
      },
      {
        type: "click",
        selector: workbenchXPath.flows.feature("step-configuration"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Analysis Input Schema",
    description: () => (
      <p>
        The input schema accepts complex AI analysis results including text
        analysis, image analysis, scores, and error states.
        <br />
        <br />
        This comprehensive schema ensures the router receives all necessary data
        to make informed routing decisions across different content types and
        analysis outcomes.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("input-schema"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Confidence Thresholds",
    description: () => (
      <p>
        The router uses configurable confidence thresholds to make routing
        decisions:
        <br />
        <br />
        <code>if (overallScore ≤ 0.05)</code> → Auto-approve (very safe content)
        <br />
        <code>else if (overallScore ≥ 0.95)</code> → Auto-reject (clearly
        harmful)
        <br />
        <code>else</code> → Human review required
        <br />
        <br />
        These thresholds can be adjusted based on your platform's risk tolerance
        and moderation capacity.
        <br />
        <br />
        💡 The wide human review range (5-95%) in this demo ensures you'll see
        the Slack integration in action.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("confidence-thresholds"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Auto-Approval Logic",
    description: () => (
      <p>
        Very low risk content (≤5%) is automatically approved without human
        intervention.
        <br />
        <br />
        This automation handles obviously safe content efficiently, reducing the
        moderation workload for human reviewers while maintaining safety.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("auto-approval-logic"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Auto-Rejection Logic",
    description: () => (
      <p>
        Very high risk content (≥95%) is automatically rejected without human
        intervention.
        <br />
        <br />
        This ensures clearly harmful content is blocked immediately, protecting
        users while reducing the burden on human moderators.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("auto-rejection-logic"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Human Review Routing",
    description: () => (
      <p>
        Uncertain content (5-95% risk) is routed to human moderators for review
        via Slack.
        <br />
        <br />
        This ensures that ambiguous cases receive human judgment, combining AI
        efficiency with human expertise for optimal moderation outcomes.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("human-review-logic"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Decision Variables",
    description: () => (
      <p>
        The router tracks local variables including the routing decision,
        confidence level, reason, and whether it's an automatic decision.
        <br />
        <br />
        These variables ensure consistent decision tracking and provide context
        for downstream steps in the moderation workflow.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("decision-variables"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Reason Generation",
    description: () => (
      <p>
        The router includes a helper function that generates human-readable
        explanations for routing decisions based on analysis results.
        <br />
        <br />
        These explanations help moderators understand why content was flagged
        and provide context for their review decisions.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("reason-generation"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Routing Decision Event",
    description: () => (
      <p>
        The router emits content.needsReview events with routing decision and
        confidence information for the Slack notifier.
        <br />
        <br />
        This event contains all the data needed to send appropriate
        notifications and trigger the next step in the moderation workflow.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("routing-event-emission"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Confidence Calculation",
    description: () => (
      <p>
        The system calculates confidence levels differently for auto-decisions
        vs human review needs.
        <br />
        <br />
        This nuanced approach ensures appropriate confidence reporting for
        different decision types and helps optimize the human review workflow.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("confidence-calculation"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Decision Logging",
    description: () => (
      <p>
        The router logs routing decisions with submission ID, decision type, and
        confidence levels for audit trails.
        <br />
        <br />
        This logging provides complete visibility into the decision-making
        process and supports compliance and monitoring requirements.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("logger"),
      },
    ],
  },

  // Slack Notifier

  {
    elementXpath: workbenchXPath.flows.node("slacknotifier"),
    title: "Slack Integration",
    description: () => (
      <p>
        The <b>Slack Notifier</b> handles human review workflows by sending
        interactive messages to Slack channels.
        <br />
        <br />
        For auto-decisions, it simply logs the outcome. For human review cases,
        it creates rich Slack messages with the content preview, risk
        assessment, and interactive buttons for moderator actions.
        <br />
        <br />
        💡 This eliminates the need for a custom moderation dashboard - your
        team can moderate content directly from their existing Slack workspace.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.closePanelButton }],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Slack Notifier Configuration",
    description: () => (
      <p>
        The Slack Notifier is configured as an event step that handles Slack
        notifications for human review with virtual events for button
        interactions.
        <br />
        <br />
        The step configuration includes subscription to content.needsReview
        events and setup for interactive Slack messaging.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.previewButton("slacknotifier"),
      },
      {
        type: "click",
        selector: workbenchXPath.flows.feature("step-configuration"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Slack Client Initialization",
    description: () => (
      <p>
        The notifier initializes a Slack Web API client using the bot token from
        environment variables.
        <br />
        <br />
        This client enables the system to send interactive messages to Slack
        channels and manage notifications for the moderation team.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("slack-client-init"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Original Data Retrieval",
    description: () => (
      <p>
        The system retrieves original submission data from state to access text
        content and image URLs for display in Slack messages.
        <br />
        <br />
        This ensures that moderators can see the actual content that was
        submitted, providing complete context for their review decisions.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("state-retrieval"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Submission State Update",
    description: () => (
      <p>
        The system updates submission state with routing decision and combines
        with original submission data.
        <br />
        <br />
        This creates a comprehensive record that includes both the original
        content and the AI analysis results for complete workflow tracking.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("state-update"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Auto-Decision Processing",
    description: () => (
      <p>
        For automatic decisions, the system logs the outcome and marks as
        completed without sending Slack notifications.
        <br />
        <br />
        This efficient approach ensures that only content requiring human review
        generates Slack messages, reducing notification noise for the moderation
        team.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("auto-decision-handling"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Channel Prioritization",
    description: () => (
      <p>
        Content is routed to different Slack channels based on risk level:
        <br />
        <br />• <b>High risk (≥70%)</b> → Urgent channel (#content-urgent)
        <br />• <b>Medium risk (50-70%)</b> → Escalated channel
        (#content-escalated)
        <br />• <b>Low risk (&lt;50%)</b> → Normal channel (#content-moderation)
        <br />
        <br />
        This ensures high-priority content gets immediate attention from your
        moderation team.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("channel-selection"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Interactive Slack Message",
    description: () => (
      <p>
        The system creates rich Slack messages with content preview, risk
        assessment, and interactive action buttons.
        <br />
        <br />
        These messages provide all the information moderators need to make
        informed decisions without leaving Slack.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("slack-message-structure"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Message Header",
    description: () => (
      <p>
        The message includes a dynamic header that shows priority level based on
        risk score (High, Normal, Low).
        <br />
        <br />
        This visual indicator helps moderators quickly identify the urgency of
        each content review request.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("message-header"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Content Metadata Display",
    description: () => (
      <p>
        The message shows submission ID, risk score, confidence level, and
        timestamp in a structured format.
        <br />
        <br />
        This metadata provides moderators with key information about the
        analysis results and submission details for context.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("content-metadata"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Text Content Preview",
    description: () => (
      <p>
        The system conditionally displays text content in code blocks if present
        in the submission.
        <br />
        <br />
        This formatting makes it easy for moderators to read and review text
        content while keeping it visually distinct from the message metadata.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("text-content-display"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Image Content Display",
    description: () => (
      <p>
        The system conditionally displays image content inline if an image URL
        is present in the submission.
        <br />
        <br />
        This allows moderators to visually review image content directly within
        Slack for comprehensive content assessment.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("image-content-display"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Interactive Action Buttons",
    description: () => (
      <p>
        The message includes three action buttons (Approve ✅, Reject ❌,
        Escalate 🔺) with JSON payloads for webhook processing.
        <br />
        <br />
        Moderators can make decisions with a single click, and the system tracks
        who made each decision through the webhook handler.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("action-buttons"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Message State Tracking",
    description: () => (
      <p>
        The system stores Slack message details (channel, timestamp) in state
        for webhook handler access.
        <br />
        <br />
        This enables the webhook handler to update the original message when
        moderators take actions, providing a complete audit trail.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("message-state-update"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Notification Error Handling",
    description: () => (
      <p>
        The system handles Slack API errors gracefully and marks submissions as
        notification_failed in state.
        <br />
        <br />
        This ensures that technical issues with Slack don't prevent the
        moderation workflow from completing and provides visibility into
        notification failures.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("error-handling"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Priority Title Generation",
    description: () => (
      <p>
        The system includes a helper function that generates appropriate
        priority titles with emojis based on risk scores.
        <br />
        <br />
        This visual prioritization helps moderators quickly identify high-risk
        content that needs immediate attention.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("priority-titles"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Slack Logging",
    description: () => (
      <p>
        The system includes comprehensive logging for Slack operations including
        message sending and error tracking.
        <br />
        <br />
        This logging provides visibility into notification success rates and
        helps troubleshoot issues with the Slack integration.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("logger"),
      },
    ],
  },

  // Slack Webhook

  {
    elementXpath: workbenchXPath.flows.node("slackwebhook"),
    title: "Webhook Handler",
    description: () => (
      <p>
        The <b>Slack Webhook</b> API endpoint handles interactive button
        responses from Slack.
        <br />
        <br />
        When moderators click Approve, Reject, or Escalate buttons, Slack sends
        a webhook payload containing the action details and user information.
        <br />
        <br />
        This endpoint validates the Slack signature, processes the moderator's
        decision, and emits a <code>content.reviewed</code> event to trigger
        final actions.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.closePanelButton }],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Webhook API Configuration",
    description: () => (
      <p>
        The webhook is configured as an API endpoint that handles Slack
        interactive button responses with virtual subscriptions for button
        clicks.
        <br />
        <br />
        The endpoint configuration includes the webhook path, payload handling,
        and event emission setup for completing the moderation workflow.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.previewButton("slackwebhook"),
      },
      {
        type: "click",
        selector: workbenchXPath.flows.feature("step-configuration"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Webhook Input Schema",
    description: () => (
      <p>
        The webhook uses a simple schema that accepts Slack's payload parameter
        containing button interaction data.
        <br />
        <br />
        This minimal schema allows the webhook to receive the complete Slack
        payload while maintaining type safety for the moderation workflow.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("webhook-schema"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Request Debugging",
    description: () => (
      <p>
        The webhook includes comprehensive logging of webhook headers and
        payload for debugging Slack integration issues.
        <br />
        <br />
        This detailed logging helps troubleshoot webhook delivery issues and
        ensures proper integration with Slack's interactive messaging system.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("request-logging"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Security Verification",
    description: () => (
      <p>
        The webhook verifies Slack request signatures to ensure webhooks are
        authentic (bypassed in demo for testing).
        <br />
        <br />
        The verification includes:
        <br />• <b>Signature verification</b> - Validates requests are from
        Slack
        <br />• <b>Timestamp validation</b> - Prevents replay attacks
        <br />
        <br />
        💡 In production, enable full signature verification to ensure webhook
        security.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("signature-verification"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Slack Payload Processing",
    description: () => (
      <p>
        The webhook parses Slack's JSON payload to extract user information and
        button action details.
        <br />
        <br />
        This processing safely extracts the moderator's identity and the
        specific action they took from the Slack button interaction.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("payload-parsing"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Action Validation",
    description: () => (
      <p>
        The webhook validates that the request contains valid block_actions with
        button interaction data.
        <br />
        <br />
        This validation ensures that only legitimate button clicks from the
        moderation interface are processed by the system.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("action-validation"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Button Action Extraction",
    description: () => (
      <p>
        The webhook extracts submission ID and moderator action from the
        button's JSON value payload.
        <br />
        <br />
        This extraction process retrieves the specific submission being
        moderated and the action the moderator wants to take (approve, reject,
        or escalate).
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("action-extraction"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Submission State Lookup",
    description: () => (
      <p>
        The webhook retrieves submission data from state to validate the request
        and get context information.
        <br />
        <br />
        This lookup ensures that the submission exists and provides access to
        the original content and analysis results for the final decision
        processing.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("submission-retrieval"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Decision Mapping",
    description: () => (
      <p>
        The webhook maps Slack button actions (approve, reject, escalate) to
        moderation decisions and target channels.
        <br />
        <br />
        The mapping handles:
        <br />• <b>Approve</b> → Content approved for publication
        <br />• <b>Reject</b> → Content blocked/removed
        <br />• <b>Escalate</b> → Send to senior review team
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("action-mapping"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Review State Update",
    description: () => (
      <p>
        The webhook updates submission state with moderator decision, reviewer
        information, and timestamp.
        <br />
        <br />
        This state update creates a complete audit trail of who made the
        decision and when, providing accountability and traceability for all
        moderation actions.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("state-update"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Review Completion Event",
    description: () => (
      <p>
        The webhook emits content.reviewed events to trigger final action
        execution with decision details.
        <br />
        <br />
        This event contains all the information needed by the action executor to
        implement the moderator's decision and complete the workflow.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("final-event-emission"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Slack Response Message",
    description: () => (
      <p>
        The webhook returns formatted response to Slack confirming the
        moderator's action with timestamp.
        <br />
        <br />
        This response provides immediate feedback to the moderator in Slack,
        confirming that their action was processed successfully.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("slack-response"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Response Message Formatting",
    description: () => (
      <p>
        The webhook includes a helper function that generates appropriate
        response messages for each type of moderator action.
        <br />
        <br />
        These formatted responses provide clear confirmation of the action taken
        and help maintain a professional moderation interface.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("response-formatting"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Webhook Error Handling",
    description: () => (
      <p>
        The webhook includes comprehensive error handling that ensures webhook
        failures don't break the moderation workflow.
        <br />
        <br />
        This error handling maintains system reliability and provides graceful
        degradation when issues occur with the Slack integration.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("error-handling"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Webhook Logging",
    description: () => (
      <p>
        The webhook includes detailed logging of button clicks, user actions,
        and webhook processing for audit trails.
        <br />
        <br />
        This logging provides complete visibility into moderator actions and
        helps with compliance reporting and system monitoring.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("logger"),
      },
    ],
  },

  // Action Executor

  {
    elementXpath: workbenchXPath.flows.node("actionexecutor"),
    title: "Final Action Execution",
    description: () => (
      <p>
        The <b>Action Executor</b> is the final step that implements moderation
        decisions. It subscribes to <code>content.reviewed</code> events and
        executes the appropriate actions.
        <br />
        <br />
        This step would integrate with your platform's content management system
        to actually publish approved content, block rejected content, or route
        escalated content to senior review.
        <br />
        <br />
        💡 This separation allows you to customize action logic without changing
        the moderation workflow.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.closePanelButton }],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Final Action Executor",
    description: () => (
      <p>
        The Action Executor is configured as an event step that executes final
        moderation decisions and updates all stakeholders.
        <br />
        <br />
        This step configuration includes subscription to content.reviewed events
        and the complete workflow finalization logic.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.previewButton("actionexecutor"),
      },
      {
        type: "click",
        selector: workbenchXPath.flows.feature("step-configuration"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Review Decision Schema",
    description: () => (
      <p>
        The input schema accepts human review decisions with moderator
        information and Slack message details.
        <br />
        <br />
        This comprehensive schema ensures the executor receives all necessary
        data to complete the moderation workflow and update all stakeholders.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("input-schema"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Slack Client for Updates",
    description: () => (
      <p>
        The executor initializes a Slack client to update original messages with
        final decision status.
        <br />
        <br />
        This client enables the system to provide immediate feedback to
        moderators and maintain a complete audit trail in Slack.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("slack-client-init"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Final Submission Lookup",
    description: () => (
      <p>
        The executor retrieves complete submission data from state for final
        action execution.
        <br />
        <br />
        This lookup provides access to all the context needed to implement the
        moderation decision and complete the workflow.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("submission-retrieval"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Content Action Execution",
    description: () => (
      <p>
        The executor executes the actual moderation decision by calling the
        content action handler.
        <br />
        <br />
        This is where the system implements the moderator's decision by
        integrating with your platform's content management system.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("content-action-execution"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Platform Integration Points",
    description: () => (
      <p>
        The executor provides placeholder functions where you would integrate
        with your platform's content management system.
        <br />
        <br />
        These integration points can be customized for your specific platform
        and requirements, enabling seamless content moderation workflows.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("content-actions"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Content Publishing Logic",
    description: () => (
      <p>
        For approved content, this integration point would publish the content
        to your platform.
        <br />
        <br />
        This could involve API calls to your CMS, database updates, or other
        platform-specific operations to make the content live.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("approved-action"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Content Blocking Logic",
    description: () => (
      <p>
        For rejected content, this integration point would block or remove the
        content from your platform.
        <br />
        <br />
        This ensures harmful content is prevented from reaching users and can
        include quarantine or deletion operations.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("rejected-action"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Escalation Logic",
    description: () => (
      <p>
        For escalated content, this integration point would move content to a
        senior review queue.
        <br />
        <br />
        This enables multi-tier review processes where complex decisions can be
        elevated to more experienced moderators or specialized teams.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("escalated-action"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Slack Status Update",
    description: () => (
      <p>
        The executor updates the original Slack message to show final decision
        status and completion details.
        <br />
        <br />
        This provides immediate feedback to moderators and maintains a complete
        audit trail visible to your moderation team.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("slack-message-update"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Updated Message Structure",
    description: () => (
      <p>
        The executor creates updated Slack message blocks showing final status
        with:
        <br />
        <br />• <b>Final decision status</b> - Approved/Rejected/Escalated
        <br />• <b>Moderator information</b> - Who made the decision
        <br />• <b>Completion timestamp</b> - When action was executed
        <br />• <b>Execution confirmation</b> - Success/failure status
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("message-update-blocks"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Escalation Workflow",
    description: () => (
      <p>
        For escalated decisions, the executor sends new notification to senior
        review channel with context.
        <br />
        <br />
        This automated escalation ensures that complex content decisions reach
        the appropriate reviewers without manual intervention.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("escalation-notification"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Senior Review Message",
    description: () => (
      <p>
        The executor creates comprehensive escalation messages for senior
        moderators with:
        <br />
        <br />
        • Original content and analysis context
        <br />
        • Escalation reason and initial decision
        <br />
        • New action buttons for senior review
        <br />• Complete escalation chain tracking
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("escalation-message"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Workflow Completion",
    description: () => (
      <p>
        The executor updates final state to mark the moderation workflow as
        completed with all decision details.
        <br />
        <br />
        This final state update provides a complete record of the entire
        moderation process for compliance and analytics purposes.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("final-state-update"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Status Display Helpers",
    description: () => (
      <p>
        The executor includes helper functions that generate appropriate emojis
        and text for different decision outcomes.
        <br />
        <br />
        These helpers ensure consistent visual presentation across Slack
        messages and provide clear status indicators for moderators.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("status-helpers"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Execution Error Handling",
    description: () => (
      <p>
        The executor handles execution failures gracefully and marks workflow as
        failed in state for debugging.
        <br />
        <br />
        This error handling ensures system reliability and provides visibility
        into any issues with the final execution phase.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("error-handling"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Completion Logging",
    description: () => (
      <p>
        The executor logs successful workflow completion and any execution
        errors for monitoring and debugging.
        <br />
        <br />
        This logging provides complete visibility into the final execution phase
        and helps with system monitoring and troubleshooting.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("logger"),
      },
    ],
  },

  // Testing the System

  {
    elementXpath: workbenchXPath.links.endpoints,
    title: "Testing Content Submission",
    description: () => (
      <p>
        Now let's test the content moderation system! Click on the{" "}
        <b>Endpoints</b> section to access the content submission API.
        <br />
        <br />
        You'll be able to submit test content with both text and image URLs to
        see how the AI analysis and routing logic work in practice.
        <br />
        <br />
        💡 Make sure your Slack integration is configured to see the full human
        review workflow.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.closePanelButton }],
  },
  {
    elementXpath: workbenchXPath.endpoints.endpoint("POST", "/content/submit"),
    title: "Content Submission Endpoint",
    description: () => (
      <p>
        This is the main content submission endpoint. Click on it to open the
        testing interface where you can submit various types of content for
        moderation.
        <br />
        <br />
        The endpoint accepts POST requests with JSON payloads containing text,
        image URLs, or both.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.links.endpoints }],
  },
  {
    elementXpath: workbenchXPath.endpoints.callPanel,
    title: "Testing Interface",
    description: () => (
      <p>
        Use this form to test different content scenarios:
        <br />
        <br />• <b>Clean content</b> - Should be auto-approved
        <br />• <b>Borderline content</b> - Will trigger human review via Slack
        <br />• <b>Clearly harmful content</b> - Should be auto-rejected
        <br />• <b>Image URLs</b> - Test visual content moderation
        <br />
        <br />
        {/* Try submitting: <code>{"text": "This is a test message", "userId": "test123", "platform": "web"}</code> */}
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.endpoints.endpoint("POST", "/content/submit"),
      },
      { type: "click", selector: workbenchXPath.endpoints.callTab },
    ],
  },
  {
    elementXpath: workbenchXPath.endpoints.playButton,
    title: "Submit Test Content",
    description: () => (
      <p>
        Click the <b>Play</b> button to submit your test content to the
        moderation system.
        <br />
        <br />
        You'll receive a response with a submission ID that you can use to track
        the content through the moderation workflow.
      </p>
    ),
    before: [
      {
        type: "fill-editor",
        content: {
          text: "This is a test message for content moderation",
          userId: "test123",
          platform: "web",
        },
      },
    ],
  },
  {
    elementXpath: workbenchXPath.endpoints.response,
    title: "Submission Response",
    description: () => (
      <p>
        Once your content is submitted, you'll see the response containing:
        <br />
        <br />• <b>Submission ID</b> - Unique identifier for tracking
        <br />• <b>Confirmation message</b> - Success confirmation
        <br />
        <br />
        The moderation workflow is now running asynchronously in the background!
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.endpoints.playButton }],
  },

  // Observability

  {
    elementXpath: workbenchXPath.links.tracing,
    title: "Workflow Observability",
    description: () => (
      <p>
        After submitting content, use Motia's observability tools to track the
        moderation workflow.
        <br />
        <br />
        The <b>Tracing</b> section shows how your content flows through each
        step: submission → AI analysis → routing → Slack notification → human
        review → final action.
        <br />
        <br />
        Each step is traced with timing information and logs for complete
        visibility.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.links.tracing }],
  },
  {
    elementXpath: workbenchXPath.tracing.trace(1),
    title: "Moderation Workflow Trace",
    description: () => (
      <p>
        Click on the most recent trace to see the complete moderation workflow
        execution.
        <br />
        <br />
        You'll see each step's execution time, success status, and any logs
        generated during processing. This helps you understand the flow and
        debug any issues.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.tracing.trace(1) }],
  },
  {
    elementXpath: workbenchXPath.tracing.details,
    title: "Step-by-Step Analysis",
    description: () => (
      <p>
        The trace timeline shows you exactly how your content moved through the
        moderation pipeline:
        <br />
        <br />
        1. <b>ContentSubmitAPI</b> - Initial submission
        <br />
        2. <b>ContentAnalyzer</b> - AI analysis processing
        <br />
        3. <b>ContentRouter</b> - Decision routing logic
        <br />
        4. <b>SlackNotifier</b> - Human review notification
        <br />
        <br />
        Click on any step to see detailed logs and execution information.
      </p>
    ),
  },
  {
    elementXpath: workbenchXPath.tracing.timeline(1),
    title: "Timeline Analysis",
    description: () => (
      <p>
        Each timeline segment shows the execution time and status of individual
        steps.
        <br />
        <br />
        You can see how long AI analysis takes, when Slack notifications are
        sent, and identify any bottlenecks in your moderation pipeline.
      </p>
    ),
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Step Execution Details",
    description: () => (
      <p>
        Click on any timeline segment to see detailed execution information
        including:
        <br />
        <br />• <b>Step logs</b> - Debug and info messages
        <br />• <b>Input data</b> - What data the step received
        <br />• <b>Execution time</b> - Performance metrics
        <br />• <b>Error details</b> - If any issues occurred
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.tracing.timeline(1) }],
  },

  // State Management

  {
    elementXpath: workbenchXPath.links.states,
    title: "Moderation State Tracking",
    description: () => (
      <p>
        The <b>State Management</b> tool shows all persisted data from your
        moderation workflows.
        <br />
        <br />
        Each submission is stored with a key like{" "}
        <code>submission:sub_1234567890_abc123</code>
        containing the complete submission data, analysis results, and decision
        status.
        <br />
        <br />
        This provides a complete audit trail for compliance and debugging
        purposes.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.links.states }],
  },
  {
    elementXpath: workbenchXPath.states.container,
    title: "Submission Data",
    description: () => (
      <p>
        Click on any submission entry to see the complete moderation record
        including:
        <br />
        <br />
        • Original content (text/image URLs)
        <br />
        • AI analysis results and scores
        <br />
        • Routing decisions and confidence levels
        <br />
        • Human review status and moderator information
        <br />
        • Final outcomes and timestamps
        <br />
        <br />
        This data structure supports compliance reporting and workflow
        analytics.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.states.row(1) }],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Audit Trail",
    description: () => (
      <p>
        Each state entry contains a complete audit trail showing:
        <br />
        <br />• <b>Submission details</b> - Original content and metadata
        <br />• <b>AI analysis</b> - Scores, categories, and confidence levels
        <br />• <b>Routing decisions</b> - Auto vs human review logic
        <br />• <b>Human actions</b> - Moderator decisions and timestamps
        <br />• <b>Final status</b> - Completion and execution details
        <br />
        <br />
        This supports compliance requirements and helps optimize your moderation
        processes.
      </p>
    ),
  },

  // Configuration & Deployment

  {
    title: "Production Configuration",
    description: () => (
      <p>
        To deploy this content moderation system in production, you'll need to
        configure:
        <br />
        <br />
        <b>OpenAI Integration:</b>
        <br />• Set <code>OPENAI_API_KEY</code> environment variable
        <br />
        • Configure rate limits and error handling
        <br />
        <br />
        <b>Slack Integration:</b>
        <br />• Set <code>SLACK_BOT_TOKEN</code> and{" "}
        <code>SLACK_SIGNING_SECRET</code>
        <br />• Configure webhook URL:{" "}
        <code>https://your-domain.com/slack/webhook</code>
        <br />
        • Set up moderation channels
        <br />
        <br />
        <b>Confidence Thresholds:</b>
        <br />
        • Adjust auto-approval/rejection thresholds in ContentRouter
        <br />• Configure channel routing based on risk levels
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.closePanelButton }],
  },

  // Conclusion

  {
    title: "Content Moderation Complete! 🎉",
    link: "https://www.motia.dev/docs/examples/ai-content-moderation",
    description: () => (
      <p>
        Congratulations! You've built a complete AI content moderation system
        with:
        <br />
        <br />✅ <b>AI analysis</b> - Text and image content detection
        <br />✅ <b>Smart routing</b> - Automatic decision making
        <br />✅ <b>Slack integration</b> - Human review for edge cases
        <br />✅ <b>Full tracking</b> - Complete workflow monitoring
        <br />✅ <b>Event-driven design</b> - Scalable async processing
        <br />
        <br />
        You can adapt this system for different content types and policies.
        <br />
        <br />
        Check out the{" "}
        <a
          href="https://github.com/MotiaDev/motia/tree/main/examples/ai-content-moderation"
          target="_blank"
          rel="noopener noreferrer"
        >
          source code
        </a>{" "}
        and join our{" "}
        <a
          href="https://discord.com/invite/nJFfsH5d6v"
          target="_blank"
          rel="noopener noreferrer"
        >
          Discord
        </a>{" "}
        to share your use cases!
        <br />
        <br />
        Ready to build more? Explore other Motia examples or create your own
        workflows.
      </p>
    ),
  },
];
