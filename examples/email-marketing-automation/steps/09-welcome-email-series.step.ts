import { EventConfig, Handlers } from "motia";
import { z } from "zod";

interface WelcomeSequence {
  userId: string;
  email: string;
  currentStep: number;
  totalSteps: number;
  nextEmailAt: string;
  completed: boolean;
  startedAt: string;
  lastEmailSent?: string;
  clickedEmails: number[];
  openedEmails: number[];
}

interface WelcomeEmailStep {
  stepNumber: number;
  delay: number; // hours
  template: string;
  subject: string;
  description: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  preferences: {
    emailMarketing: boolean;
    frequency: string;
  };
  metadata: {
    signupDate: string;
    source: string;
  };
}

export const config: EventConfig = {
  type: "event",
  name: "WelcomeEmailSeries",
  description:
    "Manages welcome email sequence progression and sends timed welcome emails",
  flows: ["email-automation"],
  subscribes: [
    "welcome-sequence-started",
    "welcome-sequence-progression",
    "welcome-email-timer",
  ],
  emits: ["content-personalized", "welcome-sequence-completed"],
  input: z.object({
    userId: z.string(),
    email: z.string().email(),
    firstName: z.string().optional(),
    sequenceStep: z.number().optional(),
    emailType: z.string().optional(),
    template: z.string().optional(),
    subject: z.string().optional(),
    personalizeContent: z.boolean().optional(),
    triggerType: z.enum(["start", "progression", "timer"]).default("start"),
  }),
};

