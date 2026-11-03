import { Request, Response, NextFunction } from 'express';
import User from '@/models/user';
import Tenant from '@/models/tenant';
import jwt from 'jsonwebtoken';
import config from '@/config';

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') || 'company-' + Math.random().toString(36).substring(2, 7);
};

const generateTokens = (userId: string, tokenVersion: number = 0) => {
  const accessToken = jwt.sign({ id: userId, tokenVersion }, config.JWT_SECRET, { expiresIn: '1d' });
  const refreshToken = jwt.sign({ id: userId, tokenVersion }, config.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, phone, companyName } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    // 1. Create the Tenant (Company)
    const tenantName = companyName || `${name}'s Company`;
    let slug = generateSlug(tenantName);
    
    // Ensure slug uniqueness
    const existingTenant = await Tenant.findOne({ slug });
    if (existingTenant) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 7)}`;
    }

    const tenant = await Tenant.create({
      name: tenantName,
      slug,
      isActive: true,
    });

    // 2. Create the User with role 'admin' and link to tenant
    const allPages = [
      'projects',
      'enquiries',
      'quotations',
      'payments',
      'expenses',
      'forms',
      'chat',
      'website-content',
      'subscriptions',
      'settings',
      'users',
    ];

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: 'admin',
      tenantId: tenant._id,
      isActive: true,
      pages: allPages,
    });

    // 3. Update the Tenant ownerId to point to the newly created User
    tenant.ownerId = user._id;
    await tenant.save();

    const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.tokenVersion);

    res.status(201).json({
      success: true,
      message: 'User and company registered successfully',
      data: {
        user,
        tenant,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (user && (user.authProvider === 'google' || (!user.password && user.googleId))) {
      return res.status(400).json({
        success: false,
        message: 'This email is registered with a social login method. Please sign in using your social account.',
      });
    }

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.tokenVersion);

    // Update lastLogin timestamp and record login history
    user.lastLogin = new Date();
    user.loginHistory = [...(user.loginHistory || []), new Date()];
    await user.save();



    const tenant = await Tenant.findById(user.tenantId);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        tenant,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    const decoded = jwt.verify(token, config.REFRESH_TOKEN_SECRET) as { id: string; tokenVersion?: number };
    const user = await User.findById(decoded.id);
    if (!user || user.tokenVersion !== (decoded.tokenVersion || 0)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.id, user.tokenVersion);

    res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
    });
  }
};

export const googleLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { credential } = req.body;

    const verifyResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!verifyResponse.ok) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Google token',
      });
    }

    const payload: any = await verifyResponse.json();

    if (config.GOOGLE_CLIENT_ID && payload.aud !== config.GOOGLE_CLIENT_ID) {
      return res.status(400).json({
        success: false,
        message: 'Token audience mismatch',
      });
    }

    const { email, name, sub, picture, given_name, family_name } = payload;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email not provided by Google account',
      });
    }

    let user = await User.findOne({ email });

    if (user) {
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'User account is inactive',
        });
      }

      if (!user.googleId || user.authProvider === 'local') {
        return res.status(400).json({
          success: false,
          message: 'This email is registered with another login method. Please log in using your email and password.',
        });
      }
    } else {
      // Create new tenant first
      const tenantName = `${name || email.split('@')[0]}'s Company`;
      let slug = generateSlug(tenantName);
      const existingTenant = await Tenant.findOne({ slug });
      if (existingTenant) {
        slug = `${slug}-${Math.random().toString(36).substring(2, 7)}`;
      }

      const tenant = await Tenant.create({
        name: tenantName,
        slug,
        isActive: true,
      });

      const allPages = [
        'projects',
        'enquiries',
        'quotations',
        'payments',
        'expenses',
        'forms',
        'chat',
        'website-content',
        'subscriptions',
        'settings',
        'users',
      ];

      // Create new user as owner (admin) of the new tenant
      user = await User.create({
        email,
        name: name || `${given_name || ''} ${family_name || ''}`.trim(),
        role: 'admin',
        tenantId: tenant._id,
        isActive: true,
        authProvider: 'google',
        googleId: sub,
        pages: allPages,
        profile: {
          firstName: given_name || '',
          lastName: family_name || '',
          profilePicture: picture || '',
        },
      });

      tenant.ownerId = user._id;
      await tenant.save();
    }

    const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.tokenVersion);
    // Update lastLogin timestamp and record login history for Google login
    user.lastLogin = new Date();
    user.loginHistory = [...(user.loginHistory || []), new Date()];
    await user.save();

    await user.save();
    const tenant = await Tenant.findById(user.tenantId);

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      data: {
        user,
        tenant,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};
