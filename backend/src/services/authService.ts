import { Prisma, UserRole } from '@prisma/client';
import { writeAuditLog } from '../lib/audit';
import { hashPassword, verifyPassword } from '../lib/password';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import type { AuthUser } from '../types/auth';
import type { AdminCreateUserInput, LoginInput, RegisterInput } from '../validators/auth';

function toAuthUser(user: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function registerSupplierContact(input: RegisterInput): Promise<AuthUser> {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    throw new AppError(409, 'Email is already registered');
  }

  const passwordHash = await hashPassword(input.password);
  const legalName = input.legalName?.trim() || input.companyName;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name,
          email,
          passwordHash,
          role: UserRole.SUPPLIER_CONTACT,
        },
      });

      await tx.supplier.create({
        data: {
          companyName: input.companyName,
          legalName,
          tradingName: input.tradingName,
          registrationNumber: input.registrationNumber,
          contactPerson: input.name,
          contactEmail: email,
          contactUserId: user.id,
          status: 'DRAFT',
        },
      });

      return user;
    });

    await writeAuditLog({
      actorId: result.id,
      action: 'AUTH_REGISTER',
      entityType: 'User',
      entityId: result.id,
      metadata: { role: result.role, email: result.email },
    });

    return toAuthUser(result);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(409, 'Email is already registered');
    }
    throw error;
  }
}

export async function loginUser(input: LoginInput): Promise<AuthUser> {
  const email = input.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    await writeAuditLog({
      action: 'AUTH_LOGIN_FAILED',
      entityType: 'User',
      entityId: email,
      metadata: { reason: 'unknown_email' },
    });
    throw new AppError(401, 'Invalid email or password');
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    await writeAuditLog({
      actorId: user.id,
      action: 'AUTH_LOGIN_FAILED',
      entityType: 'User',
      entityId: user.id,
      metadata: { reason: 'invalid_password' },
    });
    throw new AppError(401, 'Invalid email or password');
  }

  await writeAuditLog({
    actorId: user.id,
    action: 'AUTH_LOGIN',
    entityType: 'User',
    entityId: user.id,
    metadata: { role: user.role },
  });

  return toAuthUser(user);
}

export async function getAuthenticatedProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      supplierAsContact: {
        select: {
          id: true,
          companyName: true,
          legalName: true,
          status: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError(401, 'Authentication required');
  }

  return user;
}

export async function createProvisionedUser(
  actorId: string,
  input: AdminCreateUserInput,
): Promise<AuthUser> {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    throw new AppError(409, 'Email is already registered');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email,
      passwordHash,
      role: input.role,
    },
  });

  await writeAuditLog({
    actorId,
    action: 'ADMIN_USER_CREATED',
    entityType: 'User',
    entityId: user.id,
    metadata: { role: user.role, email: user.email },
  });

  return toAuthUser(user);
}

export async function recordLogout(userId: string): Promise<void> {
  await writeAuditLog({
    actorId: userId,
    action: 'AUTH_LOGOUT',
    entityType: 'User',
    entityId: userId,
  });
}
