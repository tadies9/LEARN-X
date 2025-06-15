import { UserPersona } from '../../types';
import { deepPersonalizationEngine } from './DeepPersonalizationEngine';

/**
 * Visual Personalization Engine
 * Enhances content for visual learners with descriptive imagery from their domain
 */
export class VisualPersonalizationEngine {

  /**
   * Generate visual descriptions using imagery from user's domain
   */
  generateVisualDescriptions(
    concept: string,
    persona: UserPersona,
    visualType: 'spatial' | 'diagram' | 'process' | 'comparison' | 'metaphor'
  ): string {
    const primaryLens = deepPersonalizationEngine.getPrimaryLens(persona);
    const anchors = deepPersonalizationEngine.getContextualAnchors(persona);

    const visualInstructions = {
      spatial: `Describe how ${concept} would "look" in space using ${primaryLens} spatial references`,
      diagram: `Create a mental diagram of ${concept} using visual elements from ${primaryLens}`,
      process: `Visualize the ${concept} process using ${primaryLens} workflow imagery`,
      comparison: `Show visual contrasts and comparisons using ${primaryLens} visual metaphors`,
      metaphor: `Paint a vivid visual metaphor for ${concept} using ${primaryLens} imagery`
    };

    return `Create rich visual descriptions for "${concept}" that help visual learners see and understand through ${primaryLens} imagery.

VISUAL LEARNER PROFILE:
Primary Visual Domain: ${primaryLens}
Visual Contexts: ${anchors.places.slice(0, 3).join(', ')}
Visual References: ${anchors.domains.slice(0, 3).join(', ')}

VISUAL TYPE: ${visualInstructions[visualType]}

VISUAL ENHANCEMENT TECHNIQUES:
1. Spatial Relationships: Use "above," "below," "parallel," "intersecting" with ${primaryLens} references
2. Color and Movement: Describe dynamics using visual language from their domain
3. Shape and Structure: Use familiar forms and patterns from ${primaryLens}
4. Scale and Proportion: Show relative sizes using ${primaryLens} objects
5. Visual Flow: Describe how the concept "moves" or "develops" visually

DESCRIPTION STRUCTURE:
- Visual Setup: Paint the scene using familiar ${primaryLens} imagery
- Key Elements: Describe the main visual components
- Relationships: Show how parts connect spatially
- Movement/Change: Visualize how the concept develops over time
- Clear Perspective: Help them "see" the complete picture

Generate visual descriptions that make abstract concepts concrete through the rich visual language of ${primaryLens}.`;
  }

  /**
   * Create mind map structures using domain-familiar organization
   */
  generateVisualMindMap(
    mainConcept: string,
    relatedConcepts: string[],
    persona: UserPersona
  ): string {
    const primaryLens = deepPersonalizationEngine.getPrimaryLens(persona);
    const anchors = deepPersonalizationEngine.getContextualAnchors(persona);

    return `Create a visual mind map for "${mainConcept}" using organizational patterns familiar in ${primaryLens}.

VISUAL ORGANIZATION:
Central Hub: ${mainConcept} (visualized as a central ${primaryLens} element)
Connected Concepts: ${relatedConcepts.join(', ')}
Visual Framework: ${anchors.domains[0]} organizational structure

MIND MAP STRUCTURE:
1. Central Visual: Describe ${mainConcept} as a vivid ${primaryLens} image
2. Branch Organization: Use ${primaryLens} logical groupings
3. Connection Patterns: Show relationships using ${primaryLens} connection metaphors
4. Visual Hierarchy: Use size, color, and position from ${primaryLens} conventions
5. Flow Indicators: Show information movement using ${primaryLens} flow patterns

VISUAL LANGUAGE:
- Use spatial metaphors from ${primaryLens}
- Describe colors, shapes, and patterns they would recognize
- Include movement and dynamic elements
- Show clear visual hierarchies and relationships

Create a mind map that a visual learner immersed in ${primaryLens} would immediately understand and remember.`;
  }

