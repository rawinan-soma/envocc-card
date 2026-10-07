import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { OrgLevel } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { MOPH_ORG_CODE, MophAdminGuard } from 'src/admin-auth/moph-admin.guard';

type AdminRow = { organization: { level: OrgLevel; code: string } };

describe('MophAdminGuard', () => {
  const contextFor = (adminId: number) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user: { id: adminId } }) }),
    }) as unknown as ExecutionContext;

  const guardWith = (rows: Record<number, AdminRow | undefined>) =>
    new MophAdminGuard({
      admins: {
        findUnique: ({ where }: { where: { id: number } }) =>
          Promise.resolve(rows[where.id] ?? null),
      },
    } as unknown as PrismaService);

  const adminOf = (level: OrgLevel, code: string): AdminRow => ({
    organization: { level, code },
  });

  it('allows an admin of the Ministry of Public Health', async () => {
    const guard = guardWith({ 3: adminOf('MINISTRY', MOPH_ORG_CODE) });

    await expect(guard.canActivate(contextFor(3))).resolves.toBe(true);
  });

  it.each([
    ['another ministry', adminOf('MINISTRY', '08000')],
    ['a department under MOPH', adminOf('DEPARTMENT', '15001')],
    ['a province', adminOf('PROVINCE', '15100')],
    ['a unit', adminOf('UNIT', '15999')],
    [
      'a non-ministry org reusing the MOPH code',
      adminOf('UNIT', MOPH_ORG_CODE),
    ],
  ])('rejects an admin of %s with 403', async (_, row) => {
    const guard = guardWith({ 3: row });

    const result = guard.canActivate(contextFor(3));

    await expect(result).rejects.toBeInstanceOf(ForbiddenException);
    await expect(result).rejects.toThrow('admin is not from MOPH');
  });

  it('rejects an admin who no longer exists', async () => {
    const guard = guardWith({});

    await expect(guard.canActivate(contextFor(3))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
