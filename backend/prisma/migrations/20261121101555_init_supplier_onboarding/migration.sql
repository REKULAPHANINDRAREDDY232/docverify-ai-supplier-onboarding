-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPPLIER_CONTACT', 'REVIEWER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'NEEDS_INFORMATION', 'APPROVED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('ACTIVE', 'REPLACED');

-- CreateEnum
CREATE TYPE "ChecklistStatus" AS ENUM ('PRESENT', 'MISSING', 'NEEDS_REVIEW', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVED', 'ON_HOLD', 'NEEDS_INFORMATION');

-- CreateEnum
CREATE TYPE "DocumentRequestStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradingName" TEXT,
    "registrationNumber" TEXT,
    "contactPerson" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactUserId" TEXT NOT NULL,
    "status" "SupplierStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_documents" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "storedFilename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersededDocumentId" TEXT,

    CONSTRAINT "supplier_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "documentTypeId" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_checks" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,
    "status" "ChecklistStatus" NOT NULL,
    "comment" TEXT,
    "checkedById" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_actions" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_requests" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "DocumentRequestStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "document_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reference_sources" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "sourceDescription" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reference_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_contactUserId_key" ON "suppliers"("contactUserId");

-- CreateIndex
CREATE INDEX "suppliers_status_idx" ON "suppliers"("status");

-- CreateIndex
CREATE INDEX "suppliers_companyName_idx" ON "suppliers"("companyName");

-- CreateIndex
CREATE INDEX "suppliers_registrationNumber_idx" ON "suppliers"("registrationNumber");

-- CreateIndex
CREATE INDEX "suppliers_contactEmail_idx" ON "suppliers"("contactEmail");

-- CreateIndex
CREATE UNIQUE INDEX "document_types_code_key" ON "document_types"("code");

-- CreateIndex
CREATE INDEX "document_types_active_required_idx" ON "document_types"("active", "required");

-- CreateIndex
CREATE INDEX "supplier_documents_supplierId_documentTypeId_idx" ON "supplier_documents"("supplierId", "documentTypeId");

-- CreateIndex
CREATE INDEX "supplier_documents_status_idx" ON "supplier_documents"("status");

-- CreateIndex
CREATE INDEX "supplier_documents_uploadedById_idx" ON "supplier_documents"("uploadedById");

-- CreateIndex
CREATE INDEX "supplier_documents_supersededDocumentId_idx" ON "supplier_documents"("supersededDocumentId");

-- CreateIndex
CREATE INDEX "checklist_items_documentTypeId_idx" ON "checklist_items"("documentTypeId");

-- CreateIndex
CREATE INDEX "checklist_items_isActive_isRequired_idx" ON "checklist_items"("isActive", "isRequired");

-- CreateIndex
CREATE INDEX "checklist_items_version_idx" ON "checklist_items"("version");

-- CreateIndex
CREATE INDEX "checklist_checks_status_idx" ON "checklist_checks"("status");

-- CreateIndex
CREATE INDEX "checklist_checks_checkedById_idx" ON "checklist_checks"("checkedById");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_checks_supplierId_checklistItemId_key" ON "checklist_checks"("supplierId", "checklistItemId");

-- CreateIndex
CREATE INDEX "review_actions_supplierId_createdAt_idx" ON "review_actions"("supplierId", "createdAt");

-- CreateIndex
CREATE INDEX "review_actions_reviewerId_idx" ON "review_actions"("reviewerId");

-- CreateIndex
CREATE INDEX "review_actions_decision_idx" ON "review_actions"("decision");

-- CreateIndex
CREATE INDEX "document_requests_supplierId_status_idx" ON "document_requests"("supplierId", "status");

-- CreateIndex
CREATE INDEX "document_requests_reviewerId_idx" ON "document_requests"("reviewerId");

-- CreateIndex
CREATE INDEX "document_requests_documentTypeId_idx" ON "document_requests"("documentTypeId");

-- CreateIndex
CREATE INDEX "reference_sources_effectiveDate_idx" ON "reference_sources"("effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "reference_sources_title_version_key" ON "reference_sources"("title", "version");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_contactUserId_fkey" FOREIGN KEY ("contactUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_supersededDocumentId_fkey" FOREIGN KEY ("supersededDocumentId") REFERENCES "supplier_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "document_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_checks" ADD CONSTRAINT "checklist_checks_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_checks" ADD CONSTRAINT "checklist_checks_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "checklist_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_checks" ADD CONSTRAINT "checklist_checks_checkedById_fkey" FOREIGN KEY ("checkedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_actions" ADD CONSTRAINT "review_actions_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_actions" ADD CONSTRAINT "review_actions_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
