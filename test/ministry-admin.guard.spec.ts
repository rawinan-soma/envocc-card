import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { MinistryAdminGuard } from 'src/admin-auth/ministry-admin.guard';

describe('MinistryAdminGuard', () => {
  const contextFor = (adminId: number) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user: { id: adminId } }) }),
    }) as unknown as ExecutionContext;

  const guardWith = (
    rows: Record<number, { organization: { level: string } } | undefined>,
  ) =>
    new MinistryAdminGuard({
      admins: {
        findUnique: ({ where }: { where: { id: number } }) =>
          Promise.resolve(rows[where.id] ?? null),
      },
    } as unknown as PrismaService);

  it('allows an admin of a MINISTRY-level organization', async () => {
    const guard = guardWith({ 3: { organization: { level: 'MINISTRY' } } });

    await expect(guard.canActivate(contextFor(3))).resolves.toBe(true);
  });

  it.each(['DEPARTMENT', 'REGION', 'PROVINCE', 'UNIT'])(
    'rejects a %s-level admin with 403 admin not at ministry level',
    async (level) => {
      const guard = guardWith({ 3: { organization: { level } } });

      const result = guard.canActivate(contextFor(3));

      await expect(result).rejects.toBeInstanceOf(ForbiddenException);
      await expect(result).rejects.toThrow('admin not at ministry level');
    },
  );

  it('rejects an admin who no longer exists', async () => {
    const guard = guardWith({});

    await expect(guard.canActivate(contextFor(3))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
