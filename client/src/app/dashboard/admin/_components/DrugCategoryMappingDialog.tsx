"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DrugCategory, AdminSpecialization } from "./_types";
import { adminApi } from "./_api";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { getErrorMessage } from "@/lib/error-utils";
import { cn } from "@/lib/utils";
import {
  GripVertical,
  Search,
  Stethoscope,
  Tags,
  Loader2,
  ArrowRightLeft,
  Inbox,
  Link2,
} from "lucide-react";

const ZONE_AVAILABLE = "zone-available";
const ZONE_MAPPED = "zone-mapped";

function resolveDropZone(
  overId: string | number | null | undefined,
  mappedIds: number[]
): "mapped" | "available" | null {
  if (overId == null) return null;
  const s = String(overId);
  if (s === ZONE_MAPPED) return "mapped";
  if (s === ZONE_AVAILABLE) return "available";
  const n = parseInt(s, 10);
  if (Number.isNaN(n)) return null;
  if (mappedIds.includes(n)) return "mapped";
  return "available";
}

function DraggableSpecCard({
  spec,
  variant,
}: {
  spec: AdminSpecialization;
  variant: "available" | "mapped";
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(spec.id),
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-all duration-200",
        "cursor-grab active:cursor-grabbing touch-none select-none",
        "shadow-sm hover:shadow-md",
        variant === "available" &&
          "border-border/80 bg-background/95 hover:border-primary/35 hover:bg-muted/40",
        variant === "mapped" &&
          "border-primary/30 bg-gradient-to-r from-primary/[0.07] via-background to-background hover:border-primary/45",
        isDragging && "scale-[0.98] opacity-50 shadow-none"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
          variant === "available"
            ? "border-border/60 bg-muted/50 text-muted-foreground group-hover:border-primary/25 group-hover:text-primary"
            : "border-primary/25 bg-primary/10 text-primary"
        )}
        aria-hidden
      >
        <GripVertical className="h-4 w-4" />
      </span>
      <span className="flex-1 leading-snug font-medium tracking-tight text-foreground/95">
        {spec.name}
      </span>
    </div>
  );
}

function DropColumn({
  id,
  title,
  subtitle,
  icon: Icon,
  count,
  children,
  variant,
}: {
  id: string;
  title: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  count: number;
  children: React.ReactNode;
  variant: "available" | "mapped";
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const isMapped = variant === "mapped";

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[300px] flex-col overflow-hidden rounded-2xl border transition-all duration-300",
        !isMapped &&
          "border-border/70 bg-gradient-to-b from-muted/30 to-card/80 shadow-sm dark:from-muted/15 dark:to-card/40",
        isMapped &&
          "border-primary/35 bg-gradient-to-br from-primary/[0.06] via-background to-muted/20 shadow-md ring-1 ring-primary/15 dark:from-primary/10",
        isOver && "border-primary ring-2 ring-primary/25 ring-offset-2 ring-offset-background"
      )}
    >
      <div
        className={cn(
          "relative border-b px-4 py-3.5",
          !isMapped && "border-border/60 bg-muted/40 dark:bg-muted/25",
          isMapped && "border-primary/20 bg-primary/[0.08] dark:bg-primary/15"
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm",
              !isMapped && "border-border/60 bg-background text-muted-foreground",
              isMapped && "border-primary/30 bg-primary/15 text-primary"
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
              <span
                className={cn(
                  "inline-flex min-w-[1.75rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                  !isMapped && "bg-background/80 text-muted-foreground ring-1 ring-border/80",
                  isMapped && "bg-primary text-primary-foreground shadow-sm"
                )}
              >
                {count}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        <div className="flex flex-col gap-2.5 p-3 pr-2">{children}</div>
      </div>
    </div>
  );
}

interface DrugCategoryMappingDialogProps {
  open: boolean;
  onClose: () => void;
  category: DrugCategory | null;
}

