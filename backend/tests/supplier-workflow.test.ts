import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import {
  cleanupUserByEmail,
  cookieHeader,
  registerSupplier,
  uniqueEmail,
} from './helpers';

const PDF_BUFFER = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n');
const PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
  0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
  0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc, 0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
  0x44, 0xae, 0x42, 0x60, 0x82,
]);

describe('Supplier portal workflow', () => {
  const previousUploadDir = process.env.UPLOAD_DIR;
  const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docverify-uploads-'));
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

  async function seedTypes() {
    const codes = ['BUSINESS_REGISTRATION', 'BANK_CONFIRMATION', 'INSURANCE_CERTIFICATE'];
    for (const code of codes) {
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
      });
    }
    return prisma.documentType.findMany({
      where: { code: { in: codes } },
      orderBy: { code: 'asc' },
    });
  }

  it('updates supplier profile and lists only owned suppliers', async () => {
    const email = uniqueEmail('profile');
    createdEmails.push(email);
    const { response } = await registerSupplier(app, { email, companyName: 'Profile Co' });
    const cookie = cookieHeader(response.headers['set-cookie']);

    const listed = await request(app).get('/api/suppliers').set('Cookie', cookie);
    expect(listed.status).toBe(200);
    expect(listed.body.data.suppliers).toHaveLength(1);

    const supplierId = listed.body.data.suppliers[0].id as string;
    const updated = await request(app)
      .patch(`/api/suppliers/${supplierId}`)
      .set('Cookie', cookie)
      .send({
        legalName: 'Profile Co Legal',
        tradingName: 'Profile Trading',
        registrationNumber: 'SYN-2001',
        notes: 'Synthetic onboarding notes',
      });

    expect(updated.status).toBe(200);
    expect(updated.body.data.supplier.legalName).toBe('Profile Co Legal');
    expect(updated.body.data.supplier.tradingName).toBe('Profile Trading');
    expect(updated.body.data.supplier.notes).toBe('Synthetic onboarding notes');
  });

  it('uploads, replaces, downloads documents and submits onboarding', async () => {
    const types = await seedTypes();
    const email = uniqueEmail('docs');
    createdEmails.push(email);
    const { response } = await registerSupplier(app, { email, companyName: 'Docs Co' });
    const cookie = cookieHeader(response.headers['set-cookie']);

    const supplierId = (
      await request(app).get('/api/suppliers').set('Cookie', cookie)
    ).body.data.suppliers[0].id as string;

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
      expect(upload.body.data.document.status).toBe('ACTIVE');
      expect(upload.body.data.document.documentType.code).toBe(type.code);
    }

    const firstType = types[0];
    const listedBefore = await request(app)
      .get(`/api/suppliers/${supplierId}/documents`)
      .set('Cookie', cookie);
    const activeBefore = listedBefore.body.data.documents.find(
      (doc: { documentTypeId: string; status: string }) =>
        doc.documentTypeId === firstType.id && doc.status === 'ACTIVE',
    );

    const replacement = await request(app)
      .post(`/api/suppliers/${supplierId}/documents`)
      .set('Cookie', cookie)
      .field('documentTypeId', firstType.id)
      .field('replaceDocumentId', activeBefore.id)
      .attach('file', PNG_BUFFER, {
        filename: 'replacement.png',
        contentType: 'image/png',
      });

    expect(replacement.status).toBe(201);
    expect(replacement.body.data.document.status).toBe('ACTIVE');
    expect(replacement.body.data.document.supersededDocumentId).toBe(activeBefore.id);

    const listedAfter = await request(app)
      .get(`/api/suppliers/${supplierId}/documents`)
      .set('Cookie', cookie);
    const replaced = listedAfter.body.data.documents.find(
      (doc: { id: string }) => doc.id === activeBefore.id,
    );
    expect(replaced.status).toBe('REPLACED');

    const download = await request(app)
      .get(`/api/documents/${replacement.body.data.document.id}/download`)
      .set('Cookie', cookie);
    expect(download.status).toBe(200);
    expect(download.headers['content-type']).toMatch(/png|octet-stream/);

    const submit = await request(app)
      .post(`/api/suppliers/${supplierId}/submit`)
      .set('Cookie', cookie);
    expect(submit.status).toBe(200);
    expect(submit.body.data.supplier.status).toBe('SUBMITTED');

    const requests = await request(app)
      .get(`/api/suppliers/${supplierId}/requests`)
      .set('Cookie', cookie);
    expect(requests.status).toBe(200);
    expect(Array.isArray(requests.body.data.requests)).toBe(true);
  });

  it('rejects invalid file signatures and blocks cross-supplier access', async () => {
    const types = await seedTypes();
    const emailA = uniqueEmail('owner-docs');
    const emailB = uniqueEmail('intruder-docs');
    createdEmails.push(emailA, emailB);

    const a = await registerSupplier(app, { email: emailA, companyName: 'Owner Docs' });
    const b = await registerSupplier(app, { email: emailB, companyName: 'Intruder Docs' });
    const cookieA = cookieHeader(a.response.headers['set-cookie']);
    const cookieB = cookieHeader(b.response.headers['set-cookie']);

    const supplierA = (await request(app).get('/api/suppliers').set('Cookie', cookieA)).body.data
      .suppliers[0].id as string;
    const supplierB = (await request(app).get('/api/suppliers').set('Cookie', cookieB)).body.data
      .suppliers[0].id as string;

    const invalid = await request(app)
      .post(`/api/suppliers/${supplierA}/documents`)
      .set('Cookie', cookieA)
      .field('documentTypeId', types[0].id)
      .attach('file', Buffer.from('not-a-real-file'), {
        filename: 'fake.pdf',
        contentType: 'application/pdf',
      });
    expect(invalid.status).toBe(400);

    const upload = await request(app)
      .post(`/api/suppliers/${supplierA}/documents`)
      .set('Cookie', cookieA)
      .field('documentTypeId', types[0].id)
      .attach('file', PDF_BUFFER, {
        filename: 'owned.pdf',
        contentType: 'application/pdf',
      });
    expect(upload.status).toBe(201);

    const forbiddenList = await request(app)
      .get(`/api/suppliers/${supplierA}/documents`)
      .set('Cookie', cookieB);
    expect(forbiddenList.status).toBe(403);

    const forbiddenDownload = await request(app)
      .get(`/api/documents/${upload.body.data.document.id}/download`)
      .set('Cookie', cookieB);
    expect(forbiddenDownload.status).toBe(403);

    const forbiddenPatch = await request(app)
      .patch(`/api/suppliers/${supplierA}`)
      .set('Cookie', cookieB)
      .send({ notes: 'should fail' });
    expect(forbiddenPatch.status).toBe(403);

    expect(supplierB).toBeTruthy();
  });
});
