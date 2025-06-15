import { UserPersona } from '../../types';
import { deepPersonalizationEngine } from './DeepPersonalizationEngine';
import { logger } from '../../utils/logger';

/**
 * Content-Type Specific Personalizer
 * Handles specialized personalization for each learning mode
 */
export class ContentTypePersonalizer {

  /**
   * Create a personalized introduction that immediately hooks the learner
   */
  generatePersonalizedIntroduction(
    topic: string,
    content: string,
    persona: UserPersona
  ): string {
    const primaryLens = deepPersonalizationEngine.getPrimaryLens(persona);
    const anchors = deepPersonalizationEngine.getContextualAnchors(persona);
    
    return `You are creating the opening moments of a learning experience. Your goal is to immediately capture the learner's attention using their world.

LEARNER PROFILE:
Primary Interest: ${primaryLens}
Background: ${persona.currentRole || 'Student'} in ${persona.industry || 'General'}
Technical Level: ${persona.technicalLevel || 'intermediate'}

HOOK STRATEGY:
1. Open with a scenario from ${primaryLens} that connects to the topic
2. Use terminology from: ${anchors.domains.slice(0, 2).join(', ')}
3. Reference experiences like: ${anchors.experiences.slice(0, 2).join(', ')}
4. Build curiosity about the connection
5. NEVER announce the personalization

TOPIC: ${topic}

INTRODUCTION STRUCTURE:
- Opening Hook (2 sentences): Vivid scenario from their world
- Bridge (1-2 sentences): Natural connection to the academic topic
- Learning Promise (1 sentence): What they'll discover

EXAMPLES:

For Basketball + Economics:
"The final seconds tick down, and every decision on the court carries exponential weight - a perfectly timed pass can shift entire momentum patterns, while a missed opportunity cascades through the remaining plays. This same principle of cascading effects and strategic timing drives every economic system, where individual choices create ripple effects that reshape entire markets."

For Gaming + Data Structures:
"Consider the moment when your carefully optimized inventory system finally clicks - every item categorized, every upgrade path mapped, resource allocation flowing seamlessly through interconnected systems. This intuitive understanding of organized complexity is exactly what makes data structures so powerful in software development."

YOUR TASK: Create an introduction for "${topic}" that immediately makes someone immersed in ${primaryLens} lean forward and think "I need to understand this."

CONTENT CONTEXT:
${content.substring(0, 500)}...

Generate an introduction that hooks them from the first sentence using their world, without ever mentioning their interests explicitly.`;
  }

  /**
   * Create progressive concept explanations with increasing complexity
   */
  generateProgressiveExplanation(
    concept: string,
    content: string,
    persona: UserPersona,
    currentLevel: 'foundation' | 'intermediate' | 'advanced'
  ): string {
    const primaryLens = deepPersonalizationEngine.getPrimaryLens(persona);
    const complexity = deepPersonalizationEngine.getComplexityLevel(persona, concept);
    const anchors = deepPersonalizationEngine.getContextualAnchors(persona);

    const levelInstructions = {
      foundation: `Start with the most basic, intuitive understanding using ${primaryLens} fundamentals. Focus on "what it is" rather than "how it works."`,
      intermediate: `Build deeper understanding using ${primaryLens} systems and processes. Explain mechanisms and relationships.`,
      advanced: `Explore sophisticated applications and edge cases using advanced ${primaryLens} scenarios. Focus on mastery and nuanced understanding.`
    };

    return `Create a ${currentLevel}-level explanation of "${concept}" that builds understanding progressively through the lens of ${primaryLens}.

LEARNER CONTEXT:
Primary Domain: ${primaryLens}
Current Level: ${currentLevel}
Technical Depth: ${complexity.conceptualDepth}
Language Level: ${complexity.technicalLanguage}

PROGRESSIVE STRUCTURE:
${levelInstructions[currentLevel]}

EXPLANATION APPROACH:
1. Core Concept: Define using ${primaryLens} terminology naturally
2. Key Mechanism: Explain how it works using familiar processes from ${anchors.domains[0]}
3. Practical Application: Show where they'd encounter this in ${anchors.experiences[0]}
4. Connection Points: Link to other concepts they already understand
5. Next Level Preview: Hint at deeper complexity without overwhelming

NATURAL INTEGRATION:
- Use vocabulary from: ${anchors.domains.slice(0, 3).join(', ')}
- Reference familiar systems and processes
- Build on their existing mental models
- Make abstractions concrete through their experiences

CONTENT TO EXPLAIN:
${content}

Create an explanation that feels like it was written by an expert in both the subject and ${primaryLens}, progressing understanding naturally without forcing connections.`;
  }

