-- Add persona_id to generation_jobs table
ALTER TABLE generation_jobs
ADD COLUMN persona_id UUID REFERENCES personas(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_generation_jobs_persona_id ON generation_jobs(persona_id);
