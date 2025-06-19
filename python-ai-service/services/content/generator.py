"""
Advanced content generation service.
Handles specialized content types with personalization and streaming.
"""

from typing import Dict, List, Optional, AsyncIterator, Any, Union
from dataclasses import dataclass
from enum import Enum
import json
import asyncio
from datetime import datetime

from structlog import get_logger

from services.ai.manager import AIManager
from services.ai.providers.base import AIModel, Message, CompletionOptions

logger = get_logger()


class ContentType(str, Enum):
    """Supported content types"""
    EXPLANATION = "explanation"
    SUMMARY = "summary"
    QUIZ = "quiz"
    FLASHCARDS = "flashcards"
    OUTLINE = "outline"
    EXAMPLES = "examples"
    PRACTICE = "practice"


class DifficultyLevel(str, Enum):
    """Content difficulty levels"""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate" 
    ADVANCED = "advanced"


@dataclass
class ContentRequest:
    """Content generation request"""
    content: str
    content_type: ContentType
    topic: Optional[str] = None
    difficulty: DifficultyLevel = DifficultyLevel.INTERMEDIATE
    persona: Optional[Dict[str, Any]] = None
    model: Optional[AIModel] = None
    temperature: float = 0.7
    max_tokens: int = 2000
    user_id: Optional[str] = None


@dataclass  
class ContentChunk:
    """Structured content chunk"""
    id: str
    content: str
    position: int
    metadata: Dict[str, Any]


