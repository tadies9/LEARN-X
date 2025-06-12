import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

export class PersonaService {
  async getPersona(userId: string) {
    try {
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error fetching persona:', error);
      throw error;
    }
  }

  async upsertPersona(userId: string, personaData: any) {
    try {
      // Check if persona exists
      const existing = await this.getPersona(userId);

      const dataToSave = {
        user_id: userId,
        professional_context: personaData.professional,
        personal_interests: personaData.interests,
        learning_style: personaData.learningStyle,
        content_preferences: personaData.contentPreferences,
        communication_tone: personaData.communication,
        version: existing ? (existing.version || 0) + 1 : 1,
        updated_at: new Date().toISOString(),
      };

      // If exists, create history entry first
      if (existing) {
        await this.createHistoryEntry(existing);
      }

      const { data, error } = await supabase
        .from('personas')
        .upsert(dataToSave, {
          onConflict: 'user_id',
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      logger.error('Error upserting persona:', error);
      throw error;
    }
  }

  async updateSection(userId: string, section: string, sectionData: any) {
    try {
      const existing = await this.getPersona(userId);

      if (!existing) {
        throw new Error('Persona not found');
      }

      // Create history entry
      await this.createHistoryEntry(existing);

      // Map section names to database columns
      const sectionMap: Record<string, string> = {
        professional: 'professional_context',
        interests: 'personal_interests',
        learningStyle: 'learning_style',
        contentPreferences: 'content_preferences',
        communication: 'communication_tone',
      };

      const columnName = sectionMap[section];
      const updateData = {
        [columnName]: sectionData,
        version: (existing.version || 0) + 1,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('personas')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      logger.error('Error updating persona section:', error);
      throw error;
    }
  }

  async deletePersona(userId: string) {
    try {
      // First delete all history
      await supabase.from('persona_history').delete().eq('user_id', userId);

      // Then delete the persona
      const { error } = await supabase.from('personas').delete().eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error deleting persona:', error);
      throw error;
    }
  }

  async getPersonaHistory(userId: string) {
    try {
      const { data, error } = await supabase
        .from('persona_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('Error fetching persona history:', error);
      throw error;
    }
  }

  private async createHistoryEntry(persona: any) {
    try {
      const historyEntry = {
        user_id: persona.user_id,
        professional_context: persona.professional_context,
        personal_interests: persona.personal_interests,
        learning_style: persona.learning_style,
        content_preferences: persona.content_preferences,
        communication_tone: persona.communication_tone,
        version: persona.version || 1,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('persona_history').insert(historyEntry);

      if (error) throw error;
    } catch (error) {
      logger.error('Error creating persona history entry:', error);
      // Don't throw - history is not critical
    }
  }
}
