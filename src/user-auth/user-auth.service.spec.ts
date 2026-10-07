import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'prisma/prisma.service';
import { MailService } from 'src/mail/mail.service';
import { UserAuthService } from './user-auth.service';

describe('UserAuthService.getAuthenticatedUser', () => {
  const password = 'correct-password';
  let storedUser: Record<string, unknown> | null;
  let service: UserAuthService;

  beforeAll(async () => {
    const hashed = await bcrypt.hash(password, 4);
    storedUser = {
      id: 7,
      username: 'somchai',
      password: hashed,
      role: 'user',
      position: { position_id: 201, orgId: null },
      organization: { id: 1, level: 'province' },
      is_validate: false,
    };
  });

  beforeEach(() => {
    const prisma = {
      users: {
        findFirst: jest.fn(({ where }: { where: { username: string } }) =>
          Promise.resolve(
            storedUser && where.username === storedUser.username
              ? { ...storedUser }
              : null,
          ),
        ),
      },
    } as unknown as PrismaService;
    service = new UserAuthService(prisma, {} as MailService);
  });

  it('logs in an unapproved user with valid credentials', async () => {
    const user = await service.getAuthenticatedUser('somchai', password);

    expect(user).toMatchObject({
      id: 7,
      username: 'somchai',
      role: 'user',
      positionId: 201,
      level: 'province',
      executive: 'non-executive',
    });
    expect(user.password).toBe('');
  });

  it('rejects a wrong password with 401', async () => {
    await expect(
      service.getAuthenticatedUser('somchai', 'wrong-password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an unknown username with 401', async () => {
    await expect(
      service.getAuthenticatedUser('nobody', password),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
