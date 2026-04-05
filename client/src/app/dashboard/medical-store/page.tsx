"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Loader from "@/components/ui/loader";
import { useGetMedicalStoreOnboarding } from "@/app/onboarding/hooks/use-onboarding";
import { MedicalStoreMapDisplay } from "@/components/medical-store/medical-store-map";
import medicalStoreApi, { type MedicalStoreCatalogResponse } from "./_api";
import { getErrorMessage } from "@/lib/error-utils";
import {
  Building2,
  MapPin,
  MapPinned,
  Phone,
  Mail,
  FileText,
  Globe,
  Store,
  Sparkles,
  Package,
  RefreshCw,
  Pill,
  ExternalLink,
  ImageIcon,
} from "lucide-react";
import { cardSectionClass } from "@/lib/dashboard-ui";
import { cn } from "@/lib/utils";
import { useCustomToast } from "@/hooks/use-custom-toast";

const PAGE_SIZE = 12;

export default function MedicalStoreDashboardPage() {
  const { data: profile, isLoading: profileLoading, error: profileError, refetch: refetchProfile } =
    useGetMedicalStoreOnboarding();
  const { showError, showSuccess } = useCustomToast();
  const [catalog, setCatalog] = useState<MedicalStoreCatalogResponse | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [page] = useState(1);
  const [logoUploading, setLogoUploading] = useState(false);

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

  const onLogoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLogoUploading(true);
    try {
      await medicalStoreApi.uploadStoreLogo(file);
      showSuccess("Logo updated", "Your store logo is live on the marketplace.");
      await refetchProfile();
    } catch (err) {
      showError("Upload failed", getErrorMessage(err));
    } finally {
      setLogoUploading(false);
    }
  };

  const onRemoveLogo = async () => {
    setLogoUploading(true);
    try {
      await medicalStoreApi.clearStoreLogo();
      showSuccess("Logo removed", "The default icon will show on your public pages.");
      await refetchProfile();
    } catch (err) {
      showError("Could not remove logo", getErrorMessage(err));
    } finally {
      setLogoUploading(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader title="Loading dashboard" description="Fetching your store profile..." />
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">
          {profileError ? "Unable to load medical store profile." : "No store profile found yet. Complete onboarding first."}
        </p>
      </div>
    );
  }

  const row = profile as Record<string, unknown>;
  const latNum = Number(row.latitude);
  const lngNum = Number(row.longitude);
  const hasCoords = Number.isFinite(latNum) && Number.isFinite(lngNum);
  const storeName = String(row.storeName ?? "Your pharmacy");
  const storeId = String(row.id ?? "");
  const logoUrl = row.logoUrl != null && String(row.logoUrl).trim() !== "" ? String(row.logoUrl) : null;

  return (
    <div className="w-full space-y-8">
      <div
        className={cn(
          cardSectionClass(),
          "relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-8 shadow-sm",
        )}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-muted/40 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border-0 bg-primary px-3 py-0.5 text-primary-foreground hover:bg-primary/90">
                <Sparkles className="mr-1 h-3 w-3" />
                Store dashboard
              </Badge>
              <span className="text-xs text-muted-foreground">PillSure · medical retail</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{storeName}</h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Manage your location, store logo, and catalog. Customers see your logo and listings on discover and your
              public pharmacy page.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 border-primary/25 bg-background/80 dark:border-primary/30"
              onClick={() => loadCatalog(page)}
              disabled={catalogLoading}
            >
              <RefreshCw className={`h-4 w-4 ${catalogLoading ? "animate-spin" : ""}`} />
              Refresh stats
            </Button>
          </div>
        </div>
      </div>

      {catalog && !catalogLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Catalog SKUs</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{catalog.stats.totalSkus}</div>
              <p className="text-xs text-muted-foreground">Medicines listed for your store</p>
            </CardContent>
          </Card>
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Live on storefront</CardTitle>
              <Store className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{catalog.stats.activeSkus}</div>
              <p className="text-xs text-muted-foreground">Visible to customers</p>
            </CardContent>
          </Card>
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Units listed</CardTitle>
              <Pill className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{catalog.stats.totalUnitsListed.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Sum of listed quantities</p>
            </CardContent>
          </Card>
        </div>
      ) : catalogLoading && !catalog ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse border-border/60">
              <CardHeader className="h-16" />
              <CardContent className="h-16" />
            </Card>
          ))}
        </div>
      ) : null}

      {catalogError ? (
        <p className="text-sm text-destructive">{catalogError}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-primary/10 p-2">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{storeName}</CardTitle>
                  <CardDescription className="mt-1 flex items-start gap-1.5">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      {String(row.addressLine ?? "")}
                      {row.city ? `, ${String(row.city)}` : ""}
                      {row.province ? `, ${String(row.province)}` : ""}
                      {row.postalCode ? ` ${String(row.postalCode)}` : ""}
                      {row.country ? ` · ${String(row.country)}` : ""}
                    </span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{row.phone ? String(row.phone) : "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{row.email ? String(row.email) : "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>{row.licenseNumber ? String(row.licenseNumber) : "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span>{row.website ? String(row.website) : "—"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPinned className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Delivery & discovery</CardTitle>
              </div>
              <CardDescription>Customers find you by distance using this pin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {hasCoords ? (
                <>
                  <MedicalStoreMapDisplay latitude={latNum} longitude={lngNum} />
                  <p className="font-mono text-xs text-muted-foreground">
                    {latNum.toFixed(6)}, {lngNum.toFixed(6)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Not set — complete onboarding and place your store on the map.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/80 lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="h-4 w-4 text-primary" />
              Store logo
            </CardTitle>
            <CardDescription>
              Shown on discover and your pharmacy page. Square image works best (e.g. 512×512).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="mx-auto flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted">
              {logoUrl ? (
                <Image src={logoUrl} alt="" width={128} height={128} className="h-full w-full object-cover" unoptimized />
              ) : (
                <Store className="h-14 w-14 text-muted-foreground/40" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="cursor-pointer text-xs file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-2 file:py-1 file:text-xs file:font-medium file:text-primary-foreground"
                disabled={logoUploading}
                onChange={onLogoSelected}
              />
              <div className="flex flex-wrap gap-2">
                {logoUrl ? (
                  <Button type="button" variant="outline" size="sm" disabled={logoUploading} onClick={onRemoveLogo}>
                    Remove logo
                  </Button>
                ) : null}
                {storeId ? (
                  <Button type="button" variant="secondary" size="sm" asChild>
                    <Link href={`/pharmacy/${storeId}`} target="_blank" rel="noopener noreferrer" className="gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5" />
                      View public page
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
