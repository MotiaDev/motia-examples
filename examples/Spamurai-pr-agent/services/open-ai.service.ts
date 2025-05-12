import OpenAI from 'openai';

// service for analysing pr using openAI
export class OpenAIService {
    private openai: OpenAI

    // initialize openAI client
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        })
    }

    // analyze a pr with the following prompt
    async analyzePRForSpam({ prTitle, prDescription, prDiff }: { prTitle: string, prDescription: string, prDiff: string }) {
        const prompt = `
            You will receive:
            
            PR Title: "${prTitle}"
            PR Description: "${prDescription}"
            Code Diff: "${prDiff}"

            Your job is to analyze the PR and return a JSON object with the following keys:

            {
            "isSpam": boolean indicating if PR appears to be spammy or low effort,
            "spamConfidence": number between 0 - 1 indicating confidence level of it being spammy,
            "PRConfidence": number between 0 - 1 indicating how trustworthy and high quality the PR appears to be,
            "quality": number between 0 - 1 indicating overall technical/code quality,
            "reasons": array of reasons behind the decision,
            "feedback": constructive feedback for the contributor,
            "recommendedAction": one of: "close", "request_changes", "approve", or "none"
            }

            ---

            Analysis Tasks:

            Spam Detection:
            Mark PRs as spammy (isSpam: true) if any of the following are true:
            - Only trivial edits (e.g., added console.log, print statements, comments, whitespace)
            - Random or irrelevant changes
            - Generic or copy-pasted PR description
            - PR title/description don’t match the actual code
            - Appears to be a Hacktoberfest contribution with no meaningful value

            **Important:**  
            Even if code is syntactically correct, if the PR does **not improve** the codebase meaningfully, or looks like a placeholder just to farm contributions, it should be marked as spam.

            ### 🧪 Code Quality Evaluation:
            - Does the code follow the repo's style and conventions?
            - Are there bugs or potential issues?
            - Does the code do what it says it does?
            - Is there proper testing or validation?

            ### 🧹 Hacktoberfest-Specific Check:
            - Is the contributor just trying to increase contribution count?
            - Do they show understanding or interest in the repo?

            ---

            ## ✅ Classification Examples

            **Example 1:**
            Title: "Refactored API logic"  
            Diff: Adds only console.log("test")
            → isSpam: true, spamConfidence: 0.95, recommendedAction: "close"

            **Example 2:**
            Title: "Fix login flow"  
            Diff: Fixes a real bug with a test case  
            → isSpam: false, quality: 0.9, recommendedAction: "approve"

            ---

            Respond only with a JSON object in this structure.`

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1500,
                temperature: 0.5,
            })
            const analysis = response.choices[0].message.content || '[]'
            return JSON.parse(analysis)
        } catch (error) {
            console.error('Error analyzing PR:', error)
            return null
        }
    }
}