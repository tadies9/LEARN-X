"""
Content generation handler for PGMQ.
Generates personalized content using AI models and persona context.
"""

from typing import Any, Dict, List, Optional
from datetime import datetime
import json
import asyncpg

from core.logging import get_logger
from services.queue.pgmq_client import PGMQClient, PGMQMessage
from services.ai.persona_prompt_builder import PersonaPromptBuilder
from services.ai.openai_client import OpenAIClient

logger = get_logger(__name__)


class ContentGenerationHandler:
    """
    Handler for content generation jobs.
    Integrates persona context with AI generation.
    """
    
    def __init__(self, pgmq_client: PGMQClient, db_pool: asyncpg.Pool):
        self.pgmq = pgmq_client
        self.db_pool = db_pool
        self.prompt_builder = PersonaPromptBuilder()
        self.openai_client = OpenAIClient()
        logger.info("ContentGenerationHandler initialized with persona support")
        
    async def process(self, message: PGMQMessage) -> None:
        """
        Process a content generation job.
        
        Args:
            message: PGMQ message containing job details
        """
        start_time = datetime.utcnow()
        msg_data = message.message
        options = msg_data.get('processing_options', {})
        
        job_id = options.get('jobId')
        file_id = msg_data.get('file_id')
        user_id = msg_data.get('user_id')
        output_type = options.get('outputType')
        persona_id = options.get('personaId')
        
        logger.info(
            "Processing content generation job",
            job_id=job_id,
            file_id=file_id,
            output_type=output_type,
            persona_id=persona_id,
            msg_id=message.msg_id
        )
        
        try:
            # 1. Fetch file chunks from database
            chunks = await self._fetch_file_chunks(file_id)
            if not chunks:
                raise ValueError(f"No chunks found for file {file_id}")
            
            # 2. Fetch persona data if provided
            persona_data = None
            if persona_id:
                persona_data = await self._fetch_persona_data(persona_id, user_id)
            
            # 3. Build persona-aware prompt
            prompt = self.prompt_builder.build_prompt(
                chunks=[chunk['content'] for chunk in chunks],
                output_type=output_type,
                persona_data=persona_data,
                additional_context={
                    'file_id': file_id,
                    'chunk_count': len(chunks)
                }
            )
            
            # 4. Generate content using AI
            generated_content = await self._generate_content(prompt, output_type)
            
            # 5. Store the result
            await self._store_generation_result(
                job_id=job_id,
                file_id=file_id,
                output_type=output_type,
                result=generated_content,
                processing_time=(datetime.utcnow() - start_time).total_seconds()
            )
            
            logger.info(
                "Content generation completed successfully",
                job_id=job_id,
                file_id=file_id,
                output_type=output_type,
                processing_time=(datetime.utcnow() - start_time).total_seconds()
            )
            
        except Exception as e:
            logger.error(
                "Content generation failed",
                job_id=job_id,
                file_id=file_id,
                error=str(e),
                error_type=type(e).__name__
            )
            
            # Store error result
            await self._store_generation_error(job_id, file_id, output_type, str(e))
            raise
    
    async def _fetch_file_chunks(self, file_id: str) -> List[Dict[str, Any]]:
        """Fetch chunks for a file from the database"""
        async with self.db_pool.acquire() as conn:
            query = """
                SELECT id, content, chunk_index, chunk_type, importance, 
                       section_title, metadata
                FROM file_chunks
                WHERE file_id = $1
                ORDER BY chunk_index
            """
            rows = await conn.fetch(query, file_id)
            
            return [dict(row) for row in rows]
    
    async def _fetch_persona_data(self, persona_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Fetch persona data from the database"""
        async with self.db_pool.acquire() as conn:
            query = """
                SELECT id, persona_name, professional_context, learning_style,
                       content_preferences, communication_tone, personal_interests,
                       created_at, updated_at
                FROM user_personas
                WHERE id = $1 AND user_id = $2
            """
            row = await conn.fetchrow(query, persona_id, user_id)
            
            if not row:
                logger.warning(
                    "Persona not found or access denied",
                    persona_id=persona_id,
                    user_id=user_id
                )
                return None
            
            return dict(row)
    
    async def _generate_content(self, prompt: str, output_type: str) -> Dict[str, Any]:
        """Generate content using OpenAI"""
        try:
            # Use appropriate model parameters based on output type
            model_params = self._get_model_params(output_type)
            
            response = await self.openai_client.generate(
                prompt=prompt,
                **model_params
            )
            
            # Parse and structure the response based on output type
            return self._parse_generated_content(response, output_type)
            
        except Exception as e:
            logger.error(
                "AI generation failed",
                output_type=output_type,
                error=str(e)
            )
            raise
    
    def _get_model_params(self, output_type: str) -> Dict[str, Any]:
        """Get model parameters based on output type"""
        base_params = {
            'model': 'gpt-4',
            'temperature': 0.7,
            'max_tokens': 2000
        }
        
        # Adjust parameters based on output type
        if output_type == 'flashcards':
            base_params['temperature'] = 0.5  # More consistent for flashcards
            base_params['max_tokens'] = 1500
        elif output_type == 'quiz':
            base_params['temperature'] = 0.6
            base_params['max_tokens'] = 2500
        elif output_type == 'summary':
            base_params['temperature'] = 0.3  # More focused for summaries
            base_params['max_tokens'] = 1000
        elif output_type == 'outline':
            base_params['temperature'] = 0.4
            base_params['max_tokens'] = 1500
        
        return base_params
    
    def _parse_generated_content(self, raw_response: str, output_type: str) -> Dict[str, Any]:
        """Parse AI response into structured format"""
        try:
            # Try to parse as JSON first
            if raw_response.strip().startswith('{') or raw_response.strip().startswith('['):
                return json.loads(raw_response)
        except json.JSONDecodeError:
            pass
        
        # Output type specific parsing
        if output_type == 'flashcards':
            return self._parse_flashcards(raw_response)
        elif output_type == 'quiz':
            return self._parse_quiz(raw_response)
        elif output_type == 'summary':
            return {'summary': raw_response.strip()}
        elif output_type == 'outline':
            return self._parse_outline(raw_response)
        else:
            return {'content': raw_response.strip()}
    
    def _parse_flashcards(self, response: str) -> Dict[str, Any]:
        """Parse flashcards from response"""
        flashcards = []
        current_card = {}
        
        lines = response.strip().split('\n')
        for line in lines:
            line = line.strip()
            if line.lower().startswith('q:') or line.lower().startswith('question:'):
                if current_card and 'question' in current_card:
                    flashcards.append(current_card)
                    current_card = {}
                current_card['question'] = line.split(':', 1)[1].strip()
            elif line.lower().startswith('a:') or line.lower().startswith('answer:'):
                current_card['answer'] = line.split(':', 1)[1].strip()
        
        if current_card and 'question' in current_card:
            flashcards.append(current_card)
        
        return {'flashcards': flashcards}
    
    def _parse_quiz(self, response: str) -> Dict[str, Any]:
        """Parse quiz questions from response"""
        # Simple parsing - in production, use more sophisticated parsing
        questions = []
        lines = response.strip().split('\n')
        
        current_question = None
        for line in lines:
            line = line.strip()
            if line and line[0].isdigit() and '.' in line:
                # New question
                if current_question:
                    questions.append(current_question)
                current_question = {
                    'question': line.split('.', 1)[1].strip(),
                    'options': [],
                    'correct_answer': None,
                    'explanation': ''
                }
            elif current_question and line.startswith(('A)', 'B)', 'C)', 'D)')):
                current_question['options'].append(line[2:].strip())
            elif current_question and line.lower().startswith('correct:'):
                current_question['correct_answer'] = line.split(':', 1)[1].strip()
            elif current_question and line.lower().startswith('explanation:'):
                current_question['explanation'] = line.split(':', 1)[1].strip()
        
        if current_question:
            questions.append(current_question)
        
        return {'questions': questions}
    
    def _parse_outline(self, response: str) -> Dict[str, Any]:
        """Parse outline from response"""
        outline_items = []
        lines = response.strip().split('\n')
        
        for line in lines:
            line = line.strip()
            if line:
                # Detect hierarchy level based on indentation or markers
                level = 0
                if line.startswith('  '):
                    level = len(line) - len(line.lstrip()) // 2
                
                outline_items.append({
                    'level': level,
                    'content': line.strip()
                })
        
        return {'outline': outline_items}
    
    async def _store_generation_result(
        self,
        job_id: str,
        file_id: str,
        output_type: str,
        result: Dict[str, Any],
        processing_time: float
    ) -> None:
        """Store successful generation result"""
        async with self.db_pool.acquire() as conn:
            query = """
                INSERT INTO generation_results 
                (job_id, file_id, output_type, result, processing_time_seconds, created_at)
                VALUES ($1, $2, $3, $4, $5, $6)
            """
            
            await conn.execute(
                query,
                job_id,
                file_id,
                output_type,
                json.dumps(result),
                processing_time,
                datetime.utcnow()
            )
    
    async def _store_generation_error(
        self,
        job_id: str,
        file_id: str,
        output_type: str,
        error_message: str
    ) -> None:
        """Store generation error"""
        async with self.db_pool.acquire() as conn:
            query = """
                INSERT INTO generation_results 
                (job_id, file_id, output_type, error_message, created_at)
                VALUES ($1, $2, $3, $4, $5)
            """
            
            await conn.execute(
                query,
                job_id,
                file_id,
                output_type,
                error_message,
                datetime.utcnow()
            )