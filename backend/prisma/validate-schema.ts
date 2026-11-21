import { PrismaClient } from '@prisma/client';
import { config as loadEnv } from 'dotenv';

loadEnv({ quiet: true });

const prisma = new PrismaClient();

async function main() {
  const [
    documentTypes,
    checklistItems,
    users,
    suppliers,
    referenceSources,
    supplierWithRelations,
  ] = await Promise.all([
    prisma.documentType.findMany({ orderBy: { code: 'asc' } }),
    prisma.checklistItem.findMany({
      include: { documentType: true },
      orderBy: { title: 'asc' },
    }),
    prisma.user.findMany({
      select: { id: true, email: true, role: true, supplierAsContact: true },
      orderBy: { email: 'asc' },
    }),
    prisma.supplier.findMany({
      include: {
        contactUser: { select: { email: true, role: true } },
        documents: true,
        checklistChecks: true,
        reviewActions: true,
        documentRequests: true,
      },
    }),
    prisma.referenceSource.findMany(),
    prisma.supplier.findFirst({
      include: {
        contactUser: true,
        documents: { include: { documentType: true } },
        checklistChecks: { include: { checklistItem: true } },
        reviewActions: true,
        documentRequests: true,
      },
    }),
  ]);

  const requiredCodes = ['BUSINESS_REGISTRATION', 'BANK_CONFIRMATION', 'INSURANCE_CERTIFICATE'];
  const missingCodes = requiredCodes.filter(
    (code) => !documentTypes.some((type) => type.code === code),
  );

  if (missingCodes.length > 0) {
    throw new Error(`Missing required document types: ${missingCodes.join(', ')}`);
  }

  if (checklistItems.length < 3) {
    throw new Error('Expected seeded checklist items linked to document types.');
  }

  if (users.length < 3) {
    throw new Error('Expected seeded users for ADMIN, REVIEWER, and SUPPLIER_CONTACT.');
  }

  if (suppliers.length < 1 || !supplierWithRelations?.contactUser) {
    throw new Error('Expected at least one supplier linked to a contact user.');
  }

  if (supplierWithRelations.contactUser.role !== 'SUPPLIER_CONTACT') {
    throw new Error('Supplier contact user must have SUPPLIER_CONTACT role.');
  }

  if (referenceSources.length < 1) {
    throw new Error('Expected at least one reference source.');
  }

  const checklistWithoutType = checklistItems.filter((item) => !item.documentTypeId);
  if (checklistWithoutType.length > 0) {
    throw new Error('Seeded checklist items should reference document types.');
  }

  console.log('Database relationship validation passed.');
  console.log(
    JSON.stringify(
      {
        documentTypes: documentTypes.map((type) => type.code),
        checklistItems: checklistItems.length,
        users: users.map((user) => ({ email: user.email, role: user.role })),
        suppliers: suppliers.map((supplier) => ({
          companyName: supplier.companyName,
          status: supplier.status,
          contactEmail: supplier.contactUser.email,
          documents: supplier.documents.length,
          checklistChecks: supplier.checklistChecks.length,
          reviewActions: supplier.reviewActions.length,
          documentRequests: supplier.documentRequests.length,
        })),
        referenceSources: referenceSources.length,
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
