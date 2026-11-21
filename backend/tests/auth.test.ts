import request from 'supertest';
import { UserRole } from '@prisma/client';
import { createApp } from '../src/app';
import { hashPassword } from '../src/lib/password';
import { prisma } from '../src/lib/prisma';
import { AUTH_COOKIE_NAME } from '../src/types/auth';
import {
  cleanupUserByEmail,
  cookieHeader,
  registerSupplier,
  uniqueEmail,
} from './helpers';

describe('Authentication API', () => {
  const app = createApp();
  const createdEmails: string[] = [];

  afterAll(async () => {
    for (const email of createdEmails) {
      await cleanupUserByEmail(email);
    }
    await prisma.$disconnect();
  });

  it('registers a supplier contact with hashed password and auth cookie', async () => {
    const email = uniqueEmail('register');
    createdEmails.push(email);

    const { response } = await registerSupplier(app, { email });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.role).toBe(UserRole.SUPPLIER_CONTACT);
    expect(response.body.data.user.email).toBe(email.toLowerCase());
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(cookieHeader(response.headers['set-cookie']).join(';')).toContain(AUTH_COOKIE_NAME);

    const stored = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    expect(stored?.passwordHash).toBeTruthy();
    expect(stored?.passwordHash).not.toContain('secure-password');
  });

  it('rejects duplicate email registration', async () => {
    const email = uniqueEmail('duplicate');
    createdEmails.push(email);

    await registerSupplier(app, { email });
    const second = await registerSupplier(app, { email });

    expect(second.response.status).toBe(409);
  });

  it('ignores attempted role escalation on public registration', async () => {
    const email = uniqueEmail('escalate');
    createdEmails.push(email);

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Attacker',
        email,
        password: 'secure-password-1',
        companyName: 'Bad Actor Ltd',
        role: 'ADMIN',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.user.role).toBe(UserRole.SUPPLIER_CONTACT);
  });

  it('logs in with valid credentials and restores session via /me', async () => {
    const email = uniqueEmail('login');
    createdEmails.push(email);
    const password = 'secure-password-1';

    await registerSupplier(app, { email, password });

    const login = await request(app).post('/api/auth/login').send({ email, password });
    expect(login.status).toBe(200);
    expect(login.body.data.user.email).toBe(email.toLowerCase());

    const cookie = cookieHeader(login.headers['set-cookie']);
    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(email.toLowerCase());
    expect(me.body.data.user.supplierAsContact).toBeTruthy();
  });

  it('rejects invalid login credentials', async () => {
    const email = uniqueEmail('badlogin');
    createdEmails.push(email);
    await registerSupplier(app, { email });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'wrong-password-value' });

    expect(response.status).toBe(401);
  });

  it('logs out and clears the auth cookie', async () => {
    const email = uniqueEmail('logout');
    createdEmails.push(email);
    const agent = request.agent(app);

    const registerResponse = await agent.post('/api/auth/register').send({
      name: 'Logout User',
      email,
      password: 'secure-password-1',
      companyName: 'Logout Co',
    });
    expect(registerResponse.status).toBe(201);

    const logout = await agent.post('/api/auth/logout');
    expect(logout.status).toBe(200);
    expect(cookieHeader(logout.headers['set-cookie']).join(';')).toMatch(
      /docverify_access_token=/,
    );

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(401);
  });

  it('requires authentication for /me', async () => {
    const response = await request(app).get('/api/auth/me');
    expect(response.status).toBe(401);
  });

  it('allows admins to provision reviewer accounts and blocks suppliers', async () => {
    const adminEmail = uniqueEmail('admin');
    const reviewerEmail = uniqueEmail('reviewer');
    const supplierEmail = uniqueEmail('supplier-admin-check');
    createdEmails.push(adminEmail, reviewerEmail, supplierEmail);

    const admin = await prisma.user.create({
      data: {
        name: 'Temp Admin',
        email: adminEmail,
        passwordHash: await hashPassword('secure-password-1'),
        role: UserRole.ADMIN,
      },
    });

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: adminEmail, password: 'secure-password-1' });
    const adminCookie = cookieHeader(adminLogin.headers['set-cookie']);

    const created = await request(app)
      .post('/api/admin/users')
      .set('Cookie', adminCookie)
      .send({
        name: 'Provisioned Reviewer',
        email: reviewerEmail,
        password: 'secure-password-1',
        role: UserRole.REVIEWER,
      });

    expect(created.status).toBe(201);
    expect(created.body.data.user.role).toBe(UserRole.REVIEWER);

    const { response: supplierRegister } = await registerSupplier(app, {
      email: supplierEmail,
    });
    const supplierCookie = cookieHeader(supplierRegister.headers['set-cookie']);

    const blocked = await request(app)
      .post('/api/admin/users')
      .set('Cookie', supplierCookie)
      .send({
        name: 'Should Fail',
        email: uniqueEmail('blocked'),
        password: 'secure-password-1',
        role: UserRole.ADMIN,
      });

    expect(blocked.status).toBe(403);
    expect(admin.id).toBeTruthy();
  });

  it('prevents supplier contacts from accessing another supplier record', async () => {
    const emailA = uniqueEmail('owner');
    const emailB = uniqueEmail('intruder');
    createdEmails.push(emailA, emailB);

    const { response: a } = await registerSupplier(app, {
      email: emailA,
      companyName: 'Owner Co',
    });
    const { response: b } = await registerSupplier(app, {
      email: emailB,
      companyName: 'Intruder Co',
    });

    const ownerCookie = cookieHeader(a.headers['set-cookie']);
    const intruderCookie = cookieHeader(b.headers['set-cookie']);

    const ownerList = await request(app).get('/api/suppliers').set('Cookie', ownerCookie);
    expect(ownerList.status).toBe(200);
    expect(ownerList.body.data.suppliers).toHaveLength(1);

    const otherId = (
      await request(app).get('/api/suppliers').set('Cookie', intruderCookie)
    ).body.data.suppliers[0].id;

    const forbidden = await request(app)
      .get(`/api/suppliers/${otherId}`)
      .set('Cookie', ownerCookie);

    expect(forbidden.status).toBe(403);
  });

  it('writes audit logs for register and login', async () => {
    const email = uniqueEmail('audit');
    createdEmails.push(email);

    await registerSupplier(app, { email });
    await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'secure-password-1' });

    const user = await prisma.user.findUniqueOrThrow({ where: { email: email.toLowerCase() } });
    const logs = await prisma.auditLog.findMany({
      where: { actorId: user.id, action: { in: ['AUTH_REGISTER', 'AUTH_LOGIN'] } },
    });

    expect(logs.map((log) => log.action).sort()).toEqual(['AUTH_LOGIN', 'AUTH_REGISTER']);
  });
});
