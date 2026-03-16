import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async resetPassword(token: string, newPass: string) {
    const resetToken = await this.prisma.reset_tokens.findUnique({
      where: { token },
      include: { user: true, admin: true },
    });

    if (
      !resetToken ||
      resetToken.is_used ||
      resetToken.expiration_time < new Date()
    ) {
      throw new BadRequestException('Invalid or expired token');
    }

    const hashedPassword = await bcrypt.hash(newPass, 10);

    if (resetToken.userId) {
      await this.prisma.users.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      });
    } else if (resetToken.adminId) {
      await this.prisma.admins.update({
        where: { id: resetToken.adminId },
        data: { password: hashedPassword },
      });
    } else {
      throw new BadRequestException(
        'Invalid token: no associated user or admin',
      );
    }

    await this.prisma.reset_tokens.update({
      where: { id: resetToken.id },
      data: { is_used: true },
    });

    return { msg: 'Password reset successful' };
  }
}
