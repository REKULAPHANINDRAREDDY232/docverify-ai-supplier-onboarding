import request from 'supertest';
import type { Express } from 'express';
import { prisma } from '../src/lib/prisma';

export function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10_000)}@example.com`;
}

export function cookieHeader(setCookie: string | string[] | undefined): string[] {
  if (!setCookie) {
    return [];
  }
  return Array.isArray(setCookie) ? setCookie : [setCookie];
}

export async function registerSupplier(
  app: Express,
  overrides: Partial<{
    name: string;
    email: string;
    password: string;
    companyName: string;
  }> = {},
) {
  const payload = {
    name: overrides.name ?? 'Supplier Contact',
    email: overrides.email ?? uniqueEmail('supplier'),
    password: overrides.password ?? 'secure-password-1',
    companyName: overrides.companyName ?? 'Acme Components Ltd',
  };

  const response = await request(app).post('/api/auth/register').send(payload);
  return { response, payload };
}

export async function cleanupUserByEmail(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { supplierAsContact: true },
  });
  if (!user) {
    return;
  }

  if (user.supplierAsContact) {
    await prisma.supplier.delete({ where: { id: user.supplierAsContact.id } });
  }

  await prisma.auditLog.deleteMany({
    where: {
      OR: [{ actorId: user.id }, { entityId: user.id }, { entityId: email.toLowerCase() }],
    },
  });
  await prisma.user.delete({ where: { id: user.id } });
}
