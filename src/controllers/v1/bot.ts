import { Request, Response, NextFunction } from 'express';
import dialogueOrchestrator from '../../services/dialogueOrchestrator';

export const handleBotMessage = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { sessionId, text } = req.body;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({
        success: false,
        code: 'Validation Error',
        message: 'sessionId is required and must be a string',
      });
    }

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        code: 'Validation Error',
        message: 'text is required and must be a string',
      });
    }

    const user = (req as any).user;
    const userId = user?.id;
    const tenantIdStr = (req.tenantId || user?.tenantId)?.toString();

    // Orchestrate conversational flow
    const response = await dialogueOrchestrator.handleMessage(sessionId, text, userId, tenantIdStr);

    return res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    next(error);
  }
};
