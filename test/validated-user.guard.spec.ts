import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { ValidatedUserGuard } from 'src/user-auth/validated-user.guard';

describe('ValidatedUserGuard', () => {
  const contextFor = (userId: number) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user: { id: userId } }) }),
    }) as unknown as ExecutionContext;

  const guardWith = (
    rows: Record<number, { is_validate: boolean } | undefined>,
  ) =>
    new ValidatedUserGuard({
      users: {
        findUnique: ({ where }: { where: { id: number } }) =>
          Promise.resolve(rows[where.id] ?? null),
      },
    } as unknown as PrismaService);

  it('allows a validated user', async () => {
    const guard = guardWith({ 7: { is_validate: true } });

    await expect(guard.canActivate(contextFor(7))).resolves.toBe(true);
  });

  it('rejects an unvalidated user with 403 user not validated', async () => {
    const guard = guardWith({ 7: { is_validate: false } });

    const result = guard.canActivate(contextFor(7));

    await expect(result).rejects.toBeInstanceOf(ForbiddenException);
    await expect(result).rejects.toThrow('user not validated');
  });

  it('rejects a user who no longer exists', async () => {
    const guard = guardWith({});

    await expect(guard.canActivate(contextFor(7))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
