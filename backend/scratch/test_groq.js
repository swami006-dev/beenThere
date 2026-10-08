const { ChatGroq } = require('@langchain/groq');
const { SystemMessage, HumanMessage } = require('@langchain/core/messages');
const { z } = require('zod');
const { env } = require('../src/config/env');

const aiAnalysisSchema = z.object({
  category: z.string().describe('Short category (Academic, Career, Relationships, Family, Mental wellbeing, College life, Social / Communication, Other)'),
  situation: z.string().describe('One concise sentence summarizing the main problem'),
  need: z.string().describe('Short description of what kind of peer support the student may be seeking'),
  tags: z.array(z.string()).min(2).max(5).describe('2 to 5 short tags without hash symbols'),
  risk: z.enum(['low', 'medium', 'high']).describe('Safety risk classification')
});

async function main() {
  console.log('AI Provider:', env.AI_PROVIDER);
  console.log('Groq Model:', env.GROQ_MODEL);
  console.log('API Key configured:', !!env.GROQ_API_KEY);

  const model = new ChatGroq({
    apiKey: env.GROQ_API_KEY,
    model: env.GROQ_MODEL || 'openai/gpt-oss-120b',
    temperature: 0.2,
    maxTokens: 500
  });

  const structuredLlm = model.withStructuredOutput(aiAnalysisSchema);

  const response = await structuredLlm.invoke([
    new SystemMessage(`You analyze anonymous student peer-support reflections.

Identify:
1. category
2. situation
3. support need
4. 2–5 useful tags
5. safety risk

Do not diagnose mental health conditions.
Do not act as a therapist.
Do not invent student experiences.
Do not invent advice.
Do not rewrite the student's original text.

Risk must be:
low, medium, or high.

Return only the requested structured fields.`),
    new HumanMessage(`Student content: "I am terrified about my coding exam and keep thinking I will fail. I study every day but freeze when I look at the problems."`)
  ]);

  console.log('Response from Groq:', response);
}

main().catch(err => {
  console.error('Groq test error:', err);
});
