const { OpenAI } = require("openai");

exports.config = {
  type: 'event', // would be probably "cron" in the real world
  name: 'Validate Motia mentions ',
  description: 'Fetch Motia mentions',
  subscribes: ['mentions-fetched'],
  emits: ['valid-mentions'],
  flows: ['keywords'],
}

exports.handler = async (input: { mentions: any[]; }, { traceId, logger, state, emit }: any) => {
  const mentions = input.mentions || [];
  const validMentions: any[] = [];
  const invalidMentions: any[] = [];

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  logger.info("Validating mentions...");

  for (const mention of mentions) {
    const response = await client.responses.create({
      model: 'gpt-4o',
      instructions: 'Determine if the following mention is related to motia.dev or another Motia. Respond with "motia.dev" or "other Motia".',
      input: `title: ${mention.title}\ntext: ${mention.text}\nurl: ${mention.url}`,
    });

    const result = response.output_text.trim().toLowerCase();
    if (result === "motia.dev") {
      logger.info(mention.url, "Mention related motia.dev 🎉");
      validMentions.push(mention);
    }
    else {
      logger.info(mention.url, "Mention is not related to motia.dev");
      invalidMentions.push(mention);
    }
  }

  await state.set(traceId, "valid-motia-dev-mentions", validMentions);
  await state.set(traceId, "invalid-motia-dev-mentions", invalidMentions);
  await emit({
    topic: "valid-mentions",
    data: {
      key: "valid-motia-dev-mentions",
      mentions: validMentions,
    }
  })
  logger.info("Validated mentions successfully.");
  // show issue with the logger
  // logger.info({});
};
