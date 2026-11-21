import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import { config as loadEnv } from 'dotenv';

loadEnv({ quiet: true });

const prisma = new PrismaClient();

interface SeedAccount {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

function requireSeedPassword(envName: string, value: string | undefined): string {
  if (!value || value.trim().length < 10) {
    throw new Error(
      `${envName} is required for seeding and must be at least 10 characters. Set it in backend/.env.`,
    );
  }
  return value;
}

function buildSeedAccounts(): SeedAccount[] {
  return [
    {
      name: process.env.SEED_ADMIN_NAME ?? 'System Administrator',
      email: process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com',
      password: requireSeedPassword('SEED_ADMIN_PASSWORD', process.env.SEED_ADMIN_PASSWORD),
      role: UserRole.ADMIN,
    },
    {
      name: process.env.SEED_REVIEWER_NAME ?? 'Procurement Reviewer',
      email: process.env.SEED_REVIEWER_EMAIL ?? 'reviewer@example.com',
      password: requireSeedPassword('SEED_REVIEWER_PASSWORD', process.env.SEED_REVIEWER_PASSWORD),
      role: UserRole.REVIEWER,
    },
    {
      name: process.env.SEED_SUPPLIER_NAME ?? 'Supplier Contact',
      email: process.env.SEED_SUPPLIER_EMAIL ?? 'supplier@example.com',
      password: requireSeedPassword('SEED_SUPPLIER_PASSWORD', process.env.SEED_SUPPLIER_PASSWORD),
      role: UserRole.SUPPLIER_CONTACT,
    },
  ];
}

const documentTypes = [
  {
    code: 'BUSINESS_REGISTRATION',
    name: 'Business Registration',
    description: 'Official company registration or incorporation certificate.',
    required: true,
  },
  {
    code: 'BANK_CONFIRMATION',
    name: 'Bank Confirmation',
    description: 'Bank letter confirming account ownership for payments.',
    required: true,
  },
  {
    code: 'INSURANCE_CERTIFICATE',
    name: 'Insurance Certificate',
    description: 'Current public liability or required commercial insurance cover.',
    required: true,
  },
] as const;

async function seedDocumentTypes() {
  const records = [];

  for (const documentType of documentTypes) {
    const record = await prisma.documentType.upsert({
      where: { code: documentType.code },
      update: {
        name: documentType.name,
        description: documentType.description,
        required: documentType.required,
        active: true,
      },
      create: {
        code: documentType.code,
        name: documentType.name,
        description: documentType.description,
        required: documentType.required,
        active: true,
      },
    });
    records.push(record);
  }

  return records;
}

async function seedChecklistItems(
  types: Awaited<ReturnType<typeof seedDocumentTypes>>,
) {
  const byCode = Object.fromEntries(types.map((type) => [type.code, type]));
  const effectiveDate = new Date('2026-01-01T00:00:00.000Z');

  const items = [
    {
      title: 'Business registration certificate attached',
      description: 'Confirm a valid registration document is present for the legal entity.',
      documentTypeId: byCode.BUSINESS_REGISTRATION.id,
      version: '1.0',
    },
    {
      title: 'Legal name matches registration document',
      description: 'Company legal name on the profile must match the registration certificate.',
      documentTypeId: byCode.BUSINESS_REGISTRATION.id,
      version: '1.0',
    },
    {
      title: 'Bank confirmation letter attached',
      description: 'Confirm a bank-issued confirmation letter is uploaded.',
      documentTypeId: byCode.BANK_CONFIRMATION.id,
      version: '1.0',
    },
    {
      title: 'Bank account details are complete',
      description: 'Account name and bank identifiers must be readable for payment setup.',
      documentTypeId: byCode.BANK_CONFIRMATION.id,
      version: '1.0',
    },
    {
      title: 'Insurance certificate attached',
      description: 'Confirm an insurance certificate covering the supplier is present.',
      documentTypeId: byCode.INSURANCE_CERTIFICATE.id,
      version: '1.0',
    },
    {
      title: 'Insurance cover is currently effective',
      description: 'Certificate validity dates must cover the onboarding review date.',
      documentTypeId: byCode.INSURANCE_CERTIFICATE.id,
      version: '1.0',
    },
  ];

  const seeded = [];

  for (const item of items) {
    const existing = await prisma.checklistItem.findFirst({
      where: {
        title: item.title,
        version: item.version,
      },
    });

    if (existing) {
      seeded.push(
        await prisma.checklistItem.update({
          where: { id: existing.id },
          data: {
            description: item.description,
            documentTypeId: item.documentTypeId,
            isRequired: true,
            isActive: true,
            effectiveDate,
          },
        }),
      );
      continue;
    }

    seeded.push(
      await prisma.checklistItem.create({
        data: {
          title: item.title,
          description: item.description,
          documentTypeId: item.documentTypeId,
          isRequired: true,
          isActive: true,
          version: item.version,
          effectiveDate,
        },
      }),
    );
  }

  return seeded;
}

async function seedReferenceSources() {
  return prisma.referenceSource.upsert({
    where: {
      title_version: {
        title: 'Supplier Onboarding Checklist Guidance',
        version: '1.0',
      },
    },
    update: {
      sourceDescription:
        'Internal procurement guidance for reviewing registration, banking, and insurance documents.',
      effectiveDate: new Date('2026-01-01T00:00:00.000Z'),
    },
    create: {
      title: 'Supplier Onboarding Checklist Guidance',
      version: '1.0',
      effectiveDate: new Date('2026-01-01T00:00:00.000Z'),
      sourceDescription:
        'Internal procurement guidance for reviewing registration, banking, and insurance documents.',
    },
  });
}

async function seedUsers(accounts: SeedAccount[]) {
  const users = [];

  for (const account of accounts) {
    const passwordHash = await bcrypt.hash(account.password, 12);
    const user = await prisma.user.upsert({
      where: { email: account.email.toLowerCase() },
      update: {
        name: account.name,
        passwordHash,
        role: account.role,
      },
      create: {
        name: account.name,
        email: account.email.toLowerCase(),
        passwordHash,
        role: account.role,
      },
    });
    users.push(user);
  }

  return users;
}

async function seedSupplier(contactUserId: string, contactEmail: string, contactPerson: string) {
  const companyName = process.env.SEED_SUPPLIER_COMPANY_NAME ?? 'Northwind Supplies Ltd';

  const existing = await prisma.supplier.findUnique({
    where: { contactUserId },
  });

  if (existing) {
    return prisma.supplier.update({
      where: { id: existing.id },
      data: {
        companyName,
        legalName: process.env.SEED_SUPPLIER_LEGAL_NAME ?? companyName,
        tradingName: process.env.SEED_SUPPLIER_TRADING_NAME ?? 'Northwind Supplies',
        registrationNumber: process.env.SEED_SUPPLIER_REGISTRATION_NUMBER ?? 'SYN-REG-1001',
        contactPerson,
        contactEmail,
        notes: 'Synthetic seed supplier for local development only.',
      },
    });
  }

  return prisma.supplier.create({
    data: {
      companyName,
      legalName: process.env.SEED_SUPPLIER_LEGAL_NAME ?? companyName,
      tradingName: process.env.SEED_SUPPLIER_TRADING_NAME ?? 'Northwind Supplies',
      registrationNumber: process.env.SEED_SUPPLIER_REGISTRATION_NUMBER ?? 'SYN-REG-1001',
      contactPerson,
      contactEmail,
      contactUserId,
      status: 'DRAFT',
      notes: 'Synthetic seed supplier for local development only.',
    },
  });
}

async function writeAuditLog(actorId: string, action: string, entityType: string, entityId: string) {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      entityType,
      entityId,
      metadata: {
        source: 'prisma-seed',
        environment: process.env.NODE_ENV ?? 'development',
      },
    },
  });
}

