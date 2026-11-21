/* eslint-disable react-hooks/set-state-in-effect -- remote packet fetch on id change */
import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import {
  fetchReviewerSupplier,
  type ReviewerSupplierDetail,
} from '../api/reviewer';
import { listDocumentTypes, type DocumentTypeDto } from '../api/suppliers';
import type { ChecklistStatus } from '../types/domain';

type CheckDraft = { status: ChecklistStatus; comment: string };

export function useReviewerSupplierDetail(id: string) {
  const [detail, setDetail] = useState<ReviewerSupplierDetail | null>(null);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeDto[]>([]);
  const [checkDrafts, setCheckDrafts] = useState<Record<string, CheckDraft>>({});
  const [correction, setCorrection] = useState({
    companyName: '',
    legalName: '',
    tradingName: '',
    registrationNumber: '',
    contactPerson: '',
    contactEmail: '',
    notes: '',
    reason: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [supplierDetail, types] = await Promise.all([
        fetchReviewerSupplier(id),
        listDocumentTypes(),
      ]);
      setDetail(supplierDetail);
      setDocumentTypes(types.documentTypes);
      setCorrection({
        companyName: supplierDetail.supplier.companyName,
        legalName: supplierDetail.supplier.legalName,
        tradingName: supplierDetail.supplier.tradingName ?? '',
        registrationNumber: supplierDetail.supplier.registrationNumber ?? '',
        contactPerson: supplierDetail.supplier.contactPerson,
        contactEmail: supplierDetail.supplier.contactEmail,
        notes: supplierDetail.supplier.notes ?? '',
        reason: '',
      });

      const drafts: Record<string, CheckDraft> = {};
      for (const item of supplierDetail.checklistItems) {
        const existing = supplierDetail.supplier.checklistChecks.find(
          (check) => check.checklistItemId === item.id,
        );
        drafts[item.id] = {
          status: existing?.status ?? 'NEEDS_REVIEW',
          comment: existing?.comment ?? '',
        };
      }
      setCheckDrafts(drafts);
      return supplierDetail;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load supplier review packet.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    detail,
    documentTypes,
    checkDrafts,
    setCheckDrafts,
    correction,
    setCorrection,
    loading,
    error,
    setError,
    refresh,
  };
}
