import { Request, Response } from 'express';
import { PersonaService } from '../services/personaService';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export class PersonaController {
  private personaService: PersonaService;

  constructor() {
    this.personaService = new PersonaService();
  }

  getPersona = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      const persona = await this.personaService.getPersona(userId);

      if (!persona) {
        return res.status(404).json({
          success: false,
          message: 'Persona not found',
        });
      }

      res.json({
        success: true,
        data: persona,
      });
    } catch (error) {
      logger.error('Error getting persona:', error);
      throw new AppError('Failed to retrieve persona', 500);
    }
  };

  upsertPersona = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      const personaData = req.body;

      // Validate persona data
      const validationError = this.validatePersonaData(personaData);
      if (validationError) {
        return res.status(400).json({
          success: false,
          message: validationError,
        });
      }

      const persona = await this.personaService.upsertPersona(userId, personaData);

      res.json({
        success: true,
        data: persona,
        message: 'Persona saved successfully',
      });
    } catch (error) {
      logger.error('Error saving persona:', error);
      throw new AppError('Failed to save persona', 500);
    }
  };

  updateSection = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      const section = req.params.section;
      const sectionData = req.body;

      const validSections = [
        'professional',
        'interests',
        'learningStyle',
        'contentPreferences',
        'communication',
      ];
      if (!validSections.includes(section)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid persona section',
        });
      }

      const persona = await this.personaService.updateSection(userId, section, sectionData);

      res.json({
        success: true,
        data: persona,
        message: `${section} section updated successfully`,
      });
    } catch (error) {
      logger.error('Error updating persona section:', error);
      throw new AppError('Failed to update persona section', 500);
    }
  };

  deletePersona = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      await this.personaService.deletePersona(userId);

      res.json({
        success: true,
        message: 'Persona deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting persona:', error);
      throw new AppError('Failed to delete persona', 500);
    }
  };

  getHistory = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      const history = await this.personaService.getPersonaHistory(userId);

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error('Error getting persona history:', error);
      throw new AppError('Failed to retrieve persona history', 500);
    }
  };

  exportPersona = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      const format = (req.query.format as string) || 'json';

      const persona = await this.personaService.getPersona(userId);

      if (!persona) {
        return res.status(404).json({
          success: false,
          message: 'Persona not found',
        });
      }

      if (format === 'json') {
        // Set headers for file download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="learn-x-persona.json"');

        // Clean up the data for export
        const exportData = {
          exportDate: new Date().toISOString(),
          version: persona.version || 1,
          profile: {
            professional: persona.professional_context,
            interests: persona.personal_interests,
            learningStyle: persona.learning_style,
            contentPreferences: persona.content_preferences,
            communication: persona.communication_tone,
          },
        };

        res.json(exportData);
      } else if (format === 'csv') {
        // Convert to CSV format
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="learn-x-persona.csv"');

        const csv = this.personaToCSV(persona);
        res.send(csv);
      } else {
        res.status(400).json({
          success: false,
          message: 'Invalid export format. Use json or csv.',
        });
      }
    } catch (error) {
      logger.error('Error exporting persona:', error);
      throw new AppError('Failed to export persona', 500);
    }
  };

  private validatePersonaData(data: any): string | null {
    if (
      !data.professional ||
      !data.interests ||
      !data.learningStyle ||
      !data.contentPreferences ||
      !data.communication
    ) {
      return 'All persona sections are required';
    }

    // Validate professional context
    if (
      !data.professional.role ||
      !data.professional.industry ||
      !data.professional.technicalLevel ||
      typeof data.professional.experienceYears !== 'number'
    ) {
      return 'Invalid professional context data';
    }

    // Validate interests
    if (
      !Array.isArray(data.interests.primary) ||
      data.interests.primary.length === 0 ||
      !Array.isArray(data.interests.learningTopics) ||
      data.interests.learningTopics.length === 0
    ) {
      return 'Invalid interests data';
    }

    // Validate learning style
    const validLearningStyles = ['visual', 'auditory', 'reading', 'kinesthetic'];
    if (!validLearningStyles.includes(data.learningStyle.primary)) {
      return 'Invalid learning style';
    }

    // Validate content preferences
    const validDensities = ['concise', 'balanced', 'comprehensive'];
    if (!validDensities.includes(data.contentPreferences.density)) {
      return 'Invalid content density preference';
    }

    // Validate communication tone
    const validStyles = ['formal', 'professional_friendly', 'conversational', 'casual'];
    if (!validStyles.includes(data.communication.style)) {
      return 'Invalid communication style';
    }

    return null;
  }

  private personaToCSV(persona: any): string {
    const rows: string[] = [];

    // Headers
    rows.push('Category,Field,Value');

    // Professional Context
    rows.push(`Professional,Role,"${persona.professional_context.role}"`);
    rows.push(`Professional,Industry,"${persona.professional_context.industry}"`);
    rows.push(`Professional,Experience Years,${persona.professional_context.experienceYears}`);
    rows.push(`Professional,Technical Level,"${persona.professional_context.technicalLevel}"`);
    if (persona.professional_context.careerAspirations) {
      rows.push(
        `Professional,Career Aspirations,"${persona.professional_context.careerAspirations}"`
      );
    }

    // Interests
    rows.push(`Interests,Primary Interests,"${persona.personal_interests.primary.join(', ')}"`);
    if (persona.personal_interests.secondary?.length) {
      rows.push(
        `Interests,Secondary Interests,"${persona.personal_interests.secondary.join(', ')}"`
      );
    }
    rows.push(
      `Interests,Learning Topics,"${persona.personal_interests.learningTopics.join(', ')}"`
    );

    // Learning Style
    rows.push(`Learning Style,Primary,"${persona.learning_style.primary}"`);
    if (persona.learning_style.secondary) {
      rows.push(`Learning Style,Secondary,"${persona.learning_style.secondary}"`);
    }
    rows.push(`Learning Style,Preference Strength,${persona.learning_style.preferenceStrength}`);

    // Content Preferences
    rows.push(`Content,Density,"${persona.content_preferences.density}"`);
    rows.push(`Content,Examples Per Concept,${persona.content_preferences.examplesPerConcept}`);
    rows.push(`Content,Summary Style,"${persona.content_preferences.summaryStyle}"`);
    rows.push(`Content,Detail Tolerance,"${persona.content_preferences.detailTolerance}"`);
    rows.push(
      `Content,Repetition Preference,"${persona.content_preferences.repetitionPreference}"`
    );

    // Communication
    rows.push(`Communication,Style,"${persona.communication_tone.style}"`);
    rows.push(`Communication,Technical Comfort,${persona.communication_tone.technicalComfort}`);
    rows.push(
      `Communication,Encouragement Level,"${persona.communication_tone.encouragementLevel}"`
    );
    rows.push(`Communication,Humor Appropriate,${persona.communication_tone.humorAppropriate}`);

    // Metadata
    rows.push(`Metadata,Version,${persona.version || 1}`);
    rows.push(`Metadata,Last Updated,"${persona.updated_at}"`);

    return rows.join('\n');
  }
}
