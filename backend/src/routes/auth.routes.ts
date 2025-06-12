import { Router } from 'express';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// TODO: Implement auth controllers
router.post('/register', authRateLimiter, (_, res) => {
  res.json({ message: 'Register endpoint - to be implemented' });
});

router.post('/login', authRateLimiter, (_, res) => {
  res.json({ message: 'Login endpoint - to be implemented' });
});

router.post('/logout', (_, res) => {
  res.json({ message: 'Logout endpoint - to be implemented' });
});

router.post('/refresh', (_, res) => {
  res.json({ message: 'Refresh token endpoint - to be implemented' });
});

export default router;