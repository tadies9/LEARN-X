"""AI Content Generation Service with streaming support"""
from typing import AsyncIterator, Dict, List, Optional, Any, Union
from dataclasses import dataclass
from datetime import datetime
import json
import re

from structlog import get_logger

from .manager import AIManager, AIModel, Message, CompletionOptions
from ..personalization.persona_engine import PersonaEngine, UserPersona


logger = get_logger()


@dataclass
class ContentChunk:
    """Represents a chunk of document content"""
    id: str
    content: str
    metadata: Dict[str, Any]
    score: float = 1.0


@dataclass
class GenerationOptions:
    """Options for content generation"""
    stream: bool = True
    model: Optional[AIModel] = None
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    use_cache: bool = True
    personalization_level: str = "medium"  # low, medium, high
    include_examples: bool = True
    include_practice: bool = True
    language: str = "en"


class ContentGenerator:
    """Generates personalized educational content"""
    
    # Domain keywords for interest matching
    DOMAIN_KEYWORDS = [
        'technology', 'business', 'science', 'health', 'finance',
        'marketing', 'data', 'programming', 'design', 'education',
        'research', 'engineering', 'mathematics', 'physics', 'chemistry',
        'biology', 'psychology', 'economics', 'politics', 'history'
    ]
    
    def __init__(self, ai_manager: AIManager, persona_engine: PersonaEngine):
        self.ai_manager = ai_manager
        self.persona_engine = persona_engine
        self.template_cache: Dict[str, str] = {}
    
    async def generate_outline(
        self,
        chunks: List[ContentChunk],
        user_id: str,
        options: Optional[GenerationOptions] = None
    ) -> Dict[str, Any]:
        """Generate a learning outline from document chunks"""
        options = options or GenerationOptions()
        
        # Get user persona
        persona = await self.persona_engine.get_persona(user_id)
        if not persona:
            raise ValueError(f"User persona not found for {user_id}")
        
        # Prepare content
        content = self._prepare_content(chunks, limit=8000)
        
        # Build prompt
        prompt = f"""Analyze this document and create a learning outline with 4-6 main topics.

Document content:
{content}

For each topic, provide:
1. A clear, descriptive title
2. 5 subtopics: intro, concepts, examples, practice, summary

Return a JSON object with a "topics" array containing objects with this structure:
{{
  "topics": [{{
    "id": "topic-1",
    "title": "Topic Title Here",
    "description": "Brief description of what this topic covers",
    "subtopics": [
      {{"id": "intro-1", "title": "Introduction", "type": "intro", "completed": false}},
      {{"id": "concepts-1", "title": "Core Concepts", "type": "concepts", "completed": false}},
      {{"id": "examples-1", "title": "Examples", "type": "examples", "completed": false}},
      {{"id": "practice-1", "title": "Practice", "type": "practice", "completed": false}},
      {{"id": "summary-1", "title": "Summary", "type": "summary", "completed": false}}
    ],
    "progress": 0
  }}]
}}"""
        
        # Generate outline
        response = await self.ai_manager.complete(
            messages=[Message(role="user", content=prompt)],
            model=options.model or AIModel.GPT_4O,
            options=CompletionOptions(
                temperature=0.7,
                response_format={"type": "json_object"}
            ),
            user_id=user_id
        )
        
        # Parse response
        try:
            outline_data = json.loads(response.content)
            topics = outline_data.get("topics", [])
            
            # Ensure proper formatting
            for i, topic in enumerate(topics):
                if not topic.get("id"):
                    topic["id"] = f"topic-{i + 1}"
                
                # Ensure subtopics have proper IDs
                if topic.get("subtopics"):
                    for j, subtopic in enumerate(topic["subtopics"]):
                        if not subtopic.get("id"):
                            subtopic["id"] = f"{subtopic.get('type', 'item')}-{i + 1}"
            
            return outline_data
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse outline JSON: {e}")
            return {"topics": []}
    
    async def generate_explanation_stream(
        self,
        chunks: List[ContentChunk],
        topic: str,
        subtopic: Optional[str],
        user_id: str,
        options: Optional[GenerationOptions] = None
    ) -> AsyncIterator[str]:
        """Generate streaming explanation for a topic"""
        options = options or GenerationOptions()
        
        # Get user persona
        persona = await self.persona_engine.get_persona(user_id)
        if not persona:
            raise ValueError(f"User persona not found for {user_id}")
        
        # Select relevant interests
        relevant_interests = self._select_relevant_interests(
            persona, chunks, topic
        )
        
        # Build system prompt
        system_prompt = self._build_system_prompt(
            persona, relevant_interests, options
        )
        
        # Build user prompt
        content = self._prepare_content(chunks)
        user_prompt = self._build_explanation_prompt(
            content, topic, subtopic, persona, relevant_interests, options
        )
        
        # Generate streaming response
        messages = [
            Message(role="system", content=system_prompt),
            Message(role="user", content=user_prompt)
        ]
        
        async for chunk in self.ai_manager.complete_stream(
            messages=messages,
            model=options.model or AIModel.GPT_4O,
            options=CompletionOptions(
                temperature=options.temperature,
                max_tokens=options.max_tokens or 2000
            ),
            user_id=user_id
        ):
            yield chunk
    
    async def generate_summary(
        self,
        chunks: List[ContentChunk],
        topic: str,
        user_id: str,
        options: Optional[GenerationOptions] = None
    ) -> str:
        """Generate a concise summary"""
        options = options or GenerationOptions()
        
        # Get user persona
        persona = await self.persona_engine.get_persona(user_id)
        if not persona:
            raise ValueError(f"User persona not found for {user_id}")
        
        # Prepare content
        content = self._prepare_content(chunks, limit=4000)
        
        # Build prompt
        prompt = f"""Create a concise summary of the following content about {topic}.

Content:
{content}

Requirements:
- 3-5 key points
- Clear and concise language
- Focus on practical takeaways
- Suitable for someone with {persona.technical_level or 'intermediate'} technical background"""
        
        # Generate summary
        response = await self.ai_manager.complete(
            messages=[Message(role="user", content=prompt)],
            model=options.model or AIModel.GPT_4_TURBO,
            options=CompletionOptions(
                temperature=0.5,
                max_tokens=500
            ),
            user_id=user_id
        )
        
        return response.content
    
    async def generate_flashcards(
        self,
        chunks: List[ContentChunk],
        topic: str,
        user_id: str,
        count: int = 10,
        options: Optional[GenerationOptions] = None
    ) -> List[Dict[str, str]]:
        """Generate flashcards for studying"""
        options = options or GenerationOptions()
        
        # Get user persona
        persona = await self.persona_engine.get_persona(user_id)
        if not persona:
            raise ValueError(f"User persona not found for {user_id}")
        
        # Prepare content
        content = self._prepare_content(chunks, limit=4000)
        
        # Build prompt
        prompt = f"""Create {count} flashcards from the following content about {topic}.

Content:
{content}

Requirements:
- Each flashcard should have a clear question and answer
- Focus on key concepts and definitions
- Suitable for {persona.technical_level or 'intermediate'} level
- Mix of factual and conceptual questions

Return as JSON array:
[
  {{"question": "...", "answer": "...", "difficulty": "easy|medium|hard"}},
  ...
]"""
        
        # Generate flashcards
        response = await self.ai_manager.complete(
            messages=[Message(role="user", content=prompt)],
            model=options.model or AIModel.GPT_4_TURBO,
            options=CompletionOptions(
                temperature=0.7,
                response_format={"type": "json_object"}
            ),
            user_id=user_id
        )
        
        try:
            # Try parsing as array first
            flashcards = json.loads(response.content)
            if isinstance(flashcards, dict):
                # If it's wrapped in an object, extract the array
                flashcards = flashcards.get("flashcards", [])
            return flashcards
        except json.JSONDecodeError:
            logger.error("Failed to parse flashcards JSON")
            return []
    
    async def generate_quiz(
        self,
        chunks: List[ContentChunk],
        topic: str,
        user_id: str,
        questions: int = 5,
        options: Optional[GenerationOptions] = None
    ) -> List[Dict[str, Any]]:
        """Generate quiz questions"""
        options = options or GenerationOptions()
        
        # Get user persona
        persona = await self.persona_engine.get_persona(user_id)
        if not persona:
            raise ValueError(f"User persona not found for {user_id}")
        
        # Prepare content
        content = self._prepare_content(chunks, limit=4000)
        
        # Build prompt
        prompt = f"""Create {questions} multiple-choice quiz questions from the following content about {topic}.

Content:
{content}

Requirements:
- Each question should have 4 options (A, B, C, D)
- Only one correct answer per question
- Include explanation for the correct answer
- Suitable for {persona.technical_level or 'intermediate'} level
- Mix of difficulty levels

Return as JSON array:
[
  {{
    "question": "...",
    "options": {{
      "A": "...",
      "B": "...",
      "C": "...",
      "D": "..."
    }},
    "correct": "A",
    "explanation": "...",
    "difficulty": "easy|medium|hard"
  }},
  ...
]"""
        
        # Generate quiz
        response = await self.ai_manager.complete(
            messages=[Message(role="user", content=prompt)],
            model=options.model or AIModel.GPT_4_TURBO,
            options=CompletionOptions(
                temperature=0.7,
                response_format={"type": "json_object"}
            ),
            user_id=user_id
        )
        
        try:
            # Try parsing as array first
            quiz_data = json.loads(response.content)
            if isinstance(quiz_data, dict):
                # If it's wrapped in an object, extract the array
                quiz_data = quiz_data.get("questions", quiz_data.get("quiz", []))
            return quiz_data
        except json.JSONDecodeError:
            logger.error("Failed to parse quiz JSON")
            return []
    
    async def generate_practice_exercises(
        self,
        chunks: List[ContentChunk],
        topic: str,
        user_id: str,
        count: int = 3,
        options: Optional[GenerationOptions] = None
    ) -> List[Dict[str, Any]]:
        """Generate practice exercises"""
        options = options or GenerationOptions()
        
        # Get user persona
        persona = await self.persona_engine.get_persona(user_id)
        if not persona:
            raise ValueError(f"User persona not found for {user_id}")
        
        # Prepare content
        content = self._prepare_content(chunks, limit=4000)
        
        # Build prompt based on persona interests
        interests_context = ""
        if persona.primary_interests:
            interests_context = f"\nRelate exercises to these interests when possible: {', '.join(persona.primary_interests[:2])}"
        
        prompt = f"""Create {count} practice exercises based on the following content about {topic}.

Content:
{content}

Requirements:
- Each exercise should be hands-on and practical
- Include clear instructions
- Provide expected outcomes or solutions
- Suitable for {persona.technical_level or 'intermediate'} level
- Progressive difficulty{interests_context}

Return as JSON array:
[
  {{
    "title": "...",
    "description": "...",
    "instructions": ["step 1", "step 2", ...],
    "expected_outcome": "...",
    "hints": ["hint 1", "hint 2"],
    "difficulty": "easy|medium|hard"
  }},
  ...
]"""
        
        # Generate exercises
        response = await self.ai_manager.complete(
            messages=[Message(role="user", content=prompt)],
            model=options.model or AIModel.GPT_4O,
            options=CompletionOptions(
                temperature=0.8,
                response_format={"type": "json_object"}
            ),
            user_id=user_id
        )
        
        try:
            exercises = json.loads(response.content)
            if isinstance(exercises, dict):
                exercises = exercises.get("exercises", [])
            return exercises
        except json.JSONDecodeError:
            logger.error("Failed to parse exercises JSON")
            return []
    
    def _prepare_content(
        self,
        chunks: List[ContentChunk],
        limit: Optional[int] = None
    ) -> str:
        """Prepare content from chunks"""
        # Sort by score if available
        sorted_chunks = sorted(chunks, key=lambda c: c.score, reverse=True)
        
        # Combine content
        content_parts = []
        total_length = 0
        
        for chunk in sorted_chunks:
            chunk_content = chunk.content.strip()
            if limit and total_length + len(chunk_content) > limit:
                # Add partial content if there's room
                remaining = limit - total_length
                if remaining > 100:
                    content_parts.append(chunk_content[:remaining] + "...")
                break
            
            content_parts.append(chunk_content)
            total_length += len(chunk_content)
        
        return "\n\n".join(content_parts)
    
    def _select_relevant_interests(
        self,
        persona: UserPersona,
        chunks: List[ContentChunk],
        topic: str
    ) -> List[str]:
        """Select most relevant interests based on content"""
        all_interests = [
            *(persona.primary_interests or []),
            *(persona.secondary_interests or []),
            *(persona.learning_goals or [])
        ]
        
        if not all_interests:
            return []
        
        # Create content text for matching
        content_text = f"{topic} {self._prepare_content(chunks, limit=2000)}".lower()
        
        # Score interests by relevance
        scored_interests = []
        for interest in all_interests:
            score = 0
            interest_words = interest.lower().split()
            
            # Higher score for primary interests
            if persona.primary_interests and interest in persona.primary_interests:
                score += 2
            
            # Score based on word matches
            for word in interest_words:
                if word in content_text:
                    score += 3
            
            # Bonus for domain matches
            for keyword in self.DOMAIN_KEYWORDS:
                if keyword in interest.lower() and keyword in content_text:
                    score += 2
            
            if score > 0:
                scored_interests.append((interest, score))
        
        # Sort and select top interests
        scored_interests.sort(key=lambda x: x[1], reverse=True)
        selected = [interest for interest, _ in scored_interests[:4]]
        
        # Ensure minimum interests
        if len(selected) < 2 and len(all_interests) >= 2:
            remaining = [i for i in all_interests if i not in selected]
            selected.extend(remaining[:2 - len(selected)])
        
        return selected
    
    def _build_system_prompt(
        self,
        persona: UserPersona,
        relevant_interests: List[str],
        options: GenerationOptions
    ) -> str:
        """Build system prompt for AI"""
        interest_context = ""
        if relevant_interests:
            interest_context = f"Student's interests: {', '.join(relevant_interests)}"
        
        communication_style = self._get_communication_style(persona)
        
        prompt = f"""You are an expert educator creating personalized learning content.

{interest_context}

Communication style: {communication_style}
Technical level: {persona.technical_level or 'intermediate'}
Learning style: {persona.learning_style or 'mixed'}

Guidelines:
1. Use clear, engaging language appropriate for the technical level
2. When possible, relate concepts to the student's interests
3. Include practical examples and real-world applications
4. Break down complex topics into digestible parts
5. Use the specified communication tone throughout

Remember: The goal is to make learning engaging and effective."""
        
        return prompt
    
    def _build_explanation_prompt(
        self,
        content: str,
        topic: str,
        subtopic: Optional[str],
        persona: UserPersona,
        relevant_interests: List[str],
        options: GenerationOptions
    ) -> str:
        """Build prompt for generating explanations"""
        subtopic_context = f" - {subtopic}" if subtopic else ""
        
        # Interest examples
        interest_examples = ""
        if relevant_interests and options.include_examples:
            interest_examples = f"\nUse examples related to: {', '.join(relevant_interests[:2])}"
        
        # Practice context
        practice_context = ""
        if options.include_practice:
            practice_context = "\nInclude a practical exercise or hands-on activity"
        
        prompt = f"""Explain the following content about {topic}{subtopic_context}:

{content}

Requirements:
- Technical level: {persona.technical_level or 'intermediate'}
- Make it engaging and easy to understand
- Use analogies and metaphors where helpful{interest_examples}{practice_context}
- Focus on practical understanding over theory
- Structure with clear sections and formatting

Provide a comprehensive explanation that helps the student truly understand the concepts."""
        
        return prompt
    
    def _get_communication_style(self, persona: UserPersona) -> str:
        """Get appropriate communication style"""
        style = persona.communication_tone or "balanced"
        
        style_map = {
            "formal": "Professional and structured, with clear definitions",
            "casual": "Friendly and conversational, like explaining to a colleague",
            "encouraging": "Supportive and motivating, celebrating progress",
            "balanced": "Clear and approachable, mixing professionalism with warmth",
            "direct": "Concise and to-the-point, focusing on key information"
        }
        
        return style_map.get(style, style_map["balanced"])