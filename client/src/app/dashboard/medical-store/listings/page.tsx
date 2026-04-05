"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import medicalStoreApi, { type MedicalStoreCatalogResponse } from "../_api";
import { ManageListingsTab } from "../manage-listings-tab";
import { getErrorMessage } from "@/lib/error-utils";
import { LayoutList } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { DashboardScrollWorkspace } from "@/components/shell/dashboard-scroll-workspace";

const PAGE_SIZE = 12;

export default function MedicalStoreListingsPage() {
  const [catalog, setCatalog] = useState<MedicalStoreCatalogResponse | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const loadCatalog = useCallback(async (p: number) => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const res = await medicalStoreApi.listCatalog(p, PAGE_SIZE);
      setCatalog(res);
    } catch (e) {
      setCatalogError(getErrorMessage(e));
      setCatalog(null);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog(page);
  }, [loadCatalog, page]);

  const totalPages = catalog ? Math.max(1, Math.ceil(catalog.total / PAGE_SIZE)) : 1;

  return (
    <DashboardScrollWorkspace
      header={
        <PageHeader
          title="Manage listings"
          description={
            <>
              Add medicines from the PillSure catalog to your store, set prices and stock, and control visibility. Shelf
              categories are under{" "}
              <Link href="/dashboard/medical-store/categories">Store categories</Link>.
            </>
          }
          icon={LayoutList}
        />
      }
    >
      <ManageListingsTab
        rows={catalog?.items ?? []}
        loading={Boolean(catalogLoading && !catalog)}
        error={catalogError}
        page={page}
        totalPages={totalPages}
        total={catalog?.total ?? 0}
        catalogLoading={catalogLoading}
        onPageChange={setPage}
        onRefresh={() => loadCatalog(page)}
        compactCatalogHeader
      />
    </DashboardScrollWorkspace>
  );
}
