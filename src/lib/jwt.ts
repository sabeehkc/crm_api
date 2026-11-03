import jwt, { SignOptions } from 'jsonwebtoken';
import config from '@/config';

export interface JWTPayload {
  id: string;
  tokenVersion?: number;
}

export const generateAccessToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, config.JWT_SECRET as string, {
    expiresIn: config.ACCESS_TOKEN_EXPIRY as any,
  } as SignOptions);
};

export const generateRefreshToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, config.REFRESH_TOKEN_SECRET as string, {
    expiresIn: config.REFRESH_TOKEN_EXPIRY as any,
  } as SignOptions);
};

export const verifyAccessToken = (token: string): JWTPayload => {
  return jwt.verify(token, config.JWT_SECRET as string) as JWTPayload;
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  return jwt.verify(token, config.REFRESH_TOKEN_SECRET as string) as JWTPayload;
};

export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, config.JWT_SECRET as string, {
    expiresIn: config.ACCESS_TOKEN_EXPIRY as any,
  } as SignOptions);
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, config.JWT_SECRET as string) as JWTPayload;
};