  /**
   * Generate contextual examples from the user's world
   */
  generateContextualExamples(
    concept: string,
    persona: UserPersona,
    exampleType: 'basic' | 'application' | 'problem-solving' | 'real-world'
  ): string {
    const primaryLens = deepPersonalizationEngine.getPrimaryLens(persona);
    const anchors = deepPersonalizationEngine.getContextualAnchors(persona);

    const typeInstructions = {
      basic: `Simple, clear examples that illustrate the fundamental concept`,
      application: `Practical applications they would actually use or encounter`,
      'problem-solving': `Problem scenarios that require applying the concept`,
      'real-world': `Complex, realistic situations from their professional/personal context`
    };

    return `Generate ${exampleType} examples of "${concept}" using realistic scenarios from the learner's world.

LEARNER'S WORLD:
Primary Domain: ${primaryLens}
Professional Context: ${persona.currentRole} in ${persona.industry}
Familiar Contexts: ${anchors.domains.slice(0, 3).join(', ')}
Typical Experiences: ${anchors.experiences.slice(0, 3).join(', ')}

EXAMPLE TYPE: ${typeInstructions[exampleType]}

EXAMPLE REQUIREMENTS:
1. Use scenarios they would actually encounter
2. Employ terminology natural to ${primaryLens}
3. Show the concept in action, not just describe it
4. Make the application obvious and meaningful
5. Progress from simple to more sophisticated
6. NEVER explain why you chose these examples

EXAMPLE STRUCTURE:
Each example should:
- Set up a familiar scenario
- Show the concept manifesting naturally
- Highlight the key mechanism or principle
- Connect to broader implications in their field

Generate 2-3 examples that make the concept immediately relevant and applicable to someone immersed in ${primaryLens}.`;
  }

  /**
   * Create personalized practice problems
   */
  generatePersonalizedPractice(
    concept: string,
    persona: UserPersona,
    practiceType: 'guided' | 'independent' | 'challenge'
  ): string {
    const primaryLens = deepPersonalizationEngine.getPrimaryLens(persona);
    const anchors = deepPersonalizationEngine.getContextualAnchors(persona);

    const practiceInstructions = {
      guided: `Step-by-step practice with hints and scaffolding`,
      independent: `Self-directed problems that test understanding`,
      challenge: `Complex scenarios that require creative application`
    };

    return `Create ${practiceType} practice problems for "${concept}" using scenarios from the learner's domain.

LEARNER PROFILE:
Primary Domain: ${primaryLens}
Background: ${persona.currentRole} in ${persona.industry}
Problem Contexts: ${anchors.experiences.slice(0, 3).join(', ')}

PRACTICE TYPE: ${practiceInstructions[practiceType]}

PROBLEM DESIGN:
1. Situate problems in ${primaryLens} contexts
2. Use realistic scenarios they might face
3. Require genuine application of the concept
4. Progress in difficulty appropriately
5. Include success criteria that matter in their field

PROBLEM STRUCTURE:
- Context Setup: Realistic scenario from their world
- Challenge: What they need to figure out or solve
- Resources: Information and tools available
- Success Criteria: How they'll know they succeeded
- Extension: How this connects to bigger challenges

Generate problems that feel like real challenges they would encounter in ${primaryLens}, making the practice immediately relevant and engaging.`;
  }

  /**
   * Create goal-oriented summaries
   */
  generateGoalOrientedSummary(
    content: string,
    persona: UserPersona,
    summaryPurpose: 'review' | 'application' | 'next-steps' | 'connections'
  ): string {
    const primaryLens = deepPersonalizationEngine.getPrimaryLens(persona);
    const anchors = deepPersonalizationEngine.getContextualAnchors(persona);

    const purposeInstructions = {
      review: `Reinforcement summary highlighting key takeaways for retention`,
      application: `Action-oriented summary focusing on practical use`,
      'next-steps': `Forward-looking summary preparing for advanced topics`,
      connections: `Relationship summary showing how concepts link together`
    };

    return `Create a ${summaryPurpose} summary that connects the learning to the user's goals and framework.

LEARNER CONTEXT:
Primary Framework: ${primaryLens}
Professional Goals: ${persona.careerGoals || ['General learning']}
Learning Goals: ${persona.learningGoals || ['Understanding']}
Application Context: ${anchors.domains.slice(0, 2).join(', ')}

SUMMARY PURPOSE: ${purposeInstructions[summaryPurpose]}

SUMMARY APPROACH:
1. Frame insights through ${primaryLens} organizational patterns
2. Connect to their specific goals and aspirations
3. Use terminology and frameworks from their domain
4. Highlight implications for their work/interests
5. Make connections feel discovered, not announced

SUMMARY STRUCTURE:
- Key Insights: Core understanding in their language
- Practical Implications: How this affects their work/interests
- Next Applications: Where they'll use this knowledge
- Future Connections: How this builds toward their goals

CONTENT TO SUMMARIZE:
${content}

Create a summary that feels like it was written by a mentor who understands both the subject matter and their ${primaryLens} goals, making every insight feel personally relevant.`;
  }

