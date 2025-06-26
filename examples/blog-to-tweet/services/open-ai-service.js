import OpenAI from 'openai';

const openAIAPIKey = process.env.OPENAI_API_KEY

export class TweetGeneratorService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: openAIAPIKey,
    });
  }

  async generateTweetsFromArticle({ markdown }) {


const prompt = `
You are a viral content strategist for developer communities on X (formerly Twitter).

Your job is to:
1. Extract key themes, hooks, and keywords from the Markdown article below
2. Use them to craft 3–5 viral tech tweets that developers will engage with
3. Use formats like:
   - "classic": Hook + Insight + Callback
   - "listicle": Numbered or emoji-style list
   - "quote": Standalone punchy insight

Output a JSON array like:
[
  {
    "type": "classic" | "listicle" | "quote",
    "tweet": "actual tweet (≤280 chars)",
    "reason": "why this tweet would go viral"
  },
  ...
]

Audience: Developers, engineers, tech influencers. Optimize for shareability, clarity, and specificity. Don’t copy paste the article. Distill and remix.

Only return the JSON. Here’s the article:

\`\`\`md
${markdown}
\`\`\`
`



    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.7,
      });

      const raw = response.choices[0].message.content || '[]';
      return raw;
    } catch (error) {
      console.error('Error generating tweets:', error.message);
      return null;
    }
  }
}