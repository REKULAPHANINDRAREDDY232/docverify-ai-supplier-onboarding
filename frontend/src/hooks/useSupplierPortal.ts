import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import {
  getSupplier,
  listDocumentTypes,
  listSupplierDocuments,
  listSupplierRequests,
  listSuppliers,
  type DocumentRequestDto,
  type DocumentTypeDto,
  type SupplierDocumentDto,
  type SupplierDto,
} from '../api/suppliers';

interface PortalState {
  supplier: SupplierDto | null;
  documents: SupplierDocumentDto[];
  documentTypes: DocumentTypeDto[];
  requests: DocumentRequestDto[];
  loading: boolean;
  error: string | null;
}

export function useSupplierPortal() {
  const [state, setState] = useState<PortalState>({
    supplier: null,
    documents: [],
    documentTypes: [],
    requests: [],
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const [{ suppliers }, { documentTypes }] = await Promise.all([
        listSuppliers(),
        listDocumentTypes(),
      ]);

      const current = suppliers[0] ?? null;
      if (!current) {
        setState({
          supplier: null,
          documents: [],
          documentTypes,
          requests: [],
          loading: false,
          error: null,
        });
        return null;
      }

      const [{ supplier }, { documents }, { requests }] = await Promise.all([
        getSupplier(current.id),
        listSupplierDocuments(current.id),
        listSupplierRequests(current.id),
      ]);

      setState({
        supplier,
        documents,
        documentTypes,
        requests,
        loading: false,
        error: null,
      });
      return supplier;
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error instanceof ApiError ? error.message : 'Unable to load supplier portal data.',
      }));
      return null;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh };
}
