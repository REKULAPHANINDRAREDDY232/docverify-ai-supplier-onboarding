import request from 'supertest';
import { UserRole } from '@prisma/client';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import {
  SYNTHETIC_PASSWORD,
  cleanupUserByEmail,
  createStaffUser,
  loginAs,
  registerSupplier,
  uniqueEmail,
} from './helpers';

describe('Admin workspace workflow', () => {
  const app = createApp();
  const createdEmails: string[] = [];
  const createdDocumentTypeIds: string[] = [];
  const createdChecklistIds: string[] = [];
  const createdReferenceIds: string[] = [];

  let adminCookie: string[] = [];

  beforeAll(async () => {
    const { email } = await createStaffUser(UserRole.ADMIN);
    createdEmails.push(email);
    adminCookie = await loginAs(app, email);
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

  it('blocks supplier contacts from admin APIs', async () => {
    const email = uniqueEmail('admin-block');
    createdEmails.push(email);
    const { response } = await registerSupplier(app, { email });
    const supplierCookie = response.headers['set-cookie']
      ? Array.isArray(response.headers['set-cookie'])
        ? response.headers['set-cookie']
        : [response.headers['set-cookie']]
      : [];

    const blocked = await request(app)
      .get('/api/admin/dashboard')
      .set('Cookie', supplierCookie);
    expect(blocked.status).toBe(403);

    const blockedUsers = await request(app)
      .post('/api/admin/users')
      .set('Cookie', supplierCookie)
      .send({
        name: 'Nope',
        email: uniqueEmail('blocked-create'),
        password: SYNTHETIC_PASSWORD,
        role: UserRole.ADMIN,
      });
    expect(blockedUsers.status).toBe(403);
  });

  it('22. manages user roles and activation state', async () => {
    const targetEmail = uniqueEmail('admin-role-target');
    createdEmails.push(targetEmail);

    const created = await request(app)
      .post('/api/admin/users')
      .set('Cookie', adminCookie)
      .send({
        name: 'Role Target',
        email: targetEmail,
        password: SYNTHETIC_PASSWORD,
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
    expect(
      listed.body.data.users.some(
        (user: { email: string }) => user.email === targetEmail.toLowerCase(),
      ),
    ).toBe(true);

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
      .send({ email: targetEmail, password: SYNTHETIC_PASSWORD });
    expect(loginBlocked.status).toBe(401);

    const stored = await prisma.user.findUniqueOrThrow({
      where: { email: targetEmail.toLowerCase() },
    });
    expect(stored.role).toBe(UserRole.REVIEWER);
    expect(stored.isActive).toBe(false);
    expect(JSON.stringify(promoted.body)).not.toContain(stored.passwordHash);
  });

  it('23. manages document types', async () => {
    const code = `ADMIN_TYPE_${Date.now()}`;
    const created = await request(app)
      .post('/api/admin/document-types')
      .set('Cookie', adminCookie)
      .send({
        name: 'Admin Test Certificate',
        code,
        description: 'Created by admin workflow test',
        required: true,
        active: true,
      });

    expect(created.status).toBe(201);
    createdDocumentTypeIds.push(created.body.data.documentType.id);

    const updated = await request(app)
      .patch(`/api/admin/document-types/${created.body.data.documentType.id}`)
      .set('Cookie', adminCookie)
      .send({ description: 'Updated synthetic description', active: false });

    expect(updated.status).toBe(200);
    expect(updated.body.data.documentType.active).toBe(false);
    expect(updated.body.data.documentType.description).toBe('Updated synthetic description');

    const listed = await request(app)
      .get('/api/admin/document-types')
      .set('Cookie', adminCookie);
    expect(listed.status).toBe(200);
    expect(
      listed.body.data.documentTypes.some(
        (row: { id: string }) => row.id === created.body.data.documentType.id,
      ),
    ).toBe(true);

    const persisted = await prisma.documentType.findUniqueOrThrow({
      where: { id: created.body.data.documentType.id },
    });
    expect(persisted.code).toBe(code);
    expect(persisted.active).toBe(false);
  });

  it('24. supports checklist item CRUD with document-type links', async () => {
    const type = await request(app)
      .post('/api/admin/document-types')
      .set('Cookie', adminCookie)
      .send({
        name: 'Checklist Linked Type',
        code: `CL_TYPE_${Date.now()}`,
        required: true,
        active: true,
      });
    expect(type.status).toBe(201);
    createdDocumentTypeIds.push(type.body.data.documentType.id);

    const created = await request(app)
      .post('/api/admin/checklists')
      .set('Cookie', adminCookie)
      .send({
        title: 'Synthetic bank confirmation letter',
        description: 'Linked checklist item',
        documentTypeId: type.body.data.documentType.id,
        isRequired: true,
        isActive: true,
        version: '2.0',
        effectiveDate: '2026-01-15',
      });

    expect(created.status).toBe(201);
    expect(created.body.data.checklistItem.documentTypeId).toBe(type.body.data.documentType.id);
    expect(created.body.data.checklistItem.version).toBe('2.0');
    createdChecklistIds.push(created.body.data.checklistItem.id);

    const updated = await request(app)
      .patch(`/api/admin/checklists/${created.body.data.checklistItem.id}`)
      .set('Cookie', adminCookie)
      .send({
        title: 'Updated synthetic bank confirmation letter',
        isActive: false,
        version: '2.1',
      });
    expect(updated.status).toBe(200);
    expect(updated.body.data.checklistItem.isActive).toBe(false);
    expect(updated.body.data.checklistItem.version).toBe('2.1');

    const listed = await request(app).get('/api/admin/checklists').set('Cookie', adminCookie);
    expect(listed.status).toBe(200);
    expect(
      listed.body.data.checklistItems.some(
        (row: { id: string }) => row.id === created.body.data.checklistItem.id,
      ),
    ).toBe(true);

    const persisted = await prisma.checklistItem.findUniqueOrThrow({
      where: { id: created.body.data.checklistItem.id },
    });
    expect(persisted.title).toBe('Updated synthetic bank confirmation letter');
    expect(persisted.isActive).toBe(false);
  });

  it('25. manages reference source metadata', async () => {
    const created = await request(app)
      .post('/api/admin/reference-sources')
      .set('Cookie', adminCookie)
      .send({
        title: `Admin Policy ${Date.now()}`,
        version: '1.0',
        effectiveDate: '2026-02-01',
        sourceDescription: 'Internal procurement onboarding policy metadata',
      });

    expect(created.status).toBe(201);
    createdReferenceIds.push(created.body.data.referenceSource.id);

    const updated = await request(app)
      .patch(`/api/admin/reference-sources/${created.body.data.referenceSource.id}`)
      .set('Cookie', adminCookie)
      .send({ sourceDescription: 'Updated policy description for persistence check' });

    expect(updated.status).toBe(200);
    expect(updated.body.data.referenceSource.sourceDescription).toContain('Updated policy');

    const listed = await request(app)
      .get('/api/admin/reference-sources')
      .set('Cookie', adminCookie);
    expect(listed.status).toBe(200);
    expect(
      listed.body.data.referenceSources.some(
        (row: { id: string }) => row.id === created.body.data.referenceSource.id,
      ),
    ).toBe(true);

    const persisted = await prisma.referenceSource.findUniqueOrThrow({
      where: { id: created.body.data.referenceSource.id },
    });
    expect(persisted.sourceDescription).toContain('Updated policy');
  });

  it('26. provides audit log access for administrators', async () => {
    const supplierEmail = uniqueEmail('admin-audit-supplier');
    createdEmails.push(supplierEmail);
    await registerSupplier(app, {
      email: supplierEmail,
      companyName: 'Audit Trail Supplies',
    });

    const audits = await request(app)
      .get('/api/admin/audit-logs?action=ADMIN_')
      .set('Cookie', adminCookie);

    expect(audits.status).toBe(200);
    expect(audits.body.data.auditLogs.length).toBeGreaterThan(0);
    expect(
      audits.body.data.auditLogs.every(
        (log: { action: string; actor?: Record<string, unknown> | null }) => {
          const actor = log.actor ?? {};
          return !('passwordHash' in actor) && log.action.includes('ADMIN_');
        },
      ),
    ).toBe(true);

    const dashboard = await request(app)
      .get('/api/admin/dashboard')
      .set('Cookie', adminCookie);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.suppliers.total).toBeGreaterThanOrEqual(1);
    expect(dashboard.body.data.suppliers.byStatus).toEqual(
      expect.objectContaining({
        DRAFT: expect.any(Number),
        SUBMITTED: expect.any(Number),
      }),
    );
  });
});
