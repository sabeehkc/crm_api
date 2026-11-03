import { Router } from 'express';
import { register, login, logout, refreshToken, googleLogin } from '@/controllers/v1/auth';
import { authenticate } from '@/middlewares/authenticate';
import { validateRequest } from '@/middlewares/validationError';
import { registerSchema, loginSchema, googleLoginSchema } from '@/zod/auth';

const router = Router();

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 */
router.post('/register', validateRequest(registerSchema), register);

/**
 * @swagger
 * /api/v1/auth/google:
 *   post:
 *     summary: Login/Register user with Google credential
 *     tags: [Authentication]
 */
router.post('/google', validateRequest(googleLoginSchema), googleLogin);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 */
router.post('/login', validateRequest(loginSchema), login);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 */
router.post('/logout', authenticate, logout);

/**
 * @swagger
 * /api/v1/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 */
router.post('/refresh-token', refreshToken);

export default router;