async function main() {
  if (process.env.SEED_ENABLED === 'false') {
    console.log('SEED_ENABLED=false — skipping database seed.');
    return;
  }

  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    throw new Error('Refusing to seed production without ALLOW_PRODUCTION_SEED=true.');
  }

  const accounts = buildSeedAccounts();
  const documentTypeRecords = await seedDocumentTypes();
  const checklistItems = await seedChecklistItems(documentTypeRecords);
  const referenceSource = await seedReferenceSources();
  const users = await seedUsers(accounts);

  const supplierContact = users.find((user) => user.role === UserRole.SUPPLIER_CONTACT);
  const admin = users.find((user) => user.role === UserRole.ADMIN);

  if (!supplierContact || !admin) {
    throw new Error('Seed users for ADMIN and SUPPLIER_CONTACT are required.');
  }

  const supplier = await seedSupplier(
    supplierContact.id,
    supplierContact.email,
    supplierContact.name,
  );

  await writeAuditLog(admin.id, 'SEED_COMPLETED', 'Supplier', supplier.id);

  console.log('Database seed completed.');
  console.log(
    JSON.stringify(
      {
        documentTypes: documentTypeRecords.length,
        checklistItems: checklistItems.length,
        users: users.map((user) => ({ email: user.email, role: user.role })),
        supplier: {
          id: supplier.id,
          companyName: supplier.companyName,
          status: supplier.status,
        },
        referenceSource: {
          id: referenceSource.id,
          title: referenceSource.title,
          version: referenceSource.version,
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
