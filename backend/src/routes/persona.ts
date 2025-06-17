import { Router } from 'express';
import { authenticateUser } from '../middleware/auth';
import { PersonaController } from '../controllers/personaController';

const router = Router();
const personaController = new PersonaController();


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
