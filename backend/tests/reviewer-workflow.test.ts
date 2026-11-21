import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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

const PDF_BUFFER = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n');

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

  async function ensureTypesAndChecklist() {
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
            description: `${code} type`,
            required: true,
            active: true,
          },
        }),
      );
    }

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

    return types;
  }

  async function createReviewer() {
    const email = uniqueEmail('reviewer');
    createdEmails.push(email);
    await prisma.user.create({
      data: {
        name: 'Packet Reviewer',
        email,
        passwordHash: await hashPassword('secure-password-1'),
        role: UserRole.REVIEWER,
      },
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'secure-password-1' });
    return { email, cookie: cookieHeader(login.headers['set-cookie']) };
  }

  async function createSubmittedSupplier(companyName: string) {
    const types = await ensureTypesAndChecklist();
    const email = uniqueEmail('rev-supplier');
    createdEmails.push(email);
    const registered = await registerSupplier(app, { email, companyName });
    const cookie = cookieHeader(registered.response.headers['set-cookie']);
    const supplierId = (await request(app).get('/api/suppliers').set('Cookie', cookie)).body.data
      .suppliers[0].id as string;

    for (const type of types) {
      const upload = await request(app)
        .post(`/api/suppliers/${supplierId}/documents`)
        .set('Cookie', cookie)
        .field('documentTypeId', type.id)
        .attach('file', PDF_BUFFER, {
          filename: `${type.code}.pdf`,
          contentType: 'application/pdf',
        });
      expect(upload.status).toBe(201);
    }

    const submit = await request(app)
      .post(`/api/suppliers/${supplierId}/submit`)
      .set('Cookie', cookie);
    expect(submit.status).toBe(200);

    return { supplierId, supplierCookie: cookie, types };
  }

  it('blocks supplier contacts from reviewer endpoints', async () => {
    const email = uniqueEmail('blocked-reviewer');
    createdEmails.push(email);
    const registered = await registerSupplier(app, { email });
    const cookie = cookieHeader(registered.response.headers['set-cookie']);

    const dashboard = await request(app).get('/api/reviewer/dashboard').set('Cookie', cookie);
    expect(dashboard.status).toBe(403);
  });

  it('lists submitted suppliers, records checklist/decision/request/correction', async () => {
    const reviewer = await createReviewer();
    const { supplierId, types } = await createSubmittedSupplier('Reviewable Supplies Ltd');

    const listed = await request(app)
      .get('/api/reviewer/suppliers')
      .query({ q: 'Reviewable', status: 'SUBMITTED' })
      .set('Cookie', reviewer.cookie);
    expect(listed.status).toBe(200);
    expect(listed.body.data.suppliers.some((row: { id: string }) => row.id === supplierId)).toBe(
      true,
    );

    const detail = await request(app)
      .get(`/api/reviewer/suppliers/${supplierId}`)
      .set('Cookie', reviewer.cookie);
    expect(detail.status).toBe(200);
    expect(detail.body.data.checklistItems.length).toBeGreaterThan(0);

    const itemId = detail.body.data.checklistItems[0].id as string;
    const check = await request(app)
      .put(`/api/reviewer/suppliers/${supplierId}/checklist/${itemId}`)
      .set('Cookie', reviewer.cookie)
      .send({ status: 'PRESENT', comment: 'Document visually confirmed' });
    expect(check.status).toBe(200);
    expect(check.body.data.check.status).toBe('PRESENT');
    expect(check.body.data.check.checkedById).toBeTruthy();

    const correction = await request(app)
      .patch(`/api/reviewer/suppliers/${supplierId}/corrections`)
      .set('Cookie', reviewer.cookie)
      .send({
        legalName: 'Reviewable Supplies Limited',
        reason: 'Align legal name with registration certificate',
      });
    expect(correction.status).toBe(200);
    expect(correction.body.data.supplier.legalName).toBe('Reviewable Supplies Limited');

    const requestDoc = await request(app)
      .post(`/api/reviewer/suppliers/${supplierId}/document-requests`)
      .set('Cookie', reviewer.cookie)
      .send({
        documentTypeId: types[1].id,
        message: 'Please upload a clearer bank confirmation letter.',
      });
    expect(requestDoc.status).toBe(201);
    expect(requestDoc.body.data.supplier.status).toBe('NEEDS_INFORMATION');

    const decision = await request(app)
      .post(`/api/reviewer/suppliers/${supplierId}/decisions`)
      .set('Cookie', reviewer.cookie)
      .send({
        decision: 'ON_HOLD',
        comment: 'Holding until updated bank confirmation arrives.',
      });
    expect(decision.status).toBe(201);
    expect(decision.body.data.supplier.status).toBe('ON_HOLD');

    const history = await request(app)
      .get(`/api/reviewer/suppliers/${supplierId}`)
      .set('Cookie', reviewer.cookie);
    expect(history.body.data.supplier.reviewActions.length).toBeGreaterThan(0);
    expect(
      history.body.data.auditLogs.some(
        (log: { action: string }) => log.action === 'SUPPLIER_MANUAL_CORRECTION',
      ),
    ).toBe(true);
  });
});
