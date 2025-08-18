import { admins, users } from '@prisma/client';
import { Request } from 'express';

export interface RequestwithUserData extends Request {
  userData: Omit<admins, 'password'> | Omit<users, 'password'>;
}