  /**
   * Generate step-by-step visual processes
   */
  generateVisualProcess(
    processName: string,
    steps: string[],
    persona: UserPersona
  ): string {
    const primaryLens = deepPersonalizationEngine.getPrimaryLens(persona);
    const anchors = deepPersonalizationEngine.getContextualAnchors(persona);

    return `Visualize the "${processName}" process using familiar ${primaryLens} workflow imagery.

PROCESS VISUALIZATION:
Process Context: ${primaryLens} environment
Visual Framework: ${anchors.experiences[0]} workflow
Steps to Visualize: ${steps.join(' → ')}

VISUAL PROCESS DESIGN:
1. Setting the Scene: Place the process in a familiar ${primaryLens} environment
2. Step Visualization: Each step as a clear visual action in their domain
3. Flow Indicators: Use ${primaryLens} visual cues for progression
4. State Changes: Show how things transform visually at each step
5. Feedback Loops: Visualize corrections and iterations using ${primaryLens} patterns

STEP-BY-STEP VISUALIZATION:
For each step:
- Visual Action: What you would "see" happening in ${primaryLens} terms
- Input/Output: Visual representation of what goes in and comes out
- Key Indicators: Visual signs that the step is working correctly
- Transition: How the process "moves" to the next step

Create a visual process description that makes abstract steps concrete through familiar ${primaryLens} imagery and workflows.`;
  }

  /**
   * Create visual analogies and metaphors
   */
  generateVisualAnalogy(
    abstractConcept: string,
    persona: UserPersona
  ): string {
    const primaryLens = deepPersonalizationEngine.getPrimaryLens(persona);
    const anchors = deepPersonalizationEngine.getContextualAnchors(persona);

    return `Create a vivid visual analogy for "${abstractConcept}" using rich imagery from ${primaryLens}.

VISUAL ANALOGY CONSTRUCTION:
Source Domain: ${primaryLens}
Visual Elements: ${anchors.places.slice(0, 2).join(', ')}, ${anchors.domains.slice(0, 2).join(', ')}
Target Concept: ${abstractConcept}

ANALOGY STRUCTURE:
1. Visual Scene Setup: Paint a detailed ${primaryLens} scene
2. Key Visual Elements: Identify the main visual components
3. Dynamic Relationships: Show how elements interact visually
4. Mapping Connections: Link visual elements to concept aspects
5. Extended Visualization: Develop the analogy with rich detail

VISUAL LANGUAGE TECHNIQUES:
- Use concrete visual details they can immediately picture
- Include movement, color, texture, and spatial relationships
- Build on familiar visual patterns from ${primaryLens}
- Make the analogy "move" and develop over time
- Include sensory details beyond just sight

Create an analogy so visually rich and familiar that the abstract concept becomes immediately concrete and memorable.`;
  }

  /**
   * Generate visual learning aids and diagrams
   */
  generateVisualLearningAid(
    concept: string,
    aidType: 'flowchart' | 'hierarchy' | 'cycle' | 'matrix' | 'timeline',
    persona: UserPersona
  ): string {
    const primaryLens = deepPersonalizationEngine.getPrimaryLens(persona);
    const anchors = deepPersonalizationEngine.getContextualAnchors(persona);

    const aidInstructions = {
      flowchart: `Design a visual flowchart using ${primaryLens} workflow patterns`,
      hierarchy: `Create a visual hierarchy using ${primaryLens} organizational structures`,
      cycle: `Show a visual cycle using ${primaryLens} cyclical processes`,
      matrix: `Build a visual matrix using ${primaryLens} comparison frameworks`,
      timeline: `Construct a visual timeline using ${primaryLens} progression patterns`
    };

    return `Create a ${aidType} visual learning aid for "${concept}" using ${primaryLens} visual conventions.

VISUAL AID DESIGN:
Type: ${aidInstructions[aidType]}
Visual Framework: ${anchors.domains[0]} organizational patterns
Visual Elements: ${anchors.experiences.slice(0, 2).join(', ')}

DESIGN PRINCIPLES:
1. Familiar Visual Language: Use shapes, symbols, and patterns from ${primaryLens}
2. Clear Visual Hierarchy: Apply ${primaryLens} importance indicators
3. Logical Visual Flow: Follow ${primaryLens} reading/scanning patterns
4. Visual Grouping: Use ${primaryLens} categorization methods
5. Interactive Elements: Include visual cues for engagement

VISUAL DESCRIPTION:
- Layout and Structure: How the aid is visually organized
- Visual Elements: Specific shapes, colors, and symbols used
- Connection Methods: How relationships are shown visually
- Information Hierarchy: How importance is indicated visually
- User Interaction: How someone would "read" or use the visual aid

Generate a description so detailed that a visual learner could imagine and mentally construct the learning aid using familiar ${primaryLens} visual conventions.`;
  }