export default function DrugCategoryMappingDialog({
  open,
  onClose,
  category,
}: DrugCategoryMappingDialogProps) {
  const { showSuccess, showError } = useCustomToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allSpecs, setAllSpecs] = useState<AdminSpecialization[]>([]);
  const [mappedIds, setMappedIds] = useState<number[]>([]);
  const [initialMappedIds, setInitialMappedIds] = useState<number[]>([]);
  const [filter, setFilter] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  useEffect(() => {
    if (!open || !category) {
      return;
    }

    const categoryId = category.id;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [specs, mappings] = await Promise.all([
          adminApi.getAdminSpecializations(),
          adminApi.getDrugCategoryMappings(categoryId),
        ]);
        if (cancelled) return;
        setAllSpecs(specs);
        const ids = mappings.specializationIds ?? [];
        setMappedIds(ids);
        setInitialMappedIds(ids);
        setFilter("");
      } catch (e) {
        if (!cancelled) {
          showError("Could not load mapping", getErrorMessage(e));
          onClose();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, category?.id]);

  const filterLower = filter.trim().toLowerCase();
  const matchesFilter = (name: string) =>
    !filterLower || name.toLowerCase().includes(filterLower);

  const availableSpecs = useMemo(() => {
    return allSpecs.filter((s) => !mappedIds.includes(s.id) && matchesFilter(s.name));
  }, [allSpecs, mappedIds, filterLower]);

  const mappedSpecs = useMemo(() => {
    const set = new Set(mappedIds);
    return allSpecs
      .filter((s) => set.has(s.id) && matchesFilter(s.name))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allSpecs, mappedIds, filterLower]);

  const activeSpec = useMemo(
    () => (activeId ? allSpecs.find((s) => String(s.id) === activeId) : null),
    [activeId, allSpecs]
  );

  const isDirty = useMemo(() => {
    const a = [...mappedIds].sort((x, y) => x - y);
    const b = [...initialMappedIds].sort((x, y) => x - y);
    return JSON.stringify(a) !== JSON.stringify(b);
  }, [mappedIds, initialMappedIds]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const sid = parseInt(String(active.id), 10);
    if (Number.isNaN(sid)) return;

    const zone = resolveDropZone(over.id, mappedIds);
    if (!zone) return;

    if (zone === "mapped") {
      setMappedIds((prev) => (prev.includes(sid) ? prev : [...prev, sid]));
    } else {
      setMappedIds((prev) => prev.filter((x) => x !== sid));
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleSave = async () => {
    if (!category) return;
    setSaving(true);
    try {
      await adminApi.setDrugCategoryMappings(category.id, mappedIds);
      showSuccess("Mapping saved", "Doctor specializations are updated for this category.");
      setInitialMappedIds([...mappedIds]);
      onClose();
    } catch (e) {
      showError("Could not save mapping", getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setActiveId(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="flex max-h-[min(92vh,760px)] w-[min(100vw-1.5rem,58rem)] flex-col gap-0 overflow-hidden border-border/60 p-0 shadow-2xl sm:max-w-[58rem]">
        <DialogHeader className="relative shrink-0 space-y-0 border-b border-border/60 bg-gradient-to-br from-primary/[0.07] via-background to-muted/40 px-6 pb-5 pt-6 dark:from-primary/10 dark:via-background dark:to-muted/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 shadow-inner">
                  <Link2 className="h-4 w-4" />
                </span>
                <DialogTitle className="text-left text-xl font-semibold tracking-tight">
                  Specialization mapping
                </DialogTitle>
              </div>
              {category ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Category
                    </span>
                    <span className="inline-flex max-w-full items-center rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                      {category.name}
                    </span>
                  </div>
                  <DialogDescription className="max-w-xl text-left text-sm leading-relaxed text-muted-foreground">
                    Choose which doctor specializations match this medicine category. Patients who
                    use &quot;Find a doctor&quot; from medicines in this category will see doctors
                    in these specializations.
                  </DialogDescription>
                </>
              ) : null}
            </div>
            {isDirty && !loading && (
              <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-800 dark:text-amber-200">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                Unsaved changes
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="shrink-0 border-b border-border/40 bg-muted/20 px-6 py-4 dark:bg-muted/10">
          <div className="relative mx-auto max-w-lg">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search specializations…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-11 rounded-full border-border/80 bg-background pl-10 pr-4 shadow-sm transition-shadow focus-visible:ring-2 focus-visible:ring-primary/25"
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/15 px-4 py-4 dark:bg-muted/5 sm:px-6">
          {loading ? (
            <div className="flex h-[min(360px,50vh)] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/60 bg-card/30">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Loading specializations</p>
                <p className="mt-1 text-xs text-muted-foreground">Fetching list and current mapping…</p>
              </div>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="mx-auto grid min-h-0 w-full max-w-5xl flex-1 grid-cols-1 grid-rows-[minmax(14rem,min(52vh,26rem))_minmax(14rem,min(52vh,26rem))] items-stretch gap-5 md:grid-cols-[1fr_minmax(2rem,auto)_1fr] md:grid-rows-1 md:gap-3">
                  <DropColumn
                    id={ZONE_AVAILABLE}
                    title="Available"
                    subtitle="Specializations not linked to this category yet."
                    icon={Stethoscope}
                    count={availableSpecs.length}
                    variant="available"
                  >
                    {availableSpecs.map((spec) => (
                      <DraggableSpecCard key={spec.id} spec={spec} variant="available" />
                    ))}
                    {availableSpecs.length === 0 && (
                      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/20 py-10 text-center">
                        <Inbox className="h-10 w-10 text-muted-foreground/50" />
                        <p className="text-sm font-medium text-muted-foreground">
                          {filter.trim() ? "No matches" : "All set here"}
                        </p>
                        <p className="max-w-[220px] text-xs text-muted-foreground/90">
                          {filter.trim()
                            ? "Try another search term."
                            : "Everything is mapped in the column on the right."}
                        </p>
                      </div>
                    )}
                  </DropColumn>

                <div
                  className="hidden min-h-0 items-center justify-center self-center text-muted-foreground/35 md:flex"
                  aria-hidden
                >
                  <ArrowRightLeft className="h-7 w-7" />
                </div>

                  <DropColumn
                    id={ZONE_MAPPED}
                    title="Linked to category"
                    subtitle="These power doctor search & recommendations for this category."
                    icon={Tags}
                    count={mappedSpecs.length}
                    variant="mapped"
                  >
                    {mappedSpecs.map((spec) => (
                      <DraggableSpecCard key={spec.id} spec={spec} variant="mapped" />
                    ))}
                    {mappedSpecs.length === 0 && (
                      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/25 bg-primary/[0.04] py-10 text-center dark:bg-primary/[0.07]">
                        <Tags className="h-10 w-10 text-primary/50" />
                        <p className="text-sm font-medium text-foreground">Drop specializations here</p>
                        <p className="max-w-[240px] text-xs text-muted-foreground">
                          Drag from the left column or pull items back here to link them.
                        </p>
                      </div>
                    )}
                  </DropColumn>
              </div>
              </div>

              <DragOverlay dropAnimation={null}>
                {activeSpec ? (
                  <div className="flex max-w-sm items-center gap-3 rounded-xl border-2 border-primary bg-background px-3 py-2.5 text-sm shadow-xl ring-4 ring-primary/15">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <GripVertical className="h-4 w-4" />
                    </span>
                    <span className="font-medium leading-snug">{activeSpec.name}</span>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>

        <DialogFooter className="shrink-0 flex-col gap-4 border-t border-border/60 bg-gradient-to-t from-muted/50 to-background px-6 py-4 dark:from-muted/30 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-left text-xs leading-relaxed text-muted-foreground sm:max-w-[55%]">
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground">
              ↵
            </span>
            <span>
              <strong className="text-foreground/90">Drag</strong> rows between columns to add or
              remove links. Changes apply after you save.
            </span>
          </p>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={handleClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="min-w-[132px] flex-1 sm:flex-none"
              onClick={handleSave}
              disabled={saving || loading || !isDirty}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save mapping"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
