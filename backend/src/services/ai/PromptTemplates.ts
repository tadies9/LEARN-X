import { UserPersona } from '../../types';

export interface PromptTemplate {
  explain: (persona: UserPersona, content: string) => string;
  summarize: (persona: UserPersona, content: string) => string;
  flashcard: (content: string) => string;
  quiz: (content: string, type: QuizType) => string;
  analogy: (concept: string, interests: string[]) => string;
}

export enum QuizType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
}

export class PromptTemplateBuilder {
  private getToneInstruction(tone?: string): string {
    const toneMap: Record<string, string> = {
      formal: 'Use formal language and professional terminology.',
      professional: 'Maintain a professional yet approachable tone.',
      friendly: 'Be warm, encouraging, and conversational.',
      casual: 'Use relaxed, everyday language.',
      academic: 'Use scholarly language with proper citations.',
    };

    return toneMap[tone || 'friendly'] || toneMap.friendly;
  }

  private getDensityInstruction(density?: string): string {
    const densityMap: Record<string, string> = {
      concise: 'Be brief and to the point. Use bullet points where appropriate.',
      comprehensive: 'Provide detailed explanations with multiple examples.',
    };

    return densityMap[density || 'concise'] || densityMap.concise;
  }

  private getLearningStyleInstruction(style?: string): string {
    const styleMap: Record<string, string> = {
      visual: 'Use visual descriptions, diagrams, and spatial relationships.',
      auditory: 'Use rhythm, patterns, and conversational explanations.',
      reading: 'Focus on clear written explanations with logical flow.',
      kinesthetic: 'Include hands-on examples and practical applications.',
      mixed: 'Combine multiple approaches for comprehensive understanding.',
    };

    return styleMap[style || 'mixed'] || styleMap.mixed;
  }

  buildExplainPrompt(persona: UserPersona, content: string): string {
    const tone = this.getToneInstruction(persona.communicationTone);
    const density = this.getDensityInstruction(persona.contentDensity);
    const style = this.getLearningStyleInstruction(persona.learningStyle);

    return `You are an expert educator creating personalized explanations.

User Context:
- Role: ${persona.currentRole || 'Student'}
- Industry: ${persona.industry || 'General'}
- Technical Level: ${persona.technicalLevel || 'intermediate'}
- Primary Interests: ${persona.primaryInterests?.join(', ') || 'general topics'}

Instructions:
- ${tone}
- ${density}
- ${style}
- Focus on clarity and understanding
- Use examples relevant to their interests when possible
- Avoid jargon unless appropriate for their technical level

Content to explain:
${content}

Generate a personalized explanation that connects with this learner's background and preferences.`;
  }

  buildSummarizePrompt(persona: UserPersona, content: string): string {
    const density = this.getDensityInstruction(persona.contentDensity);

    return `Create a summary of the following content.

User Preferences:
- ${density}
- Technical Level: ${persona.technicalLevel || 'intermediate'}

Requirements:
- Extract key points and main ideas
- Organize information logically
- ${persona.contentDensity === 'concise' ? 'Use bullet points' : 'Use paragraph form'}
- Highlight important concepts
- Include relevant takeaways

Content to summarize:
${content}

Generate a summary that matches the user's preferences for content density and technical depth.`;
  }

  buildFlashcardPrompt(content: string): string {
    return `Create educational flashcards from the following content.

Requirements:
- Generate 5-10 flashcards
- Each card should have a clear question/prompt on the front
- Provide concise, accurate answers on the back
- Focus on key concepts, definitions, and important facts
- Make questions specific and unambiguous
- Order cards from fundamental to advanced concepts

Format each flashcard as:
FRONT: [Question or prompt]
BACK: [Answer or explanation]

Content:
${content}

Generate flashcards that effectively test understanding of the material.`;
  }

  buildQuizPrompt(content: string, type: QuizType): string {
    const typeInstructions: Record<QuizType, string> = {
      [QuizType.MULTIPLE_CHOICE]: `Create multiple choice questions with:
- One clearly correct answer
- Three plausible but incorrect distractors
- No "all of the above" or "none of the above" options
Format: 
Q: [Question]
A) [Option 1]
B) [Option 2]
C) [Option 3]
D) [Option 4]
Correct: [Letter]
Explanation: [Why this answer is correct]`,

      [QuizType.TRUE_FALSE]: `Create true/false questions that:
- Test understanding, not memorization
- Avoid trick questions
- Have clear, unambiguous statements
Format:
Q: [Statement]
Answer: [True/False]
Explanation: [Why this is true or false]`,

      [QuizType.SHORT_ANSWER]: `Create short answer questions that:
- Require 1-3 sentence responses
- Test comprehension and application
- Have clear, specific answers
Format:
Q: [Question]
Answer: [Expected response]
Key Points: [What the answer should include]`,
    };

    return `Create quiz questions to test understanding of the content.

${typeInstructions[type]}

Requirements:
- Generate 5 questions
- Cover different aspects of the material
- Progress from basic to more complex
- Test genuine understanding, not just recall

Content:
${content}

Generate questions that effectively assess comprehension of the material.`;
  }

  buildAnalogyPrompt(concept: string, interests: string[]): string {
    const primaryInterest = interests[0] || 'everyday life';

    return `Create a clear, helpful analogy to explain "${concept}".

Use an analogy from: ${primaryInterest}

Requirements:
- Make the analogy natural and relatable
- Ensure conceptual accuracy
- Keep it concise (2-3 sentences)
- Focus on the core similarities
- Avoid forced or confusing connections

Additional interests that might help: ${interests.slice(1).join(', ')}

Generate an analogy that makes the concept click for someone interested in ${primaryInterest}.`;
  }
}

export const promptTemplates = new PromptTemplateBuilder();