  /**
   * Create visual summaries and infographics
   */
  generateVisualSummary(
    content: string,
    persona: UserPersona,
    summaryStyle: 'infographic' | 'visual-outline' | 'concept-map' | 'visual-story'
  ): string {
    const primaryLens = deepPersonalizationEngine.getPrimaryLens(persona);
    const anchors = deepPersonalizationEngine.getContextualAnchors(persona);

    const styleInstructions = {
      infographic: `Design a visual infographic using ${primaryLens} design aesthetics`,
      'visual-outline': `Create a visual outline using ${primaryLens} organizational patterns`,
      'concept-map': `Build a concept map using ${primaryLens} relationship visualization`,
      'visual-story': `Tell a visual story using ${primaryLens} narrative imagery`
    };

    return `Transform the content into a ${summaryStyle} that visual learners can easily process and remember.

VISUAL SUMMARY APPROACH:
Style: ${styleInstructions[summaryStyle]}
Visual Theme: ${primaryLens}
Design Elements: ${anchors.domains.slice(0, 2).join(', ')}

VISUAL ORGANIZATION:
1. Visual Hierarchy: Use ${primaryLens} importance indicators
2. Information Grouping: Apply ${primaryLens} categorization visuals
3. Flow and Sequence: Follow ${primaryLens} logical progression patterns
4. Visual Emphasis: Use ${primaryLens} highlighting techniques
5. Memory Anchors: Include ${primaryLens} memorable visual elements

CONTENT TO VISUALIZE:
${content.substring(0, 1000)}...

VISUAL SUMMARY STRUCTURE:
- Visual Framework: Overall layout using ${primaryLens} design principles
- Key Visual Elements: Main graphics, icons, and imagery
- Information Architecture: How content is visually organized
- Visual Connections: How relationships are shown
- Call-out Elements: How important points are visually emphasized

Create a visual summary description that helps visual learners see, understand, and remember the content through the rich visual language of ${primaryLens}.`;
  }

  /**
   * Generate visual mnemonics and memory aids
   */
  generateVisualMnemonic(
    informationToRemember: string[],
    persona: UserPersona
  ): string {
    const primaryLens = deepPersonalizationEngine.getPrimaryLens(persona);
    const anchors = deepPersonalizationEngine.getContextualAnchors(persona);

    return `Create visual mnemonics for remembering: ${informationToRemember.join(', ')} using vivid ${primaryLens} imagery.

VISUAL MNEMONIC CONSTRUCTION:
Memory Framework: ${primaryLens}
Visual Anchors: ${anchors.places.slice(0, 3).join(', ')}
Visual Associations: ${anchors.experiences.slice(0, 3).join(', ')}

MNEMONIC TECHNIQUES:
1. Visual Journey: Create a path through familiar ${primaryLens} locations
2. Visual Stories: Build memorable narratives using ${primaryLens} characters/elements
3. Visual Associations: Link information to striking ${primaryLens} images
4. Visual Transformation: Show information changing in memorable ${primaryLens} ways
5. Visual Exaggeration: Use dramatic ${primaryLens} imagery for impact

MNEMONIC STRUCTURE:
For each piece of information:
- Visual Trigger: A vivid ${primaryLens} image that represents the information
- Visual Connection: How it links to the next piece visually
- Memory Palace: Where it "sits" in their ${primaryLens} mental landscape
- Visual Action: What "happens" to make it memorable
- Retrieval Cue: The visual prompt that brings back the information

Create visual mnemonics so vivid and connected to ${primaryLens} that the information becomes impossible to forget.`;
  }

  /**
   * Check if user is a visual learner and needs enhanced visual content
   */
  isVisualLearner(persona: UserPersona): boolean {
    return persona.learningStyle === 'visual' || 
           persona.visualPreference === 'high' ||
           (persona.primaryInterests || []).some(interest => 
             ['design', 'art', 'architecture', 'gaming', 'photography'].includes(interest.toLowerCase())
           );
  }

  /**
   * Generate visual enhancement instructions for any content type
   */
  generateVisualEnhancementInstructions(persona: UserPersona): string {
    if (!this.isVisualLearner(persona)) {
      return ''; // No visual enhancements needed
    }

    const primaryLens = deepPersonalizationEngine.getPrimaryLens(persona);

    return `
VISUAL LEARNER ENHANCEMENTS:
1. Use rich visual descriptions and spatial language
2. Include "picture this" moments with ${primaryLens} imagery
3. Describe concepts using visual metaphors from their domain
4. Use words like "visualize," "imagine," "picture," "see," "appears"
5. Create mental images they can easily form and remember
6. Use visual contrast and comparison language
7. Describe shapes, colors, movements, and spatial relationships
8. Build visual narratives and scenes they can follow mentally

VISUAL LANGUAGE FROM ${primaryLens.toUpperCase()}:
- Use familiar visual elements and imagery
- Reference spatial relationships they understand
- Include movement and dynamic visual descriptions
- Connect to visual patterns and aesthetics from their domain`;
  }
}

export const visualPersonalizationEngine = new VisualPersonalizationEngine();