import { Router } from 'express';
import { clearAuthCookie, setAuthCookie } from '../lib/cookies';
import { signAccessToken, verifyAccessToken } from '../lib/jwt';
import { authenticate } from '../middleware/authenticate';
import { validateBody } from '../middleware/validate';
import {
  getAuthenticatedProfile,
  loginUser,
  recordLogout,
  registerSupplierContact,
} from '../services/authService';
import { AUTH_COOKIE_NAME } from '../types/auth';
import { loginSchema, registerSchema } from '../validators/auth';

export const authRouter = Router();

authRouter.post('/register', validateBody(registerSchema), async (req, res, next) => {
  try {
    const user = await registerSupplierContact(req.body);
    const token = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    const user = await loginUser(req.body);
    const token = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];
    if (typeof token === 'string') {
      try {
        const payload = verifyAccessToken(token);
        await recordLogout(payload.sub);
      } catch {
        // Invalid/expired tokens still clear the cookie.
      }
    }

    clearAuthCookie(res);
    res.status(200).json({
      success: true,
      data: { message: 'Logged out' },
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const profile = await getAuthenticatedProfile(req.user!.id);
    res.status(200).json({
      success: true,
      data: { user: profile },
    });
  } catch (error) {
    next(error);
  }
});