export const handler: Handlers["WelcomeEmailSeries"] = async (
  input,
  { traceId, logger, state, emit }
) => {
  logger.info("Step 09 – Processing welcome email sequence", {
    userId: input.userId,
    email: input.email,
    triggerType: input.triggerType,
    sequenceStep: input.sequenceStep,
  });

  try {
    // Get or create welcome sequence
    let welcomeSequence = await state.get<WelcomeSequence>(
      "welcome_sequences",
      input.userId
    );
    if (!welcomeSequence && input.triggerType === "start") {
      welcomeSequence = await createWelcomeSequence(
        input.userId,
        input.email,
        state,
        logger
      );
    }

    if (!welcomeSequence) {
      logger.warn("Welcome sequence not found", { userId: input.userId });
      return;
    }

    // Check if user is still eligible for emails
    const user = await state.get<User>("users", input.userId);
    if (!user || !user.preferences.emailMarketing) {
      logger.info("User not eligible for welcome emails", {
        userId: input.userId,
        emailMarketing: user?.preferences?.emailMarketing,
      });

      // Mark sequence as completed
      welcomeSequence.completed = true;
      await state.set("welcome_sequences", input.userId, welcomeSequence);
      return;
    }

    // Process based on trigger type
    switch (input.triggerType) {
      case "start":
        await processSequenceStart(welcomeSequence, user, state, emit, logger);
        break;

      case "progression":
        await processSequenceProgression(
          welcomeSequence,
          user,
          state,
          emit,
          logger
        );
        break;

      case "timer":
        await processTimerTrigger(welcomeSequence, user, state, emit, logger);
        break;
    }
  } catch (error) {
    logger.error("Welcome email series processing failed", {
      userId: input.userId,
      triggerType: input.triggerType,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

async function createWelcomeSequence(
  userId: string,
  email: string,
  state: any,
  logger: any
): Promise<WelcomeSequence> {
  const sequence: WelcomeSequence = {
    userId,
    email,
    currentStep: 0,
    totalSteps: 4,
    nextEmailAt: new Date().toISOString(), // Send first email immediately
    completed: false,
    startedAt: new Date().toISOString(),
    clickedEmails: [],
    openedEmails: [],
  };

  await state.set("welcome_sequences", userId, sequence);

  logger.info("Welcome sequence created", {
    userId,
    email,
    totalSteps: sequence.totalSteps,
  });

  return sequence;
}

async function processSequenceStart(
  sequence: WelcomeSequence,
  user: User,
  state: any,
  emit: any,
  logger: any
) {
  const emailSteps = getWelcomeEmailSteps();
  const currentEmailStep = emailSteps[sequence.currentStep];

  if (!currentEmailStep) {
    logger.warn("Invalid welcome email step", {
      userId: sequence.userId,
      currentStep: sequence.currentStep,
    });
    return;
  }

  // Send immediate welcome email (step 0)
  await sendWelcomeEmail(sequence, user, currentEmailStep, state, emit, logger);

  // Schedule next email
  await scheduleNextEmail(sequence, emailSteps, state, logger);
}

async function processSequenceProgression(
  sequence: WelcomeSequence,
  user: User,
  state: any,
  emit: any,
  logger: any
) {
  // User engaged with previous email, potentially advance sequence faster
  const emailSteps = getWelcomeEmailSteps();
  const nextStep = sequence.currentStep + 1;

  if (nextStep >= sequence.totalSteps) {
    await completeWelcomeSequence(sequence, state, emit, logger);
    return;
  }

  const nextEmailStep = emailSteps[nextStep];
  if (!nextEmailStep) {
    await completeWelcomeSequence(sequence, state, emit, logger);
    return;
  }

  // Check if it's time for next email or if we should send due to engagement
  const now = new Date();
  const nextEmailTime = new Date(sequence.nextEmailAt);
  const engagementBonus =
    sequence.clickedEmails.length > 0 || sequence.openedEmails.length > 1;

  if (now >= nextEmailTime || engagementBonus) {
    sequence.currentStep = nextStep;
    await sendWelcomeEmail(sequence, user, nextEmailStep, state, emit, logger);
    await scheduleNextEmail(sequence, emailSteps, state, logger);
  } else {
    logger.info("Next welcome email not yet due", {
      userId: sequence.userId,
      nextEmailAt: sequence.nextEmailAt,
      currentTime: now.toISOString(),
    });
  }
}

async function processTimerTrigger(
  sequence: WelcomeSequence,
  user: User,
  state: any,
  emit: any,
  logger: any
) {
  if (sequence.completed) {
    logger.info("Welcome sequence already completed", {
      userId: sequence.userId,
    });
    return;
  }

  const now = new Date();
  const nextEmailTime = new Date(sequence.nextEmailAt);

  if (now >= nextEmailTime) {
    const emailSteps = getWelcomeEmailSteps();
    const nextStep = sequence.currentStep + 1;

    if (nextStep >= sequence.totalSteps) {
      await completeWelcomeSequence(sequence, state, emit, logger);
      return;
    }

    const nextEmailStep = emailSteps[nextStep];
    if (nextEmailStep) {
      sequence.currentStep = nextStep;
      await sendWelcomeEmail(
        sequence,
        user,
        nextEmailStep,
        state,
        emit,
        logger
      );
      await scheduleNextEmail(sequence, emailSteps, state, logger);
    }
  }
}

async function sendWelcomeEmail(
  sequence: WelcomeSequence,
  user: User,
  emailStep: WelcomeEmailStep,
  state: any,
  emit: any,
  logger: any
) {
  const personalizedSubject = emailStep.subject.replace(
    "{{firstName}}",
    user.firstName || "there"
  );

  // Create personalized email content
  const emailContent = generateWelcomeEmailContent(emailStep, user);

  // Create personalized email object
  const personalizedEmail = {
    id: `welcome_${sequence.userId}_${emailStep.stepNumber}_${Date.now()}`,
    campaignId: `welcome_sequence_${sequence.userId}`,
    userId: sequence.userId,
    email: sequence.email,
    subject: personalizedSubject,
    content: emailContent,
    status: "queued",
    createdAt: new Date().toISOString(),
    emailType: "welcome_sequence",
    sequenceStep: emailStep.stepNumber,
  };

  // Emit for email delivery
  await emit({
    topic: "content-personalized",
    data: {
      campaignId: personalizedEmail.campaignId,
      personalizedEmails: [personalizedEmail],
      totalEmails: 1,
      isWelcomeSequence: true,
    },
  });

  // Update sequence
  sequence.lastEmailSent = new Date().toISOString();
  await state.set("welcome_sequences", sequence.userId, sequence);

  logger.info("Welcome email sent", {
    userId: sequence.userId,
    step: emailStep.stepNumber,
    subject: personalizedSubject,
    template: emailStep.template,
  });
}

async function scheduleNextEmail(
  sequence: WelcomeSequence,
  emailSteps: WelcomeEmailStep[],
  state: any,
  logger: any
) {
  const nextStep = sequence.currentStep + 1;

  if (nextStep >= emailSteps.length) {
    // No more emails to schedule
    return;
  }

  const nextEmailStep = emailSteps[nextStep];
  const nextEmailTime = new Date(
    Date.now() + nextEmailStep.delay * 60 * 60 * 1000
  ); // Convert hours to milliseconds

  sequence.nextEmailAt = nextEmailTime.toISOString();
  await state.set("welcome_sequences", sequence.userId, sequence);

  logger.info("Next welcome email scheduled", {
    userId: sequence.userId,
    nextStep,
    scheduledFor: sequence.nextEmailAt,
    delayHours: nextEmailStep.delay,
  });
}

async function completeWelcomeSequence(
  sequence: WelcomeSequence,
  state: any,
  emit: any,
  logger: any
) {
  sequence.completed = true;
  sequence.nextEmailAt = new Date().toISOString();
  await state.set("welcome_sequences", sequence.userId, sequence);

  // Emit completion event
  await emit({
    topic: "welcome-sequence-completed",
    data: {
      userId: sequence.userId,
      email: sequence.email,
      completedAt: new Date().toISOString(),
      totalEmailsSent: sequence.currentStep + 1,
      emailsOpened: sequence.openedEmails.length,
      emailsClicked: sequence.clickedEmails.length,
      engagementRate: sequence.openedEmails.length / (sequence.currentStep + 1),
    },
  });

  logger.info("Welcome sequence completed", {
    userId: sequence.userId,
    totalSteps: sequence.totalSteps,
    engagementRate: sequence.openedEmails.length / (sequence.currentStep + 1),
  });
}

function getWelcomeEmailSteps(): WelcomeEmailStep[] {
  return [
    {
      stepNumber: 0,
      delay: 0, // Immediate
      template: "welcome_immediate",
      subject: "Welcome to our community, {{firstName}}!",
      description: "Immediate welcome with account setup guide",
    },
    {
      stepNumber: 1,
      delay: 48, // 2 days
      template: "welcome_getting_started",
      subject: "Ready to get started, {{firstName}}?",
      description: "Getting started guide and key features",
    },
    {
      stepNumber: 2,
      delay: 168, // 1 week
      template: "welcome_success_stories",
      subject: "See what others are achieving, {{firstName}}",
      description: "Success stories and social proof",
    },
    {
      stepNumber: 3,
      delay: 720, // 1 month (30 days)
      template: "welcome_advanced_tips",
      subject: "Advanced tips for {{firstName}}",
      description: "Advanced features and pro tips",
    },
  ];
}

function generateWelcomeEmailContent(
  emailStep: WelcomeEmailStep,
  user: User
): string {
  const firstName = user.firstName || "there";
  const signupSource = user.metadata?.source || "website";

  const contentTemplates = {
    welcome_immediate: `
      <h1>Welcome ${firstName}!</h1>
      <p>We're thrilled to have you join our community. Thanks for signing up via ${signupSource}!</p>
      <p>Here's what you can do next:</p>
      <ul>
        <li>Complete your profile setup</li>
        <li>Explore our key features</li>
        <li>Join our community discussions</li>
      </ul>
      <a href="#" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Get Started</a>
      {{personalizedSection}}
    `,
    welcome_getting_started: `
      <h1>Ready to dive deeper, ${firstName}?</h1>
      <p>Now that you've had a couple of days to explore, let's help you get the most out of your experience.</p>
      <h2>Quick Start Guide:</h2>
      <ol>
        <li>Set up your preferences</li>
        <li>Connect with others</li>
        <li>Explore advanced features</li>
      </ol>
      <a href="#" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Continue Setup</a>
      {{personalizedSection}}
    `,
    welcome_success_stories: `
      <h1>Amazing things happening, ${firstName}!</h1>
      <p>See what other members like you are achieving with our platform.</p>
      <div style="background-color: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px;">
        <h3>Success Story</h3>
        <p>"This platform helped me achieve my goals faster than I ever imagined!" - Sarah, Member since 2024</p>
      </div>
      <a href="#" style="background-color: #17a2b8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Read More Stories</a>
      {{personalizedSection}}
    `,
    welcome_advanced_tips: `
      <h1>You're becoming a pro, ${firstName}!</h1>
      <p>After a month with us, you're ready for some advanced tips and tricks.</p>
      <h2>Pro Tips:</h2>
      <ul>
        <li>Use keyboard shortcuts for faster navigation</li>
        <li>Set up automation rules</li>
        <li>Join our expert community</li>
      </ul>
      <a href="#" style="background-color: #6f42c1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Unlock Pro Features</a>
      {{personalizedSection}}
    `,
  };

  return (
    contentTemplates[emailStep.template as keyof typeof contentTemplates] ||
    contentTemplates.welcome_immediate
  );
}