class ContentGenerator:
    """Advanced content generation with personalization"""
    
    def __init__(self, ai_manager: AIManager):
        self.ai_manager = ai_manager
        self._templates = self._load_templates()
    
    async def generate_content(
        self,
        request: ContentRequest,
        stream: bool = True
    ) -> Union[str, AsyncIterator[str]]:
        """Generate content based on request"""
        try:
            messages = self._build_messages(request)
            options = CompletionOptions(
                temperature=request.temperature,
                max_tokens=request.max_tokens
            )
            
            if stream:
                return self._stream_content(messages, request, options)
            else:
                response = await self.ai_manager.complete(
                    messages=messages,
                    model=request.model,
                    options=options,
                    user_id=request.user_id
                )
                return response.content
                
        except Exception as e:
            logger.error(f"Content generation failed: {e}")
            raise
    
    async def _stream_content(
        self,
        messages: List[Message],
        request: ContentRequest,
        options: CompletionOptions
    ) -> AsyncIterator[str]:
        """Stream content generation with metadata"""
        try:
            chunk_id = 0
            current_content = ""
            
            async for chunk in self.ai_manager.complete_stream(
                messages=messages,
                model=request.model,
                options=options,
                user_id=request.user_id
            ):
                current_content += chunk
                
                # Yield structured chunk
                yield json.dumps({
                    "id": f"chunk_{chunk_id}",
                    "content": chunk,
                    "type": request.content_type.value,
                    "timestamp": datetime.utcnow().isoformat()
                })
                
                chunk_id += 1
            
            # Final metadata
            yield json.dumps({
                "done": True,
                "total_chunks": chunk_id,
                "total_length": len(current_content),
                "content_type": request.content_type.value
            })
            
        except Exception as e:
            logger.error(f"Streaming content generation failed: {e}")
            yield json.dumps({"error": str(e)})
    
    def _build_messages(self, request: ContentRequest) -> List[Message]:
        """Build optimized messages for content type"""
        system_prompt = self._get_system_prompt(request)
        user_prompt = self._get_user_prompt(request)
        
        return [
            Message(role="system", content=system_prompt),
            Message(role="user", content=user_prompt)
        ]
    
    def _get_system_prompt(self, request: ContentRequest) -> str:
        """Get specialized system prompt"""
        template = self._templates["system"][request.content_type.value]
        
        prompt = template.format(
            difficulty=request.difficulty.value,
            topic=request.topic or "the given material"
        )
        
        # Add persona context
        if request.persona:
            persona_context = self._format_persona_context(request.persona)
            prompt += f"\n\nUser Context:\n{persona_context}"
        
        return prompt
    
    def _get_user_prompt(self, request: ContentRequest) -> str:
        """Build user prompt with content"""
        template = self._templates["user"][request.content_type.value]
        
        return template.format(
            content=request.content,
            topic=request.topic or "the material",
            difficulty=request.difficulty.value
        )
    
    def _format_persona_context(self, persona: Dict[str, Any]) -> str:
        """Format persona for system prompt"""
        context_parts = []
        
        if "learning_style" in persona:
            style = persona["learning_style"]
            context_parts.append(f"Learning Style: {style}")
            
            # Add style-specific instructions
            if style == "visual":
                context_parts.append("- Use diagrams, charts, and visual metaphors")
                context_parts.append("- Include step-by-step visual breakdowns")
            elif style == "auditory":
                context_parts.append("- Use conversational tone and verbal patterns")
                context_parts.append("- Include rhythm and repetition")
            elif style == "kinesthetic":
                context_parts.append("- Include hands-on examples and activities")
                context_parts.append("- Use physical analogies and real-world applications")
        
        if "academic_level" in persona:
            level = persona["academic_level"]
            context_parts.append(f"Academic Level: {level}")
            
            # Add level-specific vocabulary guidance
            if level in ["high_school", "undergraduate"]:
                context_parts.append("- Use clear, accessible language")
                context_parts.append("- Define technical terms when introduced")
            elif level == "graduate":
                context_parts.append("- Use advanced terminology appropriately")
                context_parts.append("- Assume familiarity with foundational concepts")
        
        if "interests" in persona and persona["interests"]:
            interests = ", ".join(persona["interests"])
            context_parts.append(f"Interests: {interests}")
            context_parts.append("- Connect concepts to user's interests when possible")
        
        if "professional_context" in persona:
            context = persona["professional_context"]
            context_parts.append(f"Professional Context: {context}")
            context_parts.append("- Include relevant professional applications")
        
        return "\n".join(context_parts)
    
    def _load_templates(self) -> Dict[str, Dict[str, str]]:
        """Load content generation templates"""
        return {
            "system": {
                "explanation": """You are an expert educator creating {difficulty}-level explanations.
Your goal is to make complex concepts clear and engaging for learners.

Guidelines:
- Break down complex ideas into digestible parts
- Use clear, logical progression
- Include relevant examples and analogies
- Maintain appropriate depth for {difficulty} level
- Encourage active learning and curiosity""",

                "summary": """You are an expert at creating comprehensive yet concise summaries.
Create {difficulty}-level summaries that capture essential information.

Guidelines:
- Identify and highlight key concepts
- Organize information logically
- Use bullet points and structure for clarity
- Include connections between ideas
- Maintain focus on most important points""",

                "quiz": """You are an expert educator creating {difficulty}-level quiz questions.
Design questions that test understanding and promote learning.

Guidelines:
- Create varied question types (multiple choice, short answer, analysis)
- Focus on understanding, not just memorization
- Include questions that build on each other
- Provide clear, educational explanations for answers
- Match difficulty to {difficulty} level""",

                "flashcards": """You are creating effective {difficulty}-level flashcards for active recall.
Design cards that promote deep learning and retention.

Guidelines:
- Use clear, concise questions on front
- Provide comprehensive answers on back
- Focus on key concepts and relationships
- Include memory aids and mnemonics
- Create cards that build understanding progressively""",

                "outline": """You are creating a structured {difficulty}-level outline for learning.
Organize information in a clear, hierarchical format.

Guidelines:  
- Use clear hierarchy (main topics, subtopics, details)
- Ensure logical flow and progression
- Include key concepts at each level
- Balance depth with clarity
- Make it easy to follow and reference""",

                "examples": """You are providing {difficulty}-level examples to illustrate concepts.
Create varied, relevant examples that enhance understanding.

Guidelines:
- Use diverse, relatable examples
- Show different applications of concepts
- Include step-by-step breakdowns
- Connect examples to real-world scenarios
- Progress from simple to complex examples""",

                "practice": """You are creating {difficulty}-level practice problems and exercises.
Design activities that reinforce learning through application.

Guidelines:
- Create varied problem types and scenarios
- Include both guided and independent practice
- Provide clear instructions and expected outcomes
- Build complexity gradually
- Include reflection questions for deeper learning"""
            },
            
            "user": {
                "explanation": "Please explain the following {difficulty}-level material about {topic}. Make it clear and engaging:\n\n{content}",
                
                "summary": "Please create a {difficulty}-level summary of the following material about {topic}:\n\n{content}",
                
                "quiz": "Please create {difficulty}-level quiz questions based on this material about {topic}:\n\n{content}",
                
                "flashcards": "Please create {difficulty}-level flashcards for studying this material about {topic}:\n\n{content}",
                
                "outline": "Please create a {difficulty}-level outline organizing this material about {topic}:\n\n{content}",
                
                "examples": "Please provide {difficulty}-level examples to illustrate the concepts in this material about {topic}:\n\n{content}",
                
                "practice": "Please create {difficulty}-level practice exercises based on this material about {topic}:\n\n{content}"
            }
        }


