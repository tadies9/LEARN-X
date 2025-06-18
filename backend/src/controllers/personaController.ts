import { Request, Response } from 'express';
import { PersonaService, PersonaSectionType } from '../services/personaService';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import {
  PersonaRow,
  ProfessionalContext,
  PersonalInterests,
  LearningStyle,
  ContentPreferences,
  CommunicationTone,
} from '../types/persona';
// Import express type extensions
import '../types/express';

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

      // Save persona
      const persona = await this.personaService.upsertPersona(userId, personaData);

      return res.status(200).json({
        success: true,
        message: 'Persona saved successfully',
        data: persona,
      });
    } catch (error) {
      console.error('Error in upsertPersona:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };

  updateSection = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      const section = req.params.section;
      const sectionData = req.body;

      const validSections = [
        'professional',
        'academicCareer',
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

      const persona = await this.personaService.updateSection(
        userId,
        section as PersonaSectionType,
        sectionData
      );

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

      // Type assert the persona to our PersonaRow interface
      const typedPersona = persona as PersonaRow;

      if (format === 'json') {
        // Set headers for file download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="learn-x-persona.json"');

        // Clean up the data for export
        const exportData = {
          exportDate: new Date().toISOString(),
          version: typedPersona.version || 1,
          profile: {
            professional: typedPersona.professional_context,
            interests: typedPersona.personal_interests,
            learningStyle: typedPersona.learning_style,
            contentPreferences: typedPersona.content_preferences,
            communication: typedPersona.communication_tone,
          },
        };

        res.json(exportData);
      } else if (format === 'csv') {
        // Convert to CSV format
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="learn-x-persona.csv"');

        const csv = this.personaToCSV(typedPersona);
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

  private validatePersonaData(data: Record<string, unknown>): string | null {
    // Handle both new and legacy structure
    const academicCareerData = data.academicCareer || data.professional;

    if (
      !academicCareerData ||
      !data.interests ||
      !data.learningStyle ||
      !data.contentPreferences ||
      !data.communication
    ) {
      return 'All persona sections are required';
    }

    // Type assert the JSONB fields to their proper types
    const professionalContext = academicCareerData as ProfessionalContext;
    const interests = data.interests as PersonalInterests;
    const learningStyle = data.learningStyle as LearningStyle;
    const contentPreferences = data.contentPreferences as ContentPreferences;
    const communication = data.communication as CommunicationTone;

    // Validate academic/career context - handle both new and legacy field names
    const hasCurrentStatus = professionalContext.currentStatus || professionalContext.role;
    const hasIndustry = professionalContext.aspiredIndustry || professionalContext.industry;

    if (!hasCurrentStatus || !hasIndustry) {
      return 'Invalid professional context data';
    }

    // Validate interests
    if (
      !Array.isArray(interests.primary) ||
      interests.primary.length === 0 ||
      !Array.isArray(interests.learningTopics) ||
      interests.learningTopics.length === 0
    ) {
      return 'Invalid interests data';
    }

    // Validate learning style
    if (!learningStyle.primary || typeof learningStyle.preferenceStrength !== 'number') {
      return 'Invalid learning style data';
    }

    // Validate content preferences
    if (
      !contentPreferences.density ||
      !contentPreferences.detailTolerance ||
      !contentPreferences.repetitionPreference
    ) {
      return 'Invalid content preferences data';
    }

    // Validate communication
    if (
      !communication.style ||
      !communication.encouragementLevel ||
      typeof communication.humorAppropriate !== 'boolean'
    ) {
      return 'Invalid communication data';
    }

    return null;
  }

  private personaToCSV(persona: PersonaRow): string {
    const rows: string[] = [];

    // Headers
    rows.push('Category,Field,Value');

    // Professional Context
    const professionalContext = persona.professional_context;
    rows.push(`Professional,Role,"${professionalContext.role || ''}"`);
    rows.push(`Professional,Industry,"${professionalContext.industry || ''}"`);
    rows.push(`Professional,Experience Years,${professionalContext.experienceYears || 0}`);
    rows.push(`Professional,Technical Level,"${professionalContext.technicalLevel || ''}"`);
    if (professionalContext.careerAspirations) {
      rows.push(`Professional,Career Aspirations,"${professionalContext.careerAspirations}"`);
    }

    // Interests
    const interests = persona.personal_interests;
    rows.push(`Interests,Primary Interests,"${interests.primary.join(', ')}"`);
    if (interests.secondary?.length) {
      rows.push(`Interests,Secondary Interests,"${interests.secondary.join(', ')}"`);
    }
    rows.push(`Interests,Learning Topics,"${interests.learningTopics.join(', ')}"`);

    // Learning Style
    const learningStyle = persona.learning_style;
    rows.push(`Learning Style,Primary,"${learningStyle.primary}"`);
    if (learningStyle.secondary) {
      rows.push(`Learning Style,Secondary,"${learningStyle.secondary}"`);
    }
    rows.push(`Learning Style,Preference Strength,${learningStyle.preferenceStrength}`);

    // Content Preferences
    const contentPreferences = persona.content_preferences;
    rows.push(`Content,Density,"${contentPreferences.density}"`);
    rows.push(`Content,Examples Per Concept,${contentPreferences.examplesPerConcept || 0}`);
    rows.push(`Content,Summary Style,"${contentPreferences.summaryStyle || ''}"`);
    rows.push(`Content,Detail Tolerance,"${contentPreferences.detailTolerance}"`);
    rows.push(`Content,Repetition Preference,"${contentPreferences.repetitionPreference}"`);

    // Communication
    const communication = persona.communication_tone;
    rows.push(`Communication,Style,"${communication.style}"`);
    rows.push(`Communication,Technical Comfort,${communication.technicalComfort || 0}`);
    rows.push(`Communication,Encouragement Level,"${communication.encouragementLevel}"`);
    rows.push(`Communication,Humor Appropriate,${communication.humorAppropriate}`);

    // Metadata
    rows.push(`Metadata,Version,${persona.version || 1}`);
    rows.push(`Metadata,Last Updated,"${persona.updated_at}"`);

    return rows.join('\n');
  }
}
