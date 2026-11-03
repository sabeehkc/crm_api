import { Router } from 'express';
import { handleBotMessage } from '../../controllers/v1/bot';
import { authenticate } from '../../middlewares/authenticate';

const router = Router();

// We can support optional authentication so public visitors can also chat
router.post('/message', (req, res, next) => {
  // If Authorization header exists, run authenticate middleware, otherwise pass through
  if (req.headers.authorization) {
    return authenticate(req, res, next);
  }
  next();
}, handleBotMessage);

export default router;
