import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { UserRole } from '@prisma/client';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';
import {
  PDF_BUFFER,
  PNG_BUFFER,
  SYNTHETIC_PASSWORD,
  cleanupUserByEmail,
  cookieHeader,
  createStaffUser,
  ensureCoreDocumentTypes,
  loginAs,
  registerSupplier,
  uniqueEmail,
  uploadRequiredDocuments,
} from './helpers';

describe('Supplier portal workflow', () => {
  const previousUploadDir = process.env.UPLOAD_DIR;
  const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docverify-supplier-'));
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

  it('8. creates a supplier profile for an admin-provisioned contact', async () => {
    const { email: adminEmail } = await createStaffUser(UserRole.ADMIN);
    createdEmails.push(adminEmail);
    const adminCookie = await loginAs(app, adminEmail);

    const contactEmail = uniqueEmail('profile-create');
    createdEmails.push(contactEmail);
    const provisioned = await request(app)
      .post('/api/admin/users')
      .set('Cookie', adminCookie)
      .send({
        name: 'Profile Creator',
        email: contactEmail,
        password: SYNTHETIC_PASSWORD,
        role: UserRole.SUPPLIER_CONTACT,
      });
    expect(provisioned.status).toBe(201);

    const contactCookie = await loginAs(app, contactEmail);
    const created = await request(app)
      .post('/api/suppliers')
      .set('Cookie', contactCookie)
      .send({
        companyName: 'Fresh Profile Ltd',
        legalName: 'Fresh Profile Limited',
        tradingName: 'Fresh Profile',
        registrationNumber: 'SYN-CREATE-1',
        contactPerson: 'Profile Creator',
        contactEmail,
        notes: 'Synthetic profile creation',
      });

    expect(created.status).toBe(201);
    expect(created.body.data.supplier.companyName).toBe('Fresh Profile Ltd');
    expect(created.body.data.supplier.status).toBe('DRAFT');

    const duplicate = await request(app)
      .post('/api/suppliers')
      .set('Cookie', contactCookie)
      .send({
        companyName: 'Duplicate Profile Ltd',
        legalName: 'Duplicate Profile Limited',
        contactPerson: 'Profile Creator',
        contactEmail,
      });
    expect(duplicate.status).toBe(409);
  });

  it('9. updates an owned supplier profile', async () => {
    const email = uniqueEmail('profile-update');
    createdEmails.push(email);
    const { response } = await registerSupplier(app, { email, companyName: 'Update Co' });
    const cookie = cookieHeader(response.headers['set-cookie']);

    const listed = await request(app).get('/api/suppliers').set('Cookie', cookie);
    expect(listed.status).toBe(200);
    expect(listed.body.data.suppliers).toHaveLength(1);

    const supplierId = listed.body.data.suppliers[0].id as string;
    const updated = await request(app)
      .patch(`/api/suppliers/${supplierId}`)
      .set('Cookie', cookie)
      .send({
        legalName: 'Update Co Legal',
        tradingName: 'Update Trading',
        registrationNumber: 'SYN-2001',
        notes: 'Synthetic onboarding notes',
      });

    expect(updated.status).toBe(200);
    expect(updated.body.data.supplier.legalName).toBe('Update Co Legal');
    expect(updated.body.data.supplier.tradingName).toBe('Update Trading');
    expect(updated.body.data.supplier.notes).toBe('Synthetic onboarding notes');

    const persisted = await prisma.supplier.findUniqueOrThrow({ where: { id: supplierId } });
    expect(persisted.legalName).toBe('Update Co Legal');
    expect(persisted.registrationNumber).toBe('SYN-2001');
  });

  it('10. uploads a valid supplier document', async () => {
    const types = await ensureCoreDocumentTypes();
    const email = uniqueEmail('upload');
    createdEmails.push(email);
    const { response } = await registerSupplier(app, { email, companyName: 'Upload Co' });
    const cookie = cookieHeader(response.headers['set-cookie']);
    const supplierId = (await request(app).get('/api/suppliers').set('Cookie', cookie)).body.data
      .suppliers[0].id as string;

    const upload = await request(app)
      .post(`/api/suppliers/${supplierId}/documents`)
      .set('Cookie', cookie)
      .field('documentTypeId', types[0].id)
      .attach('file', PDF_BUFFER, {
        filename: 'business-registration.pdf',
        contentType: 'application/pdf',
      });

    expect(upload.status).toBe(201);
    expect(upload.body.data.document.status).toBe('ACTIVE');
    expect(upload.body.data.document.documentType.code).toBe(types[0].code);
    expect(upload.body.data.document.originalFilename).toBe('business-registration.pdf');
    expect(fs.existsSync(upload.body.data.document.storagePath)).toBe(true);
  });

  it('11. rejects unsupported file types', async () => {
    const types = await ensureCoreDocumentTypes();
    const email = uniqueEmail('bad-type');
    createdEmails.push(email);
    const { response } = await registerSupplier(app, { email, companyName: 'Bad Type Co' });
    const cookie = cookieHeader(response.headers['set-cookie']);
    const supplierId = (await request(app).get('/api/suppliers').set('Cookie', cookie)).body.data
      .suppliers[0].id as string;

    const byMime = await request(app)
      .post(`/api/suppliers/${supplierId}/documents`)
      .set('Cookie', cookie)
      .field('documentTypeId', types[0].id)
      .attach('file', Buffer.from('not-a-pdf'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      });
    expect(byMime.status).toBe(400);
    expect(byMime.body.error.message).toMatch(/pdf|jpg|png/i);

    const bySignature = await request(app)
      .post(`/api/suppliers/${supplierId}/documents`)
      .set('Cookie', cookie)
      .field('documentTypeId', types[0].id)
      .attach('file', Buffer.from('not-a-real-file'), {
        filename: 'fake.pdf',
        contentType: 'application/pdf',
      });
    expect(bySignature.status).toBe(400);
  });

  it('12. rejects oversized uploads', async () => {
    const types = await ensureCoreDocumentTypes();
    const email = uniqueEmail('oversized');
    createdEmails.push(email);
    const { response } = await registerSupplier(app, { email, companyName: 'Oversized Co' });
    const cookie = cookieHeader(response.headers['set-cookie']);
    const supplierId = (await request(app).get('/api/suppliers').set('Cookie', cookie)).body.data
      .suppliers[0].id as string;

    const oversized = Buffer.alloc(env.MAX_UPLOAD_BYTES + 1, 0x25);
    oversized.write('%PDF', 0);

    const upload = await request(app)
      .post(`/api/suppliers/${supplierId}/documents`)
      .set('Cookie', cookie)
      .field('documentTypeId', types[0].id)
      .attach('file', oversized, {
        filename: 'too-large.pdf',
        contentType: 'application/pdf',
      });

    expect(upload.status).toBe(400);
    expect(upload.body.error.message).toMatch(/10 mb|upload limit|too large|file size/i);
  });

  it('13. enforces supplier ownership validation', async () => {
    const emailA = uniqueEmail('owner');
    const emailB = uniqueEmail('intruder');
    createdEmails.push(emailA, emailB);

    const a = await registerSupplier(app, { email: emailA, companyName: 'Owner Co' });
    const b = await registerSupplier(app, { email: emailB, companyName: 'Intruder Co' });
    const cookieA = cookieHeader(a.response.headers['set-cookie']);
    const cookieB = cookieHeader(b.response.headers['set-cookie']);

    const supplierA = (await request(app).get('/api/suppliers').set('Cookie', cookieA)).body.data
      .suppliers[0].id as string;
    const supplierB = (await request(app).get('/api/suppliers').set('Cookie', cookieB)).body.data
      .suppliers[0].id as string;

    expect(supplierA).not.toBe(supplierB);

    const forbiddenGet = await request(app)
      .get(`/api/suppliers/${supplierA}`)
      .set('Cookie', cookieB);
    expect(forbiddenGet.status).toBe(403);

    const forbiddenPatch = await request(app)
      .patch(`/api/suppliers/${supplierA}`)
      .set('Cookie', cookieB)
      .send({ notes: 'should fail' });
    expect(forbiddenPatch.status).toBe(403);

    const types = await ensureCoreDocumentTypes();
    const upload = await request(app)
      .post(`/api/suppliers/${supplierA}/documents`)
      .set('Cookie', cookieA)
      .field('documentTypeId', types[0].id)
      .attach('file', PDF_BUFFER, {
        filename: 'owned.pdf',
        contentType: 'application/pdf',
      });
    expect(upload.status).toBe(201);

    const forbiddenDocs = await request(app)
      .get(`/api/suppliers/${supplierA}/documents`)
      .set('Cookie', cookieB);
    expect(forbiddenDocs.status).toBe(403);

    const forbiddenDownload = await request(app)
      .get(`/api/documents/${upload.body.data.document.id}/download`)
      .set('Cookie', cookieB);
    expect(forbiddenDownload.status).toBe(403);
  });

  it('14. replaces an existing document and marks the previous file as REPLACED', async () => {
    const types = await ensureCoreDocumentTypes();
    const email = uniqueEmail('replace');
    createdEmails.push(email);
    const { response } = await registerSupplier(app, { email, companyName: 'Replace Co' });
    const cookie = cookieHeader(response.headers['set-cookie']);
    const supplierId = (await request(app).get('/api/suppliers').set('Cookie', cookie)).body.data
      .suppliers[0].id as string;

    const first = await request(app)
      .post(`/api/suppliers/${supplierId}/documents`)
      .set('Cookie', cookie)
      .field('documentTypeId', types[0].id)
      .attach('file', PDF_BUFFER, {
        filename: 'original.pdf',
        contentType: 'application/pdf',
      });
    expect(first.status).toBe(201);
    const originalId = first.body.data.document.id as string;

    const replacement = await request(app)
      .post(`/api/suppliers/${supplierId}/documents`)
      .set('Cookie', cookie)
      .field('documentTypeId', types[0].id)
      .field('replaceDocumentId', originalId)
      .attach('file', PNG_BUFFER, {
        filename: 'replacement.png',
        contentType: 'image/png',
      });

    expect(replacement.status).toBe(201);
    expect(replacement.body.data.document.status).toBe('ACTIVE');
    expect(replacement.body.data.document.supersededDocumentId).toBe(originalId);

    const listed = await request(app)
      .get(`/api/suppliers/${supplierId}/documents`)
      .set('Cookie', cookie);
    const replaced = listed.body.data.documents.find((doc: { id: string }) => doc.id === originalId);
    expect(replaced.status).toBe('REPLACED');

    const download = await request(app)
      .get(`/api/documents/${replacement.body.data.document.id}/download`)
      .set('Cookie', cookie);
    expect(download.status).toBe(200);
  });

  it('15. tracks onboarding status from DRAFT to SUBMITTED', async () => {
    const types = await ensureCoreDocumentTypes();
    const email = uniqueEmail('status');
    createdEmails.push(email);
    const { response } = await registerSupplier(app, { email, companyName: 'Status Co' });
    const cookie = cookieHeader(response.headers['set-cookie']);
    const supplierId = (await request(app).get('/api/suppliers').set('Cookie', cookie)).body.data
      .suppliers[0].id as string;

    const before = await request(app).get(`/api/suppliers/${supplierId}`).set('Cookie', cookie);
    expect(before.body.data.supplier.status).toBe('DRAFT');

    const incomplete = await request(app)
      .post(`/api/suppliers/${supplierId}/submit`)
      .set('Cookie', cookie);
    expect(incomplete.status).toBe(400);

    await uploadRequiredDocuments(app, cookie, supplierId, types);

    const submit = await request(app)
      .post(`/api/suppliers/${supplierId}/submit`)
      .set('Cookie', cookie);
    expect(submit.status).toBe(200);
    expect(submit.body.data.supplier.status).toBe('SUBMITTED');

    const persisted = await prisma.supplier.findUniqueOrThrow({ where: { id: supplierId } });
    expect(persisted.status).toBe('SUBMITTED');
  });
});
