"""
Chat Orchestrator - Migrated from Node.js
Handles personalized chat interactions with context awareness
"""

from typing import AsyncIterator, Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime
import json
import asyncio
from structlog import get_logger

from ...ai.manager import AIManager, AIModel, Message, CompletionOptions
from ...ai.cost_tracker import CostTracker
from ...ai.circuit_breaker import CircuitBreaker
from ...personalization.enhanced_persona_engine import EnhancedPersonaEngine, UserPersona
from ...cache.vector_cache import VectorCache

logger = get_logger()


@dataclass
class ChatMessage:
    """Chat message structure"""
    role: str  # user, assistant, system
    content: str
    timestamp: datetime = datetime.utcnow()
    metadata: Dict[str, Any] = None


@dataclass
class ChatContext:
    """Chat context information"""
    current_page: Optional[int] = None
    selected_text: Optional[str] = None
    document_context: List[str] = None
    conversation_history: List[ChatMessage] = None
    learning_session_id: Optional[str] = None


class ChatOrchestrator:
    """
    Handles personalized chat interactions with full context awareness.
    Migrated from Node.js ChatOrchestrator with enhancements.
    """
    
    def __init__(
        self,
        ai_manager: AIManager,
        persona_engine: EnhancedPersonaEngine,
        cost_tracker: CostTracker,
        cache: Optional[VectorCache] = None
    ):
        self.ai_manager = ai_manager
        self.persona_engine = persona_engine
        self.cost_tracker = cost_tracker
        self.cache = cache
        
        # Circuit breaker for chat services
        self.circuit_breaker = CircuitBreaker(
            failure_threshold=3,
            recovery_timeout=30,
            name="chat_orchestrator"
        )
        
        # Conversation memory (in production, this would be persistent)
        self.conversation_memory: Dict[str, List[ChatMessage]] = {}

    async def stream_personalized_chat(
        self,
        user_id: str,
        message: str,
        context: ChatContext,
        model: Optional[AIModel] = None
    ) -> AsyncIterator[str]:
        """Stream personalized chat response with full context awareness"""
        start_time = datetime.utcnow()
        
        try:
            # Get user persona
            persona = await self.persona_engine.get_persona(user_id)
            
            # Build context-aware system prompt
            system_prompt = await self._build_chat_system_prompt(persona, context)
            
            # Prepare conversation messages
            messages = await self._prepare_conversation_messages(
                user_id, message, system_prompt, context
            )
            
            # Generate streaming response
            async def generate():
                return self.ai_manager.complete_stream(
                    messages=messages,
                    model=model or AIModel.GPT_4O,
                    options=CompletionOptions(
                        temperature=0.7,
                        max_tokens=1000,
                        stream=True
                    ),
                    user_id=user_id
                )
            
            # Stream response and collect for memory
            full_response = ""
            async for chunk in await self.circuit_breaker.call(generate):
                full_response += chunk
                yield chunk
            
            # Store in conversation memory
            await self._update_conversation_memory(user_id, message, full_response, context)
            
            # Track cost
            total_prompt_tokens = sum(self._estimate_tokens(msg.content) for msg in messages)
            await self.cost_tracker.track_request(
                user_id=user_id,
                request_type="chat",
                model=model or AIModel.GPT_4O,
                prompt_tokens=total_prompt_tokens,
                completion_tokens=self._estimate_tokens(full_response),
                response_time_ms=int((datetime.utcnow() - start_time).total_seconds() * 1000)
            )
            
        except Exception as e:
            logger.error(f"Failed to stream personalized chat: {e}")
            raise

    async def get_conversation_summary(
        self,
        user_id: str,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get a summary of the conversation for context"""
        try:
            conversation = self.conversation_memory.get(user_id, [])
            if not conversation:
                return {"summary": "No conversation history", "key_topics": [], "learning_progress": []}
            
            # Take last 10 messages for summary
            recent_messages = conversation[-10:]
            conversation_text = "\n".join([
                f"{msg.role}: {msg.content}" for msg in recent_messages
            ])
            
            # Generate summary prompt
            prompt = f"""Analyze this learning conversation and provide a summary:

CONVERSATION:
{conversation_text}

Provide a JSON response with:
{{
  "summary": "Brief summary of the conversation",
  "key_topics": ["topic1", "topic2", ...],
  "learning_progress": ["concept1 understood", "struggling with concept2", ...],
  "suggested_next_steps": ["suggestion1", "suggestion2", ...]
}}"""
            
            # Get summary from AI
            response = await self.ai_manager.complete(
                messages=[Message(role="user", content=prompt)],
                model=AIModel.GPT_4_TURBO,
                options=CompletionOptions(
                    temperature=0.3,
                    max_tokens=500,
                    response_format={"type": "json_object"}
                ),
                user_id=user_id
            )
            
            return json.loads(response.content)
            
        except Exception as e:
            logger.error(f"Failed to get conversation summary: {e}")
            return {"summary": "Error generating summary", "key_topics": [], "learning_progress": []}

    async def suggest_follow_up_questions(
        self,
        user_id: str,
        current_topic: str,
        context: ChatContext
    ) -> List[str]:
        """Suggest personalized follow-up questions"""
        try:
            persona = await self.persona_engine.get_persona(user_id)
            
            # Build suggestion prompt
            prompt = await self._build_follow_up_prompt(persona, current_topic, context)
            
            # Generate suggestions
            response = await self.ai_manager.complete(
                messages=[Message(role="user", content=prompt)],
                model=AIModel.GPT_4_TURBO,
                options=CompletionOptions(
                    temperature=0.8,
                    max_tokens=400,
                    response_format={"type": "json_object"}
                ),
                user_id=user_id
            )
            
            # Parse suggestions
            data = json.loads(response.content)
            return data.get("questions", [])
            
        except Exception as e:
            logger.error(f"Failed to suggest follow-up questions: {e}")
            return []

    async def handle_clarification_request(
        self,
        user_id: str,
        original_content: str,
        clarification_type: str,  # "simplify", "elaborate", "example", "analogy"
        context: ChatContext
    ) -> str:
        """Handle requests for clarification or different explanations"""
        try:
            persona = await self.persona_engine.get_persona(user_id)
            
            # Build clarification prompt
            prompt = await self._build_clarification_prompt(
                persona, original_content, clarification_type, context
            )
            
            # Generate clarification
            response = await self.ai_manager.complete(
                messages=[Message(role="user", content=prompt)],
                model=AIModel.GPT_4O,
                options=CompletionOptions(
                    temperature=0.7,
                    max_tokens=800
                ),
                user_id=user_id
            )
            
            return response.content
            
        except Exception as e:
            logger.error(f"Failed to handle clarification request: {e}")
            raise

    async def analyze_learning_engagement(
        self,
        user_id: str,
        session_duration: int,
        interaction_count: int
    ) -> Dict[str, Any]:
        """Analyze user engagement and provide insights"""
        try:
            conversation = self.conversation_memory.get(user_id, [])
            
            # Calculate engagement metrics
            engagement_metrics = {
                "session_duration_minutes": session_duration / 60,
                "messages_per_minute": interaction_count / max(session_duration / 60, 1),
                "conversation_depth": len(conversation),
                "avg_message_length": sum(len(msg.content) for msg in conversation) / max(len(conversation), 1),
                "question_to_statement_ratio": self._calculate_question_ratio(conversation)
            }
            
            # Determine engagement level
            engagement_level = self._determine_engagement_level(engagement_metrics)
            
            # Generate recommendations
            recommendations = await self._generate_engagement_recommendations(
                user_id, engagement_level, engagement_metrics
            )
            
            return {
                "engagement_level": engagement_level,
                "metrics": engagement_metrics,
                "recommendations": recommendations
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze learning engagement: {e}")
            return {"engagement_level": "unknown", "metrics": {}, "recommendations": []}

    # Private helper methods
    async def _build_chat_system_prompt(
        self, persona: Optional[UserPersona], context: ChatContext
    ) -> str:
        """Build comprehensive system prompt for chat"""
        if not persona:
            return await self._build_default_chat_prompt(context)
        
        # Get personalization context
        base_prompt = await self.persona_engine.generate_personalization_prompt(
            persona.user_id, "chat", "general discussion"
        )
        
        # Add context-specific information
        context_info = self._build_context_info(context)
        
        return f"""{base_prompt}

CHAT CONTEXT:
{context_info}

CHAT GUIDELINES:
1. Be a supportive learning companion, not just an information provider
2. Ask clarifying questions to understand their specific needs
3. Relate explanations to their professional context and interests
4. Use their preferred communication style consistently
5. Encourage active learning and critical thinking
6. Provide specific, actionable guidance
7. Celebrate learning progress and insights

RESPONSE STYLE:
- Match their communication preferences exactly
- Use examples from their professional domain
- Adapt complexity to their experience level
- Include relevant follow-up questions
- Maintain encouraging and supportive tone

Remember: You're helping them learn, not just answering questions."""

    async def _build_default_chat_prompt(self, context: ChatContext) -> str:
        """Build default prompt when no persona available"""
        context_info = self._build_context_info(context)
        
        return f"""You are an AI learning assistant helping a user understand educational content.

CURRENT CONTEXT:
{context_info}

Be helpful, encouraging, and focused on facilitating learning. Ask clarifying questions and provide practical examples."""

    def _build_context_info(self, context: ChatContext) -> str:
        """Build context information string"""
        context_parts = []
        
        if context.current_page:
            context_parts.append(f"Currently on page {context.current_page}")
        
        if context.selected_text:
            context_parts.append(f"Selected text: \"{context.selected_text[:200]}...\"")
        
        if context.document_context:
            context_parts.append(f"Available content: {len(context.document_context)} sections")
        
        if context.learning_session_id:
            context_parts.append(f"Learning session: {context.learning_session_id}")
        
        return "\n".join(context_parts) if context_parts else "General learning conversation"

    async def _prepare_conversation_messages(
        self,
        user_id: str,
        current_message: str,
        system_prompt: str,
        context: ChatContext
    ) -> List[Message]:
        """Prepare the full conversation for the AI model"""
        messages = [Message(role="system", content=system_prompt)]
        
        # Add conversation history (last 8 messages to stay within token limits)
        conversation = self.conversation_memory.get(user_id, [])
        recent_conversation = conversation[-8:] if len(conversation) > 8 else conversation
        
        for msg in recent_conversation:
            messages.append(Message(role=msg.role, content=msg.content))
        
        # Add document context if available
        if context.document_context:
            context_content = "\n".join(context.document_context[:3])  # Last 3 chunks
            context_message = f"[Document Context]\n{context_content}"
            messages.append(Message(role="system", content=context_message))
        
        # Add current user message
        messages.append(Message(role="user", content=current_message))
        
        return messages

    async def _update_conversation_memory(
        self,
        user_id: str,
        user_message: str,
        assistant_response: str,
        context: ChatContext
    ) -> None:
        """Update conversation memory with new messages"""
        if user_id not in self.conversation_memory:
            self.conversation_memory[user_id] = []
        
        # Add user message
        self.conversation_memory[user_id].append(ChatMessage(
            role="user",
            content=user_message,
            metadata={
                "page": context.current_page,
                "selected_text": context.selected_text,
                "session_id": context.learning_session_id
            }
        ))
        
        # Add assistant response
        self.conversation_memory[user_id].append(ChatMessage(
            role="assistant",
            content=assistant_response
        ))
        
        # Keep only last 50 messages to manage memory
        if len(self.conversation_memory[user_id]) > 50:
            self.conversation_memory[user_id] = self.conversation_memory[user_id][-50:]

    async def _build_follow_up_prompt(
        self, persona: Optional[UserPersona], topic: str, context: ChatContext
    ) -> str:
        """Build prompt for generating follow-up questions"""
        professional_context = ""
        if persona:
            professional_context = f"Professional context: {persona.professional_context.current_role} in {persona.professional_context.industry}"
        
        return f"""Generate 3-4 thoughtful follow-up questions about "{topic}" for this learner.

{professional_context}

CONTEXT:
{self._build_context_info(context)}

Requirements:
1. Questions should deepen understanding of the topic
2. Match their professional context and experience level
3. Encourage practical application and critical thinking
4. Progress from current understanding to advanced concepts
5. Be specific and actionable

Return as JSON:
{{
  "questions": [
    "How might you apply this concept in your current role?",
    "What challenges do you foresee when implementing this?",
    ...
  ]
}}"""

    async def _build_clarification_prompt(
        self,
        persona: Optional[UserPersona],
        original_content: str,
        clarification_type: str,
        context: ChatContext
    ) -> str:
        """Build prompt for clarification requests"""
        clarification_instructions = {
            "simplify": "Explain this in simpler terms with basic examples",
            "elaborate": "Provide more detailed explanation with additional context",
            "example": "Give concrete, practical examples of this concept",
            "analogy": "Use analogies or metaphors to explain this concept"
        }
        
        instruction = clarification_instructions.get(
            clarification_type, 
            "Provide additional clarification"
        )
        
        professional_context = ""
        if persona:
            professional_context = f"""
LEARNER CONTEXT:
- Role: {persona.professional_context.current_role}
- Industry: {persona.professional_context.industry}
- Experience: {persona.experience_level}
- Communication Style: {persona.communication_style.preferred_tone.value}"""
        
        return f"""{instruction} for the following content:

{professional_context}

ORIGINAL CONTENT:
{original_content}

CLARIFICATION TYPE: {clarification_type}

Provide a {clarification_type} that helps the learner understand better. Make it relevant to their professional context if applicable."""

    def _calculate_question_ratio(self, conversation: List[ChatMessage]) -> float:
        """Calculate ratio of questions to statements in conversation"""
        if not conversation:
            return 0.0
        
        user_messages = [msg for msg in conversation if msg.role == "user"]
        if not user_messages:
            return 0.0
        
        question_count = sum(1 for msg in user_messages if "?" in msg.content)
        return question_count / len(user_messages)

    def _determine_engagement_level(self, metrics: Dict[str, Any]) -> str:
        """Determine engagement level based on metrics"""
        score = 0
        
        # Messages per minute
        mpm = metrics.get("messages_per_minute", 0)
        if mpm > 2:
            score += 2
        elif mpm > 1:
            score += 1
        
        # Conversation depth
        depth = metrics.get("conversation_depth", 0)
        if depth > 20:
            score += 2
        elif depth > 10:
            score += 1
        
        # Question ratio
        q_ratio = metrics.get("question_to_statement_ratio", 0)
        if q_ratio > 0.3:
            score += 2
        elif q_ratio > 0.1:
            score += 1
        
        # Average message length
        avg_length = metrics.get("avg_message_length", 0)
        if avg_length > 100:
            score += 1
        
        if score >= 5:
            return "high"
        elif score >= 3:
            return "medium"
        else:
            return "low"

    async def _generate_engagement_recommendations(
        self,
        user_id: str,
        engagement_level: str,
        metrics: Dict[str, Any]
    ) -> List[str]:
        """Generate recommendations based on engagement analysis"""
        recommendations = []
        
        if engagement_level == "low":
            recommendations.extend([
                "Try asking more specific questions about concepts you're learning",
                "Consider taking short breaks to maintain focus",
                "Ask for examples related to your work or interests"
            ])
        elif engagement_level == "medium":
            recommendations.extend([
                "You're doing well! Try diving deeper into topics that interest you",
                "Consider applying concepts to real scenarios from your work",
                "Ask for practice exercises to reinforce learning"
            ])
        else:  # high engagement
            recommendations.extend([
                "Excellent engagement! Consider exploring advanced topics",
                "Try teaching concepts back to test your understanding",
                "Look for connections between different topics you're learning"
            ])
        
        return recommendations

    def _estimate_tokens(self, text: str) -> int:
        """Estimate token count"""
        return int(len(text.split()) * 1.3)