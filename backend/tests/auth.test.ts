import request from 'supertest';
import { UserRole } from '@prisma/client';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { AUTH_COOKIE_NAME } from '../src/types/auth';
import {
  SYNTHETIC_PASSWORD,
  cleanupUserByEmail,
  cookieHeader,
  createStaffUser,
  loginAs,
  registerSupplier,
  uniqueEmail,
} from './helpers';

describe('Authentication & authorization', () => {
  const app = createApp();
  const createdEmails: string[] = [];

  afterAll(async () => {
    for (const email of createdEmails) {
      await cleanupUserByEmail(email);
    }
    await prisma.$disconnect();
  });

  it('1. registers a supplier contact with hashed password and HttpOnly cookie', async () => {
    const email = uniqueEmail('register');
    createdEmails.push(email);

    const { response } = await registerSupplier(app, {
      email,
      companyName: 'Synthetic Register Co',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.role).toBe(UserRole.SUPPLIER_CONTACT);
    expect(response.body.data.user.email).toBe(email.toLowerCase());
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(cookieHeader(response.headers['set-cookie']).join(';')).toContain(AUTH_COOKIE_NAME);

    const stored = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    expect(stored?.passwordHash).toBeTruthy();
    expect(stored?.passwordHash).not.toContain(SYNTHETIC_PASSWORD);

    const supplier = await prisma.supplier.findUnique({
      where: { contactUserId: stored!.id },
    });
    expect(supplier?.companyName).toBe('Synthetic Register Co');
    expect(supplier?.status).toBe('DRAFT');
  });

  it('2. rejects duplicate email registration', async () => {
    const email = uniqueEmail('duplicate');
    createdEmails.push(email);

    const first = await registerSupplier(app, { email });
    expect(first.response.status).toBe(201);

    const second = await registerSupplier(app, { email });
    expect(second.response.status).toBe(409);
    expect(second.response.body.success).toBe(false);
  });

  it('3. logs in successfully and restores the session via /me', async () => {
    const email = uniqueEmail('login');
    createdEmails.push(email);
    await registerSupplier(app, { email, password: SYNTHETIC_PASSWORD });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email, password: SYNTHETIC_PASSWORD });

    expect(login.status).toBe(200);
    expect(login.body.data.user.email).toBe(email.toLowerCase());
    expect(login.body.data.user.passwordHash).toBeUndefined();

    const cookie = cookieHeader(login.headers['set-cookie']);
    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(email.toLowerCase());
    expect(me.body.data.user.supplierAsContact).toBeTruthy();
  });

  it('4. rejects incorrect password login attempts', async () => {
    const email = uniqueEmail('badlogin');
    createdEmails.push(email);
    await registerSupplier(app, { email });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'definitely-wrong-password' });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toMatch(/invalid email or password/i);
  });

  it('5. logs out and clears the authenticated session', async () => {
    const email = uniqueEmail('logout');
    createdEmails.push(email);
    const agent = request.agent(app);

    const registerResponse = await agent.post('/api/auth/register').send({
      name: 'Logout User',
      email,
      password: SYNTHETIC_PASSWORD,
      companyName: 'Logout Synthetic Co',
    });
    expect(registerResponse.status).toBe(201);

    const meBefore = await agent.get('/api/auth/me');
    expect(meBefore.status).toBe(200);

    const logout = await agent.post('/api/auth/logout');
    expect(logout.status).toBe(200);
    expect(cookieHeader(logout.headers['set-cookie']).join(';')).toMatch(
      /docverify_access_token=/,
    );

    const meAfter = await agent.get('/api/auth/me');
    expect(meAfter.status).toBe(401);
  });

  it('6. grants reviewer authorization and blocks supplier contacts from reviewer APIs', async () => {
    const { email: reviewerEmail } = await createStaffUser(UserRole.REVIEWER);
    createdEmails.push(reviewerEmail);
    const reviewerCookie = await loginAs(app, reviewerEmail);

    const reviewerDashboard = await request(app)
      .get('/api/reviewer/dashboard')
      .set('Cookie', reviewerCookie);
    expect(reviewerDashboard.status).toBe(200);
    expect(reviewerDashboard.body.data.stats).toEqual(
      expect.objectContaining({
        submitted: expect.any(Number),
        inReview: expect.any(Number),
      }),
    );

    const supplierEmail = uniqueEmail('not-reviewer');
    createdEmails.push(supplierEmail);
    const { response } = await registerSupplier(app, { email: supplierEmail });
    const supplierCookie = cookieHeader(response.headers['set-cookie']);

    const blocked = await request(app)
      .get('/api/reviewer/dashboard')
      .set('Cookie', supplierCookie);
    expect(blocked.status).toBe(403);
  });

  it('7. grants administrator authorization and blocks supplier contacts from admin APIs', async () => {
    const { email: adminEmail } = await createStaffUser(UserRole.ADMIN);
    createdEmails.push(adminEmail);
    const adminCookie = await loginAs(app, adminEmail);

    const dashboard = await request(app)
      .get('/api/admin/dashboard')
      .set('Cookie', adminCookie);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.suppliers.total).toEqual(expect.any(Number));

    const supplierEmail = uniqueEmail('not-admin');
    createdEmails.push(supplierEmail);
    const { response } = await registerSupplier(app, { email: supplierEmail });
    const supplierCookie = cookieHeader(response.headers['set-cookie']);

    const blocked = await request(app)
      .get('/api/admin/users')
      .set('Cookie', supplierCookie);
    expect(blocked.status).toBe(403);

    const unauthenticated = await request(app).get('/api/admin/dashboard');
    expect(unauthenticated.status).toBe(401);
  });

  it('ignores public registration role escalation attempts', async () => {
    const email = uniqueEmail('escalate');
    createdEmails.push(email);

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Attacker',
        email,
        password: SYNTHETIC_PASSWORD,
        companyName: 'Bad Actor Ltd',
        role: 'ADMIN',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.user.role).toBe(UserRole.SUPPLIER_CONTACT);
  });
});
