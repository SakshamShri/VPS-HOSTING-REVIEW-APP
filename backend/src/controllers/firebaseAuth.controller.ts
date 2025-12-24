import { Request, Response } from 'express';
import { firebaseAdmin } from "../lib/firebaseAdmin";
import { prisma } from "../utils/db";
import { signToken } from '../utils/jwt';
import { AuthRole } from '../types/auth.types';
import { z } from 'zod';

const firebaseLoginSchema = z.object({
  idToken: z.string()
});

export async function firebaseLoginHandler(req: Request, res: Response) {
  try {
    const { idToken } = firebaseLoginSchema.parse(req.body);
    
    // Verify the Firebase ID token
    const decodedToken = await firebaseAdmin.verifyIdToken(idToken);
    const phoneNumber = decodedToken.phone_number;
    
    if (!phoneNumber) {
      return res.status(400).json({ message: 'No phone number in token' });
    }

    // Find or create user in your database
    let user = await prisma.user.findFirst({ 
      where: { mobile: phoneNumber } 
    });

    if (!user) {
      // Create new user if not exists
      user = await prisma.user.create({
        data: {
          mobile: phoneNumber,
          role: 'USER' as AuthRole,
        },
      });
    }

    // Generate your app's JWT
    const token = signToken(user.id, user.role as AuthRole);

    return res.status(200).json({
      token,
      role: user.role,
      userId: String(user.id),
      identityVerified: (user as any).identity_verified ?? false,
      isVerified: (user as any).is_verified ?? false,
    });

  } catch (error) {
    console.error('Firebase login error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Invalid request', 
        issues: error.errors 
      });
    }

    if ((error as any).code === 'auth/argument-error') {
      return res.status(401).json({ 
        message: 'Invalid or expired token' 
      });
    }

    return res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
}
