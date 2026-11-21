import request from 'supertest';
import type { Express } from 'express';
import { UserRole } from '@prisma/client';
import { hashPassword } from '../src/lib/password';
import { prisma } from '../src/lib/prisma';

export const SYNTHETIC_PASSWORD = 'secure-password-1';

export const PDF_BUFFER = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n',
);

export const PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
  0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
  0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc, 0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
  0x44, 0xae, 0x42, 0x60, 0x82,
]);

export function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10_000)}@example.test`;
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
    password: overrides.password ?? SYNTHETIC_PASSWORD,
    companyName: overrides.companyName ?? 'Acme Components Ltd',
  };

  const response = await request(app).post('/api/auth/register').send(payload);
  return { response, payload };
}

export async function loginAs(
  app: Express,
  email: string,
  password = SYNTHETIC_PASSWORD,
): Promise<string[]> {
  const response = await request(app).post('/api/auth/login').send({ email, password });
  if (response.status !== 200) {
    throw new Error(`Login failed for ${email}: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return cookieHeader(response.headers['set-cookie']);
}

export async function createStaffUser(role: typeof UserRole.REVIEWER | typeof UserRole.ADMIN) {
  const email = uniqueEmail(role.toLowerCase());
  const user = await prisma.user.create({
    data: {
      name: `${role} Synthetic`,
      email,
      passwordHash: await hashPassword(SYNTHETIC_PASSWORD),
      role,
      isActive: true,
    },
  });
  return { user, email };
}

export async function ensureCoreDocumentTypes() {
  const codes = ['BUSINESS_REGISTRATION', 'BANK_CONFIRMATION', 'INSURANCE_CERTIFICATE'] as const;
  const types = [];
  for (const code of codes) {
    types.push(
      await prisma.documentType.upsert({
        where: { code },
        update: { active: true, required: true },
        create: {
          code,
          name: code.replaceAll('_', ' '),
          description: `${code} synthetic type`,
          required: true,
          active: true,
        },
      }),
    );
  }
  return types;
}

export async function ensureCoreChecklistItems(
  types: Array<{ id: string; code: string; name: string }>,
) {
  for (const type of types) {
    const existing = await prisma.checklistItem.findFirst({
      where: { title: `${type.code} present`, version: '1.0' },
    });
    if (!existing) {
      await prisma.checklistItem.create({
        data: {
          title: `${type.code} present`,
          description: `Confirm ${type.name} is present`,
          documentTypeId: type.id,
          isRequired: true,
          isActive: true,
          version: '1.0',
          effectiveDate: new Date('2026-01-01T00:00:00.000Z'),
        },
      });
    }
  }
}

export async function uploadRequiredDocuments(
  app: Express,
  cookie: string[],
  supplierId: string,
  types: Array<{ id: string; code: string }>,
) {
  for (const type of types) {
    const upload = await request(app)
      .post(`/api/suppliers/${supplierId}/documents`)
      .set('Cookie', cookie)
      .field('documentTypeId', type.id)
      .attach('file', PDF_BUFFER, {
        filename: `${type.code}.pdf`,
        contentType: 'application/pdf',
      });
    if (upload.status !== 201) {
      throw new Error(`Upload failed for ${type.code}: ${upload.status}`);
    }
  }
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

  await prisma.checklistCheck.deleteMany({ where: { checkedById: user.id } });
  await prisma.reviewAction.deleteMany({ where: { reviewerId: user.id } });
  await prisma.documentRequest.deleteMany({ where: { reviewerId: user.id } });
  await prisma.supplierDocument.deleteMany({ where: { uploadedById: user.id } });

  await prisma.auditLog.deleteMany({
    where: {
      OR: [{ actorId: user.id }, { entityId: user.id }, { entityId: email.toLowerCase() }],
    },
  });
  await prisma.user.delete({ where: { id: user.id } });
}
