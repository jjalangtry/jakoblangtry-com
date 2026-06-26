import * as React from "react";
import {
  ConvexProvider,
  ConvexReactClient,
  useMutation,
  useQuery,
} from "convex/react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import {
  PRIO_DOT,
  PRIO_RANK,
  PRIO_STYLES,
  PRIORITIES,
  WHO,
  WHO_STYLES,
  api,
  money,
  type Item,
} from "@/components/movein/types";

/* ------------------------------------------------------------------ */
/* Edit / Add dialog                                                   */
/* ------------------------------------------------------------------ */
type Draft = Omit<Item, "_id" | "_creationTime" | "order" | "got">;
const emptyDraft: Draft = {
  name: "",
  room: "",
  section: "",
  whoBuys: "Shared",
  cost: 0,
  priority: "Week 1",
  notes: "",
};

function ItemDialog({
  open,
  onOpenChange,
  editing,
  rooms,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Item | null;
  rooms: string[];
}) {
  const add = useMutation(api.add);
  const update = useMutation(api.update);
  const remove = useMutation(api.remove);
  const [draft, setDraft] = React.useState<Draft>(emptyDraft);

  React.useEffect(() => {
    if (open) {
      setDraft(
        editing
          ? {
              name: editing.name,
              room: editing.room,
              section: editing.section,
              whoBuys: editing.whoBuys,
              cost: editing.cost,
              priority: editing.priority,
              notes: editing.notes,
            }
          : emptyDraft,
      );
    }
  }, [open, editing]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  async function save() {
    if (!draft.name.trim()) {
      toast.error("Give the item a name first.");
      return;
    }
    const payload = {
      ...draft,
      name: draft.name.trim(),
      room: draft.room.trim() || "Misc",
      section: draft.section.trim(),
      cost: Math.max(0, Number(draft.cost) || 0),
      notes: draft.notes.trim(),
    };
    try {
      if (editing) await update({ id: editing._id, ...payload });
      else await add(payload);
      onOpenChange(false);
      toast.success(editing ? "Saved" : "Added");
    } catch (e) {
      toast.error("Could not save — check your connection.");
    }
  }

  async function del() {
    if (!editing) return;
    try {
      await remove({ id: editing._id });
      onOpenChange(false);
      toast.success("Deleted");
    } catch {
      toast.error("Could not delete.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit item" : "Add item"}</DialogTitle>
          <DialogDescription>
            Changes sync live to everyone with the link.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Item</Label>
            <Input
              id="name"
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Shower curtain"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="room">Room</Label>
              <Input
                id="room"
                list="movein-rooms"
                value={draft.room}
                onChange={(e) => set("room", e.target.value)}
                placeholder="Room"
              />
              <datalist id="movein-rooms">
                {rooms.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="section">Section</Label>
              <Input
                id="section"
                value={draft.section}
                onChange={(e) => set("section", e.target.value)}
                placeholder="e.g. Furniture"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Who buys</Label>
              <Select
                value={draft.whoBuys}
                onValueChange={(v) => set("whoBuys", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WHO.map((w) => (
                    <SelectItem key={w} value={w}>
                      {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Priority</Label>
              <Select
                value={draft.priority}
                onValueChange={(v) => set("priority", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIO_DOT[p]} {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cost">Estimated cost ($)</Label>
            <Input
              id="cost"
              type="number"
              min={0}
              value={draft.cost}
              onChange={(e) => set("cost", Number(e.target.value))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={draft.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {editing ? (
            <Button variant="ghost" className="text-red-400" onClick={del}>
              <Trash2 className="size-4" /> Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save}>{editing ? "Save" : "Add"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Summary cards                                                       */
/* ------------------------------------------------------------------ */
function Summary({ items }: { items: Item[] }) {
  const total = items.length;
  const got = items.filter((i) => i.got).length;
  const pct = total ? Math.round((got / total) * 100) : 0;
  const grand = items.reduce((s, i) => s + i.cost, 0);
  const spent = items.filter((i) => i.got).reduce((s, i) => s + i.cost, 0);
  const remaining = grand - spent;
  const split: Record<string, number> = {};
  items
    .filter((i) => !i.got)
    .forEach((i) => (split[i.whoBuys] = (split[i.whoBuys] || 0) + i.cost));

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="rounded-xl border bg-card p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Progress
        </div>
        <div className="mt-1 text-2xl font-bold">{pct}%</div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          {got} of {total} items
        </div>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Still to buy
        </div>
        <div className="mt-1 text-2xl font-bold">
          ${remaining.toLocaleString()}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          of ${grand.toLocaleString()} total est.
        </div>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Already got
        </div>
        <div className="mt-1 text-2xl font-bold">${spent.toLocaleString()}</div>
        <div className="mt-2 text-xs text-muted-foreground">checked off</div>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Cost split (remaining)
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {WHO.filter((w) => split[w]).map((w) => (
            <Badge
              key={w}
              variant="outline"
              className={cn("font-medium", WHO_STYLES[w])}
            >
              {w}: ${split[w].toLocaleString()}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Board (the data table)                                              */
/* ------------------------------------------------------------------ */
function Board() {
  const items = useQuery(api.list) as Item[] | undefined;
  const toggleGot = useMutation(api.toggleGot);
  const update = useMutation(api.update);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [groupByRoom, setGroupByRoom] = React.useState(true);
  const [hideGot, setHideGot] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Item | null>(null);

  const data = React.useMemo(
    () => (items ? [...items].sort((a, b) => a.order - b.order) : []),
    [items],
  );
  const rooms = React.useMemo(
    () => [...new Set(data.map((i) => i.room))],
    [data],
  );

  const safe = (fn: () => Promise<unknown>) => () =>
    fn().catch(() => toast.error("Sync error — change may not have saved."));

  const columns = React.useMemo<ColumnDef<Item>[]>(
    () => [
      {
        id: "got",
        accessorKey: "got",
        header: "✓",
        size: 36,
        enableSorting: true,
        filterFn: (row, _id, value) =>
          value === "hide" ? !row.original.got : true,
        cell: ({ row }) => (
          <Checkbox
            checked={row.original.got}
            onCheckedChange={safe(() => toggleGot({ id: row.original._id }))}
            aria-label="Got it"
          />
        ),
      },
      {
        accessorKey: "name",
        header: ({ column }) => <SortBtn column={column} label="Item" />,
        cell: ({ row }) => (
          <div className="min-w-[160px]">
            <div
              className={cn(
                "font-medium",
                row.original.got && "text-muted-foreground line-through",
              )}
            >
              {row.original.name}
            </div>
            {row.original.notes ? (
              <div className="text-xs text-muted-foreground">
                {row.original.notes}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "whoBuys",
        header: ({ column }) => <SortBtn column={column} label="Who" />,
        filterFn: "equalsString",
        cell: ({ row }) => (
          <Select
            value={row.original.whoBuys}
            onValueChange={(v) =>
              update({ id: row.original._id, whoBuys: v }).catch(() =>
                toast.error("Sync error."),
              )
            }
          >
            <SelectTrigger
              className={cn(
                "h-7 w-[104px] border px-2 text-xs font-medium",
                WHO_STYLES[row.original.whoBuys],
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WHO.map((w) => (
                <SelectItem key={w} value={w}>
                  {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
      {
        accessorKey: "priority",
        header: ({ column }) => <SortBtn column={column} label="Priority" />,
        filterFn: "equalsString",
        sortingFn: (a, b) =>
          (PRIO_RANK[a.original.priority] ?? 9) -
          (PRIO_RANK[b.original.priority] ?? 9),
        cell: ({ row }) => (
          <Select
            value={row.original.priority}
            onValueChange={(v) =>
              update({ id: row.original._id, priority: v }).catch(() =>
                toast.error("Sync error."),
              )
            }
          >
            <SelectTrigger
              className={cn(
                "h-7 w-[108px] border px-2 text-xs font-medium",
                PRIO_STYLES[row.original.priority],
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {PRIO_DOT[p]} {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
      {
        accessorKey: "cost",
        header: ({ column }) => (
          <SortBtn column={column} label="Cost" className="justify-end" />
        ),
        cell: ({ row }) => (
          <div className="text-right tabular-nums text-muted-foreground">
            {money(row.original.cost)}
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        size: 40,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            onClick={() => {
              setEditing(row.original);
              setDialogOpen(true);
            }}
          >
            <Pencil className="size-3.5" />
          </Button>
        ),
      },
    ],
    [toggleGot, update],
  );

  // keep the hideGot toggle wired into the got column filter
  React.useEffect(() => {
    setColumnFilters((prev) => {
      const without = prev.filter((f) => f.id !== "got");
      return hideGot ? [...without, { id: "got", value: "hide" }] : without;
    });
  }, [hideGot]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _id, filter) => {
      const q = String(filter).toLowerCase();
      const it = row.original;
      return (
        it.name.toLowerCase().includes(q) ||
        it.notes.toLowerCase().includes(q) ||
        it.room.toLowerCase().includes(q)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const setColFilter = (id: string, value: string) =>
    table.getColumn(id)?.setFilterValue(value === "all" ? undefined : value);
  const currentFilter = (id: string) =>
    (table.getColumn(id)?.getFilterValue() as string) ?? "all";

  const rows = table.getRowModel().rows;
  const colCount = columns.length;

  // group rows by room (preserving first-appearance order)
  const groups: { room: string; rows: typeof rows }[] = [];
  if (groupByRoom) {
    const idx = new Map<string, number>();
    for (const r of rows) {
      const room = r.original.room;
      if (!idx.has(room)) {
        idx.set(room, groups.length);
        groups.push({ room, rows: [] as unknown as typeof rows });
      }
      groups[idx.get(room)!].rows.push(r);
    }
  }

  const toggleRoom = (room: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(room) ? next.delete(room) : next.add(room);
      return next;
    });

  if (items === undefined) {
    return (
      <div className="py-24 text-center text-muted-foreground">
        Loading your checklist…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Summary items={items} />

      {/* controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search items…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="h-9 w-full max-w-xs"
        />
        <FilterSelect
          label="Everyone"
          value={currentFilter("whoBuys")}
          onValueChange={(v) => setColFilter("whoBuys", v)}
          options={WHO as unknown as string[]}
        />
        <FilterSelect
          label="All priorities"
          value={currentFilter("priority")}
          onValueChange={(v) => setColFilter("priority", v)}
          options={PRIORITIES as unknown as string[]}
        />
        <Button
          variant={hideGot ? "default" : "outline"}
          size="sm"
          className="h-9"
          onClick={() => setHideGot((v) => !v)}
        >
          Hide got
        </Button>
        <Button
          variant={groupByRoom ? "default" : "outline"}
          size="sm"
          className="h-9"
          onClick={() => setGroupByRoom((v) => !v)}
        >
          Group by room
        </Button>
        <Button
          size="sm"
          className="ml-auto h-9"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> Add item
        </Button>
      </div>

      {/* table */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className="h-10">
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colCount}
                  className="h-24 text-center text-muted-foreground"
                >
                  No items match your filters.
                </TableCell>
              </TableRow>
            ) : groupByRoom ? (
              groups.map((g) => {
                const isOpen = !collapsed.has(g.room);
                const left = g.rows
                  .filter((r) => !r.original.got)
                  .reduce((s, r) => s + r.original.cost, 0);
                const gotN = g.rows.filter((r) => r.original.got).length;
                return (
                  <React.Fragment key={g.room}>
                    <TableRow
                      className="cursor-pointer border-t bg-secondary/40 hover:bg-secondary/60"
                      onClick={() => toggleRoom(g.room)}
                    >
                      <TableCell colSpan={colCount} className="py-2">
                        <div className="flex items-center gap-2 font-semibold">
                          {isOpen ? (
                            <ChevronDown className="size-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="size-4 text-muted-foreground" />
                          )}
                          {g.room}
                          <span className="ml-auto flex gap-3 text-xs font-normal text-muted-foreground">
                            <span>
                              {gotN}/{g.rows.length} ✓
                            </span>
                            <span>${left.toLocaleString()} left</span>
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isOpen &&
                      g.rows.map((r) => (
                        <TableRow
                          key={r.id}
                          className={cn(r.original.got && "opacity-55")}
                        >
                          {r.getVisibleCells().map((c) => (
                            <TableCell key={c.id} className="py-2 align-top">
                              {flexRender(
                                c.column.columnDef.cell,
                                c.getContext(),
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                  </React.Fragment>
                );
              })
            ) : (
              rows.map((r) => (
                <TableRow
                  key={r.id}
                  className={cn(r.original.got && "opacity-55")}
                >
                  {r.getVisibleCells().map((c) => (
                    <TableCell key={c.id} className="py-2 align-top">
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        rooms={rooms}
      />
      <Toaster position="bottom-center" />
    </div>
  );
}

function SortBtn({
  column,
  label,
  className,
}: {
  column: any;
  label: string;
  className?: string;
}) {
  return (
    <button
      className={cn(
        "flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground",
        className,
      )}
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {label}
      <ArrowUpDown className="size-3" />
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: string[];
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger size="sm" className="h-9 w-[140px]">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{label}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ------------------------------------------------------------------ */
/* Root island                                                         */
/* ------------------------------------------------------------------ */
export default function MoveInApp({ convexUrl }: { convexUrl: string }) {
  const client = React.useMemo(
    () => new ConvexReactClient(convexUrl),
    [convexUrl],
  );
  return (
    <ConvexProvider client={client}>
      <Board />
    </ConvexProvider>
  );
}
