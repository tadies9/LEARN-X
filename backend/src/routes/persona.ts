import { Router } from 'express';
import { authenticateUser } from '../middleware/auth';
import { PersonaController } from '../controllers/personaController';

const router = Router();
const personaController = new PersonaController();

// Debug endpoint (no auth) - REMOVE IN PRODUCTION
router.post('/debug-validate', (req: any, res: any) => {
  console.log('🔍 DEBUG /persona/debug-validate - Headers:', req.headers);
  console.log('🔍 DEBUG /persona/debug-validate - Body:', JSON.stringify(req.body, null, 2));
  console.log('🔍 DEBUG /persona/debug-validate - Body type:', typeof req.body);
  console.log('🔍 DEBUG /persona/debug-validate - Body keys:', Object.keys(req.body || {}));
  
  const data = req.body;
  const hasAllSections = !!(
    (data.academicCareer || data.professional) &&
    data.interests &&
    data.learningStyle &&
    data.contentPreferences &&
    data.communication
  );
  
  res.json({
    success: true,
    debug: {
      hasBody: !!req.body,
      bodyType: typeof req.body,
      bodyKeys: Object.keys(req.body || {}),
      hasAcademicCareer: !!data.academicCareer,
      hasProfessional: !!data.professional,
      hasInterests: !!data.interests,
      hasLearningStyle: !!data.learningStyle,
      hasContentPreferences: !!data.contentPreferences,
      hasCommunication: !!data.communication,
      hasAllSections
    }
  });
});

// All routes require authentication
router.use(authenticateUser);

// Get user's persona
router.get('/', personaController.getPersona);

// Create or update persona
router.post('/', personaController.upsertPersona);

// Update specific persona section
router.patch('/:section', personaController.updateSection);

// Delete persona (for testing/reset)
router.delete('/', personaController.deletePersona);

// Get persona version history
router.get('/history', personaController.getHistory);

// Export persona data
router.get('/export', personaController.exportPersona);

export default router;
