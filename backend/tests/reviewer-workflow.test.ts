import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { UserRole } from '@prisma/client';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import {
  cleanupUserByEmail,
  cookieHeader,
  createStaffUser,
  ensureCoreChecklistItems,
  ensureCoreDocumentTypes,
  loginAs,
  registerSupplier,
  uniqueEmail,
  uploadRequiredDocuments,
} from './helpers';

describe('Reviewer dashboard workflow', () => {
  const previousUploadDir = process.env.UPLOAD_DIR;
  const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docverify-reviewer-'));
  process.env.UPLOAD_DIR = uploadDir;

  const app = createApp();
  const createdEmails: string[] = [];

  afterAll(async () => {
    for (const email of createdEmails) {
      await cleanupUserByEmail(email);
    }
    await prisma.$disconnect();
    process.env.UPLOAD_DIR = previousUploadDir;
    fs.rmSync(uploadDir, { recursive: true, force: true });
  });

  async function createSubmittedSupplier(companyName: string) {
    const types = await ensureCoreDocumentTypes();
    await ensureCoreChecklistItems(types);

    const email = uniqueEmail('rev-supplier');
    createdEmails.push(email);
    const registered = await registerSupplier(app, { email, companyName });
    const cookie = cookieHeader(registered.response.headers['set-cookie']);
    const supplierId = (await request(app).get('/api/suppliers').set('Cookie', cookie)).body.data
      .suppliers[0].id as string;

    await uploadRequiredDocuments(app, cookie, supplierId, types);

    const submit = await request(app)
      .post(`/api/suppliers/${supplierId}/submit`)
      .set('Cookie', cookie);
    expect(submit.status).toBe(200);

    return { supplierId, supplierCookie: cookie, types };
  }

  it('blocks unauthorized users from reviewer APIs', async () => {
    const email = uniqueEmail('blocked-reviewer');
    createdEmails.push(email);
    const registered = await registerSupplier(app, { email });
    const cookie = cookieHeader(registered.response.headers['set-cookie']);

    const dashboard = await request(app).get('/api/reviewer/dashboard').set('Cookie', cookie);
    expect(dashboard.status).toBe(403);

    const list = await request(app).get('/api/reviewer/suppliers').set('Cookie', cookie);
    expect(list.status).toBe(403);
  });

  it('16. lists submitted supplier packets for reviewers', async () => {
    const { email } = await createStaffUser(UserRole.REVIEWER);
    createdEmails.push(email);
    const reviewerCookie = await loginAs(app, email);
    const { supplierId } = await createSubmittedSupplier('Listable Supplies Ltd');

    const listed = await request(app)
      .get('/api/reviewer/suppliers')
      .query({ q: 'Listable', status: 'SUBMITTED' })
      .set('Cookie', reviewerCookie);

    expect(listed.status).toBe(200);
    expect(listed.body.data.suppliers.some((row: { id: string }) => row.id === supplierId)).toBe(
      true,
    );
  });

  it('17. allows reviewers to access supplier documents', async () => {
    const { email } = await createStaffUser(UserRole.REVIEWER);
    createdEmails.push(email);
    const reviewerCookie = await loginAs(app, email);
    const { supplierId } = await createSubmittedSupplier('Document Access Supplies');

    const detail = await request(app)
      .get(`/api/reviewer/suppliers/${supplierId}`)
      .set('Cookie', reviewerCookie);
    expect(detail.status).toBe(200);
    expect(detail.body.data.supplier.documents.length).toBeGreaterThanOrEqual(3);

    const documentId = detail.body.data.supplier.documents[0].id as string;
    const download = await request(app)
      .get(`/api/documents/${documentId}/download`)
      .set('Cookie', reviewerCookie);
    expect(download.status).toBe(200);
    expect(download.body.length).toBeGreaterThan(0);
  });

  it('18. records checklist results', async () => {
    const { email } = await createStaffUser(UserRole.REVIEWER);
    createdEmails.push(email);
    const reviewerCookie = await loginAs(app, email);
    const { supplierId } = await createSubmittedSupplier('Checklist Supplies');

    const detail = await request(app)
      .get(`/api/reviewer/suppliers/${supplierId}`)
      .set('Cookie', reviewerCookie);
    const itemId = detail.body.data.checklistItems[0].id as string;

    const check = await request(app)
      .put(`/api/reviewer/suppliers/${supplierId}/checklist/${itemId}`)
      .set('Cookie', reviewerCookie)
      .send({ status: 'PRESENT', comment: 'Document visually confirmed' });

    expect(check.status).toBe(200);
    expect(check.body.data.check.status).toBe('PRESENT');
    expect(check.body.data.check.checkedById).toBeTruthy();

    const persisted = await prisma.checklistCheck.findUnique({
      where: {
        supplierId_checklistItemId: {
          supplierId,
          checklistItemId: itemId,
        },
      },
    });
    expect(persisted?.status).toBe('PRESENT');
    expect(persisted?.comment).toBe('Document visually confirmed');
  });

  it('19. records reviewer decisions and updates supplier status', async () => {
    const { email } = await createStaffUser(UserRole.REVIEWER);
    createdEmails.push(email);
    const reviewerCookie = await loginAs(app, email);
    const { supplierId } = await createSubmittedSupplier('Decision Supplies');

    const decision = await request(app)
      .post(`/api/reviewer/suppliers/${supplierId}/decisions`)
      .set('Cookie', reviewerCookie)
      .send({
        decision: 'APPROVED',
        comment: 'All required synthetic documents are acceptable.',
      });

    expect(decision.status).toBe(201);
    expect(decision.body.data.supplier.status).toBe('APPROVED');
    expect(decision.body.data.action.decision).toBe('APPROVED');

    const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: supplierId } });
    expect(supplier.status).toBe('APPROVED');
  });

  it('20. creates additional document requests', async () => {
    const { email } = await createStaffUser(UserRole.REVIEWER);
    createdEmails.push(email);
    const reviewerCookie = await loginAs(app, email);
    const { supplierId, types } = await createSubmittedSupplier('Request Supplies');

    const requestDoc = await request(app)
      .post(`/api/reviewer/suppliers/${supplierId}/document-requests`)
      .set('Cookie', reviewerCookie)
      .send({
        documentTypeId: types[1].id,
        message: 'Please upload a clearer bank confirmation letter.',
      });

    expect(requestDoc.status).toBe(201);
    expect(requestDoc.body.data.supplier.status).toBe('NEEDS_INFORMATION');
    expect(requestDoc.body.data.request.message).toMatch(/bank confirmation/i);

    const openRequests = await prisma.documentRequest.count({
      where: { supplierId, status: 'OPEN' },
    });
    expect(openRequests).toBeGreaterThanOrEqual(1);
  });

  it('21. exposes review history and related audit activity', async () => {
    const { email } = await createStaffUser(UserRole.REVIEWER);
    createdEmails.push(email);
    const reviewerCookie = await loginAs(app, email);
    const { supplierId, types } = await createSubmittedSupplier('History Supplies');

    await request(app)
      .patch(`/api/reviewer/suppliers/${supplierId}/corrections`)
      .set('Cookie', reviewerCookie)
      .send({
        legalName: 'History Supplies Limited',
        reason: 'Align legal name with registration certificate',
      });

    await request(app)
      .post(`/api/reviewer/suppliers/${supplierId}/document-requests`)
      .set('Cookie', reviewerCookie)
      .send({
        documentTypeId: types[0].id,
        message: 'Please resubmit business registration.',
      });

    await request(app)
      .post(`/api/reviewer/suppliers/${supplierId}/decisions`)
      .set('Cookie', reviewerCookie)
      .send({
        decision: 'ON_HOLD',
        comment: 'Holding pending clearer registration scan.',
      });

    const history = await request(app)
      .get(`/api/reviewer/suppliers/${supplierId}`)
      .set('Cookie', reviewerCookie);

    expect(history.status).toBe(200);
    expect(history.body.data.supplier.reviewActions.length).toBeGreaterThan(0);
    expect(history.body.data.supplier.documentRequests.length).toBeGreaterThan(0);
    expect(
      history.body.data.auditLogs.some(
        (log: { action: string }) => log.action === 'SUPPLIER_MANUAL_CORRECTION',
      ),
    ).toBe(true);
    expect(history.body.data.supplier.status).toBe('ON_HOLD');
  });
});