  /**
   * Generate adaptive flashcards based on user's domain
   */
  generatePersonalizedFlashcards(
    content: string,
    persona: UserPersona,
    cardType: 'definition' | 'application' | 'scenario' | 'connection'
  ): string {
    const primaryLens = deepPersonalizationEngine.getPrimaryLens(persona);
    const anchors = deepPersonalizationEngine.getContextualAnchors(persona);

    return `Create ${cardType} flashcards using scenarios and terminology from the learner's domain.

LEARNER DOMAIN: ${primaryLens}
Professional Context: ${persona.currentRole} in ${persona.industry}
Familiar Scenarios: ${anchors.experiences.slice(0, 3).join(', ')}

FLASHCARD TYPE: ${cardType}

CARD DESIGN:
- Front: Questions/prompts using ${primaryLens} contexts
- Back: Answers that connect to their understanding
- Use terminology natural to their domain
- Include realistic scenarios they would encounter
- Test genuine understanding, not just memorization

CONTENT SOURCE:
${content}

Generate flashcards that feel like studying for challenges they would actually face in ${primaryLens}, making the review process immediately relevant and practical.`;
  }

  /**
   * Create personalized quiz questions with domain-specific scenarios
   */
  generatePersonalizedQuiz(
    content: string,
    persona: UserPersona,
    questionType: 'multiple_choice' | 'scenario_analysis' | 'problem_solving' | 'application'
  ): string {
    const primaryLens = deepPersonalizationEngine.getPrimaryLens(persona);
    const anchors = deepPersonalizationEngine.getContextualAnchors(persona);

    return `Create ${questionType} quiz questions using realistic scenarios from the learner's domain.

LEARNER PROFILE:
Primary Domain: ${primaryLens}
Professional Context: ${persona.currentRole} in ${persona.industry}
Assessment Context: ${anchors.experiences.slice(0, 2).join(', ')}

QUESTION DESIGN:
1. Situate questions in ${primaryLens} scenarios
2. Test understanding through practical application
3. Use terminology natural to their domain
4. Include realistic decision points they would face
5. Assess genuine comprehension, not rote knowledge

QUESTION STRUCTURE:
- Context: Realistic scenario from their world
- Challenge: What they need to analyze or decide
- Options/Criteria: Realistic choices or evaluation criteria
- Correct Response: Best practice in their domain
- Explanation: Why this approach works in their context

CONTENT TO ASSESS:
${content}

Generate quiz questions that feel like real decisions and analyses they would encounter in ${primaryLens}, making the assessment meaningful and relevant.`;
  }

  /**
   * Create learning path recommendations based on user's goals
   */
  generatePersonalizedLearningPath(
    currentTopic: string,
    persona: UserPersona,
    pathType: 'prerequisites' | 'next-topics' | 'related-skills' | 'career-focused'
  ): string {
    const primaryLens = deepPersonalizationEngine.getPrimaryLens(persona);
    const goals = [...(persona.careerGoals || []), ...(persona.learningGoals || [])];

    return `Recommend a ${pathType} learning path that connects to the learner's goals and domain.

CURRENT TOPIC: ${currentTopic}
LEARNER'S DOMAIN: ${primaryLens}
CAREER GOALS: ${goals.join(', ')}
PROFESSIONAL CONTEXT: ${persona.currentRole} in ${persona.industry}

PATH RECOMMENDATIONS:
1. Connect each suggestion to their ${primaryLens} journey
2. Explain relevance to their specific goals
3. Use progression patterns familiar in their domain
4. Show practical applications they would encounter
5. Make the learning journey feel purposeful and directed

Generate recommendations that feel like career guidance from a mentor who understands both the subject matter and the ${primaryLens} field.`;
  }
}

export const contentTypePersonalizer = new ContentTypePersonalizer();