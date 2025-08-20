import { users } from '@prisma/client';
import { Request } from 'express';

export interface RequestwithUserData extends Request {
  user: Omit<users, 'password'>;
}
