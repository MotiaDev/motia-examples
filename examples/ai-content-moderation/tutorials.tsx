import { workbenchXPath, TutorialStep } from '@motiadev/workbench'

export const steps: TutorialStep[] = [
  {
    title: 'AI Content Moderation with Human-in-the-Loop',
    image: {
      height: 200,
      src: 'https://github.com/MotiaDev/motia/raw/main/examples/ai-content-moderation/assets/workflow.png',
    },
    description: () => (
      <p>
        Welcome to the AI Content Moderation tutorial! This system demonstrates how to build a comprehensive 
        content moderation pipeline that combines AI analysis with human review through Slack integration.
        <br />
        <br />
        You'll learn how to process user-generated content (text and images), analyze it with AI, 
        route decisions based on confidence scores, and enable human moderators to review uncertain content 
        through interactive Slack messages.
        <br />
        <br />
        💡 This example showcases event-driven architecture, state management, and third-party integrations.
      </p>
    ),
  },

  // Content Submission API

  {
    elementXpath: workbenchXPath.flows.node('ContentSubmitAPI'),
    title: 'Content Submission Endpoint',
    link: 'https://www.motia.dev/docs/concepts/steps/api',
    description: () => (
      <p>
        Let's start with the entry point of our moderation system - the <b>Content Submit API</b>.
        <br />
        <br />
        This API endpoint receives user-generated content for moderation. It accepts both text and image content,
        along with metadata like user ID and platform information.
        <br />
        <br />
        The endpoint immediately emits a <code>content.submitted</code> event to trigger the moderation workflow.
      </p>
    ),
    before: [
      { type: 'click', selector: workbenchXPath.links.flows },
      { type: 'click', selector: workbenchXPath.flows.dropdownFlow('content-moderation') },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: 'Content Schema Definition',
    description: () => (
      <p>
        The API accepts flexible content submissions through a Zod schema that supports:
        <br />
        <br />
        • <b>text</b> - Optional text content to moderate
        <br />
        • <b>imageUrl</b> - Optional image URL for visual content moderation
        <br />
        • <b>userId</b> - Required user identifier for tracking
        <br />
        • <b>platform</b> - Source platform (web, mobile, etc.)
        <br />
        <br />
        Content can include text, images, or both, making the system flexible for various content types.
      </p>
    ),
    before: [
      { type: 'click', selector: workbenchXPath.flows.previewButton('ContentSubmitAPI') },
      { type: 'click', selector: workbenchXPath.flows.feature('request-body') },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: 'Event Emission',
    description: () => (
      <p>
        After receiving content, the API generates a unique <b>submissionId</b> and emits a 
        <code>content.submitted</code> event containing all the submission data.
        <br />
        <br />
        This event-driven approach allows the system to process content asynchronously while 
        immediately responding to the client with a submission confirmation.
        <br />
        <br />
        💡 The submission ID serves as a unique identifier throughout the entire moderation workflow.
      </p>
    ),
    before: [{ type: 'click', selector: workbenchXPath.flows.feature('handler') }],
  },

  // Content Analyzer

  {
    elementXpath: workbenchXPath.flows.node('ContentAnalyzer'),
    title: 'AI Content Analysis',
    description: () => (
      <p>
        The <b>Content Analyzer</b> is the brain of our moderation system. It subscribes to 
        <code>content.submitted</code> events and uses OpenAI's APIs to analyze content for safety.
        <br />
        <br />
        For text content, it uses the Moderation API to detect toxicity, harassment, violence, and other harmful content.
        For images, it leverages GPT-4 Vision to identify inappropriate visual content.
        <br />
        <br />
        💡 The analyzer handles both content types and combines their risk scores for an overall assessment.
      </p>
    ),
    before: [{ type: 'click', selector: workbenchXPath.closePanelButton }],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: 'Text Analysis with OpenAI Moderation',
    description: () => (
      <p>
        For text content, the analyzer uses OpenAI's Moderation API which provides:
        <br />
        <br />
        • <b>Toxicity detection</b> - Identifies harmful language
        <br />
        • <b>Category classification</b> - Specific violation types
        <br />
        • <b>Confidence scores</b> - Numerical risk assessment (0-1)
        <br />
        • <b>Flagged status</b> - Binary safe/unsafe determination
        <br />
        <br />
        The system captures the maximum category score as the overall text risk level.
      </p>
    ),
    before: [
      { type: 'click', selector: workbenchXPath.flows.previewButton('ContentAnalyzer') },
      { type: 'click', selector: workbenchXPath.flows.feature('handler') },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: 'Image Analysis with GPT-4 Vision',
    description: () => (
      <p>
        For image content, the system uses GPT-4 Vision to analyze visual content for:
        <br />
        <br />
        • Violence, gore, or weapons
        <br />
        • Sexual or suggestive content  
        <br />
        • Hate symbols or offensive imagery
        <br />
        • Harassment or bullying content
        <br />
        • Illegal activities
        <br />
        <br />
        The AI returns structured JSON with safety scores and violation categories.
      </p>
    ),
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: 'State Management',
    description: () => (
      <p>
        The analyzer stores the original submission data in Motia's state management system using 
        the key pattern <code>submission:{submissionId}</code>.
        <br />
        <br />
        This allows later steps in the workflow to access the original content, user information, 
        and submission metadata when making decisions or sending notifications.
        <br />
        <br />
        💡 State management ensures data persistence across the entire async workflow.
      </p>
    ),
  },

  // Content Router

  {
    elementXpath: workbenchXPath.flows.node('ContentRouter'),
    title: 'Decision Routing Logic',
    description: () => (
      <p>
        The <b>Content Router</b> makes intelligent routing decisions based on AI confidence scores.
        It subscribes to <code>content.analyzed</code> events and determines whether content should be:
        <br />
        <br />
        • <b>Auto-approved</b> - Very low risk content (≤5%)
        <br />
        • <b>Auto-rejected</b> - Very high risk content (≥95%)  
        <br />
        • <b>Human review</b> - Uncertain content (5-95%)
        <br />
        <br />
        This confidence-based routing ensures human moderators focus on genuinely ambiguous cases.
      </p>
    ),
    before: [{ type: 'click', selector: workbenchXPath.closePanelButton }],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: 'Confidence Thresholds',
    description: () => (
      <p>
        The router uses configurable confidence thresholds to make routing decisions:
        <br />
        <br />
        <code>if (overallScore ≤ 0.05)</code> → Auto-approve (very safe content)
        <br />
        <code>else if (overallScore ≥ 0.95)</code> → Auto-reject (clearly harmful)  
        <br />
        <code>else</code> → Human review required
        <br />
        <br />
        These thresholds can be adjusted based on your platform's risk tolerance and moderation capacity.
        <br />
        <br />
        💡 The wide human review range (5-95%) in this demo ensures you'll see the Slack integration in action.
      </p>
    ),
    before: [
      { type: 'click', selector: workbenchXPath.flows.previewButton('ContentRouter') },
      { type: 'click', selector: workbenchXPath.flows.feature('handler') },
    ],
  },

  // Slack Notifier

  {
    elementXpath: workbenchXPath.flows.node('SlackNotifier'),
    title: 'Slack Integration',
    description: () => (
      <p>
        The <b>Slack Notifier</b> handles human review workflows by sending interactive messages to Slack channels.
        <br />
        <br />
        For auto-decisions, it simply logs the outcome. For human review cases, it creates rich Slack messages 
        with the content preview, risk assessment, and interactive buttons for moderator actions.
        <br />
        <br />
        💡 This eliminates the need for a custom moderation dashboard - your team can moderate content 
        directly from their existing Slack workspace.
      </p>
    ),
    before: [{ type: 'click', selector: workbenchXPath.closePanelButton }],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: 'Channel Prioritization',
    description: () => (
      <p>
        Content is routed to different Slack channels based on risk level:
        <br />
        <br />
        • <b>High risk (≥70%)</b> → Urgent channel (#content-urgent)
        <br />
        • <b>Medium risk (50-70%)</b> → Escalated channel (#content-escalated)
        <br />
        • <b>Low risk (&lt;50%)</b> → Normal channel (#content-moderation)
        <br />
        <br />
        This ensures high-priority content gets immediate attention from your moderation team.
      </p>
    ),
    before: [
      { type: 'click', selector: workbenchXPath.flows.previewButton('SlackNotifier') },
      { type: 'click', selector: workbenchXPath.flows.feature('handler') },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: 'Interactive Slack Messages',
    description: () => (
      <p>
        The Slack messages include:
        <br />
        <br />
        • <b>Content preview</b> - Text and/or image display
        <br />
        • <b>Risk assessment</b> - Score and confidence levels
        <br />
        • <b>Metadata</b> - Submission ID, timestamp, user info
        <br />
        • <b>Action buttons</b> - Approve ✅, Reject ❌, Escalate 🔺
        <br />
        <br />
        Moderators can make decisions with a single click, and the system tracks who made each decision.
      </p>
    ),
  },

  // Slack Webhook

  {
    elementXpath: workbenchXPath.flows.node('SlackWebhook'),
    title: 'Webhook Handler',
    description: () => (
      <p>
        The <b>Slack Webhook</b> API endpoint handles interactive button responses from Slack.
        <br />
        <br />
        When moderators click Approve, Reject, or Escalate buttons, Slack sends a webhook payload 
        containing the action details and user information.
        <br />
        <br />
        This endpoint validates the Slack signature, processes the moderator's decision, 
        and emits a <code>content.reviewed</code> event to trigger final actions.
      </p>
    ),
    before: [{ type: 'click', selector: workbenchXPath.closePanelButton }],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: 'Security & Validation',
    description: () => (
      <p>
        The webhook implements several security measures:
        <br />
        <br />
        • <b>Signature verification</b> - Validates requests are from Slack
        <br />
        • <b>Timestamp validation</b> - Prevents replay attacks
        <br />
        • <b>Payload parsing</b> - Safely extracts action data
        <br />
        • <b>State validation</b> - Ensures submission exists
        <br />
        <br />
        💡 In production, enable full signature verification to ensure webhook security.
      </p>
    ),
    before: [
      { type: 'click', selector: workbenchXPath.flows.previewButton('SlackWebhook') },
      { type: 'click', selector: workbenchXPath.flows.feature('handler') },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: 'Decision Processing',
    description: () => (
      <p>
        The webhook processes three types of moderator actions:
        <br />
        <br />
        • <b>Approve</b> → Content approved for publication
        <br />
        • <b>Reject</b> → Content blocked/removed
        <br />
        • <b>Escalate</b> → Send to senior review team
        <br />
        <br />
        Each decision is logged with the moderator's username, timestamp, and submitted to 
        the final action executor.
      </p>
    ),
  },

  // Action Executor

  {
    elementXpath: workbenchXPath.flows.node('ActionExecutor'),
    title: 'Final Action Execution',
    description: () => (
      <p>
        The <b>Action Executor</b> is the final step that implements moderation decisions.
        It subscribes to <code>content.reviewed</code> events and executes the appropriate actions.
        <br />
        <br />
        This step would integrate with your platform's content management system to actually 
        publish approved content, block rejected content, or route escalated content to senior review.
        <br />
        <br />
        💡 This separation allows you to customize action logic without changing the moderation workflow.
      </p>
    ),
    before: [{ type: 'click', selector: workbenchXPath.closePanelButton }],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: 'Slack Message Updates',
    description: () => (
      <p>
        After executing actions, the system updates the original Slack message to show:
        <br />
        <br />
        • <b>Final decision status</b> - Approved/Rejected/Escalated
        <br />
        • <b>Moderator information</b> - Who made the decision
        <br />
        • <b>Completion timestamp</b> - When action was executed
        <br />
        • <b>Execution confirmation</b> - Success/failure status
        <br />
        <br />
        This provides a complete audit trail visible to your moderation team.
      </p>
    ),
    before: [
      { type: 'click', selector: workbenchXPath.flows.previewButton('ActionExecutor') },
      { type: 'click', selector: workbenchXPath.flows.feature('handler') },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: 'Escalation Workflow',
    description: () => (
      <p>
        For escalated content, the system automatically:
        <br />
        <br />
        • Sends a new message to the senior review channel
        <br />
        • Includes original context and escalation reason
        <br />
        • Provides senior-level action buttons
        <br />
        • Tracks the complete escalation chain
        <br />
        <br />
        This enables multi-tier review processes for complex content decisions.
      </p>
    ),
  },

  // Testing the System

  {
    elementXpath: workbenchXPath.links.endpoints,
    title: 'Testing Content Submission',
    description: () => (
      <p>
        Now let's test the content moderation system! Click on the <b>Endpoints</b> section to access 
        the content submission API.
        <br />
        <br />
        You'll be able to submit test content with both text and images to see how the AI analysis 
        and routing logic work in practice.
        <br />
        <br />
        💡 Make sure your Slack integration is configured to see the full human review workflow.
      </p>
    ),
    before: [{ type: 'click', selector: workbenchXPath.closePanelButton }],
  },
  {
    elementXpath: workbenchXPath.endpoints.endpoint('POST', '/content/submit'),
    title: 'Content Submission Endpoint',
    description: () => (
      <p>
        This is the main content submission endpoint. Click on it to open the testing interface 
        where you can submit various types of content for moderation.
        <br />
        <br />
        The endpoint accepts POST requests with JSON payloads containing text, images, or both.
      </p>
    ),
    before: [{ type: 'click', selector: workbenchXPath.links.endpoints }],
  },
  {
    elementXpath: workbenchXPath.endpoints.callPanel,
    title: 'Testing Interface',
    description: () => (
      <p>
        Use this form to test different content scenarios:
        <br />
        <br />
        • <b>Clean content</b> - Should be auto-approved
        <br />
        • <b>Borderline content</b> - Will trigger human review via Slack
        <br />
        • <b>Clearly harmful content</b> - Should be auto-rejected
        <br />
        • <b>Image content</b> - Test visual content moderation
        <br />
        <br />
        Try submitting: <code>{"text": "This is a test message", "userId": "test123", "platform": "web"}</code>
      </p>
    ),
    before: [
      { type: 'click', selector: workbenchXPath.endpoints.endpoint('POST', '/content/submit') },
      { type: 'click', selector: workbenchXPath.endpoints.callTab },
    ],
  },
  {
    elementXpath: workbenchXPath.endpoints.playButton,
    title: 'Submit Test Content',
    description: () => (
      <p>
        Click the <b>Play</b> button to submit your test content to the moderation system.
        <br />
        <br />
        You'll receive a response with a submission ID that you can use to track the content 
        through the moderation workflow.
      </p>
    ),
    before: [
      {
        type: 'fill-editor',
        content: {
          text: 'This is a test message for content moderation',
          userId: 'test123',
          platform: 'web',
        },
      },
    ],
  },

  // Observability

  {
    elementXpath: workbenchXPath.links.tracing,
    title: 'Workflow Observability',
    description: () => (
      <p>
        After submitting content, use Motia's observability tools to track the moderation workflow.
        <br />
        <br />
        The <b>Tracing</b> section shows how your content flows through each step: 
        submission → AI analysis → routing → Slack notification → human review → final action.
        <br />
        <br />
        Each step is traced with timing information and logs for complete visibility.
      </p>
    ),
    before: [{ type: 'click', selector: workbenchXPath.endpoints.playButton }],
  },
  {
    elementXpath: workbenchXPath.tracing.trace(1),
    title: 'Moderation Workflow Trace',
    description: () => (
      <p>
        Click on the most recent trace to see the complete moderation workflow execution.
        <br />
        <br />
        You'll see each step's execution time, success status, and any logs generated during processing.
        This helps you understand the flow and debug any issues.
      </p>
    ),
    before: [{ type: 'click', selector: workbenchXPath.tracing.trace(1) }],
  },
  {
    elementXpath: workbenchXPath.tracing.details,
    title: 'Step-by-Step Analysis',
    description: () => (
      <p>
        The trace timeline shows you exactly how your content moved through the moderation pipeline:
        <br />
        <br />
        1. <b>Content Submit API</b> - Initial submission
        <br />
        2. <b>Content Analyzer</b> - AI analysis processing
        <br />
        3. <b>Content Router</b> - Decision routing logic
        <br />
        4. <b>Slack Notifier</b> - Human review notification
        <br />
        <br />
        Click on any step to see detailed logs and execution information.
      </p>
    ),
  },

  // State Management

  {
    elementXpath: workbenchXPath.links.states,
    title: 'Moderation State Tracking',
    description: () => (
      <p>
        The <b>State Management</b> tool shows all persisted data from your moderation workflows.
        <br />
        <br />
        Each submission is stored with a key like <code>submission:sub_1234567890_abc123</code> 
        containing the complete submission data, analysis results, and decision status.
        <br />
        <br />
        This provides a complete audit trail for compliance and debugging purposes.
      </p>
    ),
    before: [{ type: 'click', selector: workbenchXPath.links.states }],
  },
  {
    elementXpath: workbenchXPath.states.container,
    title: 'Submission Data',
    description: () => (
      <p>
        Click on any submission entry to see the complete moderation record including:
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
        This data structure supports compliance reporting and workflow analytics.
      </p>
    ),
    before: [{ type: 'click', selector: workbenchXPath.states.row(1) }],
  },

  // Configuration & Deployment

  {
    title: 'Production Configuration',
    description: () => (
      <p>
        To deploy this content moderation system in production, you'll need to configure:
        <br />
        <br />
        <b>OpenAI Integration:</b>
        <br />
        • Set <code>OPENAI_API_KEY</code> environment variable
        <br />
        • Configure rate limits and error handling
        <br />
        <br />
        <b>Slack Integration:</b>
        <br />
        • Set <code>SLACK_BOT_TOKEN</code> and <code>SLACK_SIGNING_SECRET</code>
        <br />
        • Configure webhook URL: <code>https://your-domain.com/slack/webhook</code>
        <br />
        • Set up moderation channels
        <br />
        <br />
        <b>Confidence Thresholds:</b>
        <br />
        • Adjust auto-approval/rejection thresholds in ContentRouter
        <br />
        • Configure channel routing based on risk levels
      </p>
    ),
    before: [{ type: 'click', selector: workbenchXPath.closePanelButton }],
  },

  // Conclusion

  {
    title: 'Content Moderation Mastery! 🎉',
    link: 'https://www.motia.dev/docs/examples/ai-content-moderation',
    description: () => (
      <p>
        Congratulations! You've learned how to build a production-ready AI content moderation system with:
        <br />
        <br />
        ✅ <b>AI-powered analysis</b> - Text and image content safety detection
        <br />
        ✅ <b>Intelligent routing</b> - Confidence-based decision automation  
        <br />
        ✅ <b>Human-in-the-loop</b> - Slack integration for edge cases
        <br />
        ✅ <b>Complete audit trail</b> - Full workflow tracking and compliance
        <br />
        ✅ <b>Scalable architecture</b> - Event-driven, async processing
        <br />
        <br />
        This pattern can be adapted for various content types and moderation policies. 
        Consider extending it with ML model training, batch processing, or appeal workflows.
        <br />
        <br />
        Check out the{' '}
        <a href="https://github.com/MotiaDev/motia/tree/main/examples/ai-content-moderation" target="_blank">
          full source code
        </a>{' '}
        and join our{' '}
        <a href="https://discord.com/invite/nJFfsH5d6v" target="_blank">
          Discord community
        </a>{' '}
        to share your moderation use cases!
      </p>
    ),
  },
]