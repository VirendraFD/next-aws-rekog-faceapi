// utils/auth.ts
import jwt from 'jsonwebtoken';
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET;

// Generate token with user information
export const generateToken = (userId: string, email: string) => {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '1d' });
};

// Verify token
// export const verifyToken = (token: string) => {
//   return jwt.verify(token, JWT_SECRET);
// };
export const verifyToken = async (token: string) => {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  return await jwtVerify(token, secret);
};