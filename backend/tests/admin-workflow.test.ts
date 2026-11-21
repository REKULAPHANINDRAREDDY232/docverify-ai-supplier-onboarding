import request from 'supertest';
import { UserRole } from '@prisma/client';
import { createApp } from '../src/app';
import { hashPassword } from '../src/lib/password';
import { prisma } from '../src/lib/prisma';
import {
  cleanupUserByEmail,
  cookieHeader,
  registerSupplier,
  uniqueEmail,
} from './helpers';

describe('Admin workspace API', () => {
  const app = createApp();
  const createdEmails: string[] = [];
  const createdDocumentTypeIds: string[] = [];
  const createdChecklistIds: string[] = [];
  const createdReferenceIds: string[] = [];

  let adminEmail = '';
  let adminCookie: string[] = [];

  beforeAll(async () => {
    adminEmail = uniqueEmail('admin-workspace');
    createdEmails.push(adminEmail);
    await prisma.user.create({
      data: {
        name: 'Workspace Admin',
        email: adminEmail,
        passwordHash: await hashPassword('secure-password-1'),
        role: UserRole.ADMIN,
        isActive: true,
      },
    });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: adminEmail, password: 'secure-password-1' });
    expect(login.status).toBe(200);
    adminCookie = cookieHeader(login.headers['set-cookie']);
  });

  afterAll(async () => {
    for (const id of createdChecklistIds) {
      await prisma.checklistCheck.deleteMany({ where: { checklistItemId: id } });
      await prisma.checklistItem.deleteMany({ where: { id } });
    }
    for (const id of createdDocumentTypeIds) {
      await prisma.documentRequest.deleteMany({ where: { documentTypeId: id } });
      await prisma.supplierDocument.deleteMany({ where: { documentTypeId: id } });
      await prisma.checklistItem.updateMany({
        where: { documentTypeId: id },
        data: { documentTypeId: null },
      });
      await prisma.documentType.deleteMany({ where: { id } });
    }
    for (const id of createdReferenceIds) {
      await prisma.referenceSource.deleteMany({ where: { id } });
    }
    for (const email of createdEmails) {
      await cleanupUserByEmail(email);
    }
    await prisma.$disconnect();
  });

  it('rejects non-admin access to admin APIs', async () => {
    const supplierEmail = uniqueEmail('admin-block');
    createdEmails.push(supplierEmail);
    const { response } = await registerSupplier(app, { email: supplierEmail });
    const supplierCookie = cookieHeader(response.headers['set-cookie']);

    const blocked = await request(app)
      .get('/api/admin/dashboard')
      .set('Cookie', supplierCookie);

    expect(blocked.status).toBe(403);
  });

  it('returns live dashboard counts from PostgreSQL', async () => {
    const before = await request(app)
      .get('/api/admin/dashboard')
      .set('Cookie', adminCookie);
    expect(before.status).toBe(200);
    expect(before.body.success).toBe(true);

    const supplierEmail = uniqueEmail('admin-dash-supplier');
    createdEmails.push(supplierEmail);
    await registerSupplier(app, { email: supplierEmail, companyName: 'Dashboard Co' });

    const after = await request(app)
      .get('/api/admin/dashboard')
      .set('Cookie', adminCookie);

    expect(after.status).toBe(200);
    expect(after.body.data.suppliers.total).toBeGreaterThanOrEqual(
      before.body.data.suppliers.total + 1,
    );
    expect(after.body.data.suppliers.byStatus.DRAFT).toBeGreaterThanOrEqual(1);
    expect(after.body.data.users.total).toBeGreaterThanOrEqual(1);
  });

  it('searches users, assigns roles, and activates or deactivates accounts', async () => {
    const targetEmail = uniqueEmail('admin-role-target');
    createdEmails.push(targetEmail);

    const created = await request(app)
      .post('/api/admin/users')
      .set('Cookie', adminCookie)
      .send({
        name: 'Role Target',
        email: targetEmail,
        password: 'secure-password-1',
        role: UserRole.SUPPLIER_CONTACT,
      });

    expect(created.status).toBe(201);
    expect(created.body.data.user.role).toBe(UserRole.SUPPLIER_CONTACT);
    expect(created.body.data.user.passwordHash).toBeUndefined();
    expect(created.body.data.user.isActive).toBe(true);

    const listed = await request(app)
      .get(`/api/admin/users?q=${encodeURIComponent(targetEmail)}`)
      .set('Cookie', adminCookie);
    expect(listed.status).toBe(200);
    expect(listed.body.data.users.some((user: { email: string }) => user.email === targetEmail.toLowerCase())).toBe(
      true,
    );

    const promoted = await request(app)
      .patch(`/api/admin/users/${created.body.data.user.id}`)
      .set('Cookie', adminCookie)
      .send({ role: UserRole.REVIEWER });
    expect(promoted.status).toBe(200);
    expect(promoted.body.data.user.role).toBe(UserRole.REVIEWER);

    const deactivated = await request(app)
      .patch(`/api/admin/users/${created.body.data.user.id}`)
      .set('Cookie', adminCookie)
      .send({ isActive: false });
    expect(deactivated.status).toBe(200);
    expect(deactivated.body.data.user.isActive).toBe(false);

    const loginBlocked = await request(app)
      .post('/api/auth/login')
      .send({ email: targetEmail, password: 'secure-password-1' });
    expect(loginBlocked.status).toBe(401);

    const stored = await prisma.user.findUniqueOrThrow({
      where: { email: targetEmail.toLowerCase() },
    });
    expect(stored.role).toBe(UserRole.REVIEWER);
    expect(stored.isActive).toBe(false);
    expect(JSON.stringify(promoted.body)).not.toContain(stored.passwordHash);
  });

  it('persists document types, checklist items, and reference sources', async () => {
    const code = `ADMIN_TYPE_${Date.now()}`;
    const typeResponse = await request(app)
      .post('/api/admin/document-types')
      .set('Cookie', adminCookie)
      .send({
        name: 'Admin Test Certificate',
        code,
        description: 'Created by admin workflow test',
        required: true,
        active: true,
      });

    expect(typeResponse.status).toBe(201);
    const documentTypeId = typeResponse.body.data.documentType.id as string;
    createdDocumentTypeIds.push(documentTypeId);

    const checklistResponse = await request(app)
      .post('/api/admin/checklists')
      .set('Cookie', adminCookie)
      .send({
        title: 'Admin test requirement',
        description: 'Linked checklist item',
        documentTypeId,
        isRequired: true,
        isActive: true,
        version: '2.0',
        effectiveDate: '2026-01-15',
      });

    expect(checklistResponse.status).toBe(201);
    expect(checklistResponse.body.data.checklistItem.documentTypeId).toBe(documentTypeId);
    expect(checklistResponse.body.data.checklistItem.version).toBe('2.0');
    createdChecklistIds.push(checklistResponse.body.data.checklistItem.id);

    const deactivated = await request(app)
      .patch(`/api/admin/checklists/${checklistResponse.body.data.checklistItem.id}`)
      .set('Cookie', adminCookie)
      .send({ isActive: false });
    expect(deactivated.status).toBe(200);
    expect(deactivated.body.data.checklistItem.isActive).toBe(false);

    const referenceResponse = await request(app)
      .post('/api/admin/reference-sources')
      .set('Cookie', adminCookie)
      .send({
        title: `Admin Policy ${Date.now()}`,
        version: '1.0',
        effectiveDate: '2026-02-01',
        sourceDescription: 'Internal procurement onboarding policy metadata',
      });
    expect(referenceResponse.status).toBe(201);
    createdReferenceIds.push(referenceResponse.body.data.referenceSource.id);

    const updatedReference = await request(app)
      .patch(`/api/admin/reference-sources/${referenceResponse.body.data.referenceSource.id}`)
      .set('Cookie', adminCookie)
      .send({ sourceDescription: 'Updated policy description for persistence check' });
    expect(updatedReference.status).toBe(200);
    expect(updatedReference.body.data.referenceSource.sourceDescription).toContain('Updated policy');

    const persistedType = await prisma.documentType.findUnique({ where: { id: documentTypeId } });
    const persistedChecklist = await prisma.checklistItem.findUnique({
      where: { id: checklistResponse.body.data.checklistItem.id },
    });
    const persistedReference = await prisma.referenceSource.findUnique({
      where: { id: referenceResponse.body.data.referenceSource.id },
    });

    expect(persistedType?.code).toBe(code);
    expect(persistedChecklist?.isActive).toBe(false);
    expect(persistedChecklist?.documentTypeId).toBe(documentTypeId);
    expect(persistedReference?.sourceDescription).toContain('Updated policy');
  });

  it('lists suppliers and important audit records for administrators', async () => {
    const supplierEmail = uniqueEmail('admin-supplier-list');
    createdEmails.push(supplierEmail);
    await registerSupplier(app, {
      email: supplierEmail,
      companyName: 'Audit Trail Supplies',
    });

    const suppliers = await request(app)
      .get('/api/admin/suppliers?q=Audit%20Trail')
      .set('Cookie', adminCookie);
    expect(suppliers.status).toBe(200);
    expect(
      suppliers.body.data.suppliers.some(
        (row: { companyName: string }) => row.companyName === 'Audit Trail Supplies',
      ),
    ).toBe(true);

    const audits = await request(app)
      .get('/api/admin/audit-logs?action=ADMIN_')
      .set('Cookie', adminCookie);
    expect(audits.status).toBe(200);
    expect(audits.body.data.auditLogs.length).toBeGreaterThan(0);
    expect(
      audits.body.data.auditLogs.every(
        (log: { action: string; actor?: { passwordHash?: string } }) =>
          !('passwordHash' in (log.actor ?? {})) && log.action.includes('ADMIN_'),
      ),
    ).toBe(true);
  });
});
