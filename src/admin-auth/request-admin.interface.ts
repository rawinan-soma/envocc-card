import { admins } from '@prisma/client';
import { Request } from 'express';

export interface RequestwithAdminData extends Request {
  user: Omit<admins, 'password'>;
}