class StreamingContentProcessor:
    """Process streaming content with real-time enhancements"""
    
    def __init__(self):
        self.processors = {
            ContentType.QUIZ: self._process_quiz_stream,
            ContentType.FLASHCARDS: self._process_flashcard_stream,
            ContentType.OUTLINE: self._process_outline_stream,
        }
    
    async def process_stream(
        self,
        content_stream: AsyncIterator[str],
        content_type: ContentType
    ) -> AsyncIterator[Dict[str, Any]]:
        """Process streaming content with type-specific enhancements"""
        processor = self.processors.get(content_type, self._process_default_stream)
        
        async for enhanced_chunk in processor(content_stream):
            yield enhanced_chunk
    
    async def _process_default_stream(
        self,
        content_stream: AsyncIterator[str]
    ) -> AsyncIterator[Dict[str, Any]]:
        """Default stream processing"""
        async for chunk in content_stream:
            try:
                data = json.loads(chunk)
                yield data
            except json.JSONDecodeError:
                yield {"content": chunk}
    
    async def _process_quiz_stream(
        self,
        content_stream: AsyncIterator[str]
    ) -> AsyncIterator[Dict[str, Any]]:
        """Process quiz content with question extraction"""
        current_question = ""
        question_count = 0
        
        async for chunk in content_stream:
            try:
                data = json.loads(chunk)
                
                if "content" in data:
                    current_question += data["content"]
                    
                    # Detect question boundaries
                    if self._is_question_boundary(current_question):
                        question_count += 1
                        data["question_number"] = question_count
                        data["partial_question"] = current_question.strip()
                        current_question = ""
                
                yield data
                
            except json.JSONDecodeError:
                current_question += chunk
                yield {"content": chunk}
    
    async def _process_flashcard_stream(
        self,
        content_stream: AsyncIterator[str]
    ) -> AsyncIterator[Dict[str, Any]]:
        """Process flashcard content with card extraction"""
        current_card = ""
        card_count = 0
        
        async for chunk in content_stream:
            try:
                data = json.loads(chunk)
                
                if "content" in data:
                    current_card += data["content"]
                    
                    # Detect card boundaries
                    if self._is_card_boundary(current_card):
                        card_count += 1
                        data["card_number"] = card_count
                        data["partial_card"] = current_card.strip()
                        current_card = ""
                
                yield data
                
            except json.JSONDecodeError:
                current_card += chunk
                yield {"content": chunk}
    
    async def _process_outline_stream(
        self,
        content_stream: AsyncIterator[str]
    ) -> AsyncIterator[Dict[str, Any]]:
        """Process outline content with structure detection"""
        current_section = ""
        section_level = 0
        
        async for chunk in content_stream:
            try:
                data = json.loads(chunk)
                
                if "content" in data:
                    current_section += data["content"]
                    
                    # Detect outline structure
                    new_level = self._detect_outline_level(data["content"])
                    if new_level != section_level:
                        data["structure_change"] = True
                        data["section_level"] = new_level
                        section_level = new_level
                
                yield data
                
            except json.JSONDecodeError:
                current_section += chunk
                yield {"content": chunk}
    
    def _is_question_boundary(self, text: str) -> bool:
        """Detect if text contains a complete question"""
        question_markers = ["?", "\n\n", "Question", "Q:", "A:"]
        return any(marker in text for marker in question_markers)
    
    def _is_card_boundary(self, text: str) -> bool:
        """Detect if text contains a complete flashcard"""
        card_markers = ["Front:", "Back:", "Answer:", "\n---", "Card"]
        return any(marker in text for marker in card_markers)
    
    def _detect_outline_level(self, chunk: str) -> int:
        """Detect outline hierarchy level from text chunk"""
        # Count leading markers (-, *, #, etc.)
        lines = chunk.split('\n')
        for line in lines:
            stripped = line.lstrip()
            if stripped:
                leading_chars = len(line) - len(stripped)
                if line.strip().startswith(('#', '-', '*')):
                    return leading_chars // 2  # Estimate level
        return 0