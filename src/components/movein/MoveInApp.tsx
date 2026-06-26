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

import { Button } from "@/components/ui/button";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import {
  PRIO_RANK,
  PRIO_STYLES,
  PRIORITIES,
  STATUS_META,
  STATUSES,
  WHO,
  WHO_STYLES,
  api,
  isHandled,
  isOwned,
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
  status: "need",
};

function ItemDialog({
  open,
  onOpenChange,
  editing,
  rooms,
  defaultRoom,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Item | null;
  rooms: string[];
  defaultRoom: string;
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
              status: editing.status,
            }
          : { ...emptyDraft, room: defaultRoom },
      );
    }
  }, [open, editing, defaultRoom]);

  const set = <K extends keyof Draft>(k: K, val: Draft[K]) =>
    setDraft((d) => ({ ...d, [k]: val }));

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
    } catch {
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
          <div className="grid gap-1.5">
            <Label>Status</Label>
            <Select
              value={draft.status}
              onValueChange={(v) => set("status", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                      {p}
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
            <Button variant="ghost" className="text-destructive" onClick={del}>
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
  const need = items.filter((i) => i.status === "need");
  const bought = items.filter((i) => i.status === "bought"); // purchased
  const owned = items.filter((i) => isOwned(i.status)); // already owned
  const acquired = bought.length + owned.length;
  const pct = total ? Math.round((acquired / total) * 100) : 0;
  const stillToBuy = need.reduce((s, i) => s + i.cost, 0);
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-xl border bg-card px-5 py-4 shadow-sm">
      <Stat
        label="To buy"
        value={String(need.length)}
        sub={`$${stillToBuy.toLocaleString()} est.`}
      />
      <Divider />
      <Stat label="Purchased" value={String(bought.length)} />
      <Divider />
      <Stat label="Already owned" value={String(owned.length)} />
      <div className="ml-auto w-full max-w-[220px]">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Move-in ready
          </span>
          <span className="text-sm font-semibold tabular-nums">{pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        {sub ? (
          <span className="text-sm text-muted-foreground">{sub}</span>
        ) : null}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="hidden h-9 w-px bg-border sm:block" />;
}

/* group an array of table rows by section, preserving first-appearance order */
function bySection<T extends { original: Item }>(rows: T[]) {
  const order: string[] = [];
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const s = r.original.section || "";
    if (!map.has(s)) {
      map.set(s, []);
      order.push(s);
    }
    map.get(s)!.push(r);
  }
  return order.map((section) => ({ section, rows: map.get(section)! }));
}

/* ------------------------------------------------------------------ */
/* Board (the data table)                                              */
/* ------------------------------------------------------------------ */
function Board() {
  const items = useQuery(api.list) as Item[] | undefined;
  const setStatus = useMutation(api.setStatus);
  const update = useMutation(api.update);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [activeRoom, setActiveRoom] = React.useState("all");
  const [hideDone, setHideDone] = React.useState(false);
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
  const roomCounts = React.useMemo(() => {
    const m: Record<string, number> = {};
    data.forEach((i) => (m[i.room] = (m[i.room] || 0) + 1));
    return m;
  }, [data]);

  const tableData = React.useMemo(() => {
    let d =
      activeRoom === "all" ? data : data.filter((i) => i.room === activeRoom);
    if (hideDone) d = d.filter((i) => !isHandled(i.status));
    return d;
  }, [data, activeRoom, hideDone]);

  const columns = React.useMemo<ColumnDef<Item>[]>(
    () => [
      {
        accessorKey: "status",
        header: ({ column }) => <SortBtn column={column} label="Status" />,
        size: 150,
        filterFn: (row, _id, value) =>
          value === "owned"
            ? isOwned(row.original.status)
            : row.original.status === value,
        cell: ({ row }) => {
          const st = row.original.status;
          return (
            <Select
              value={st}
              onValueChange={(v) =>
                setStatus({ id: row.original._id, status: v }).catch(() =>
                  toast.error("Sync error."),
                )
              }
            >
              <SelectTrigger
                className={cn(
                  "h-7 w-[150px] border px-2 text-xs font-medium",
                  STATUS_META[st]?.style,
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
      },
      {
        accessorKey: "name",
        header: ({ column }) => <SortBtn column={column} label="Item" />,
        cell: ({ row }) => {
          const st = row.original.status;
          return (
            <div className="min-w-[180px]">
              <div
                className={cn(
                  "font-medium",
                  st === "bought" && "text-muted-foreground line-through",
                  isOwned(st) && "text-muted-foreground",
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
          );
        },
      },
      {
        accessorKey: "whoBuys",
        header: ({ column }) => <SortBtn column={column} label="Who buys" />,
        filterFn: "equalsString",
        cell: ({ row }) => {
          const owned = isOwned(row.original.status);
          return (
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
                  owned
                    ? "border-dashed text-muted-foreground opacity-50"
                    : WHO_STYLES[row.original.whoBuys],
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
          );
        },
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
                  {p}
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
          <div
            className={cn(
              "text-right tabular-nums text-muted-foreground",
              isOwned(row.original.status) && "line-through opacity-50",
            )}
          >
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
    [setStatus, update],
  );

  const table = useReactTable({
    data: tableData,
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
  const grouped = activeRoom === "all";

  // group rows by room (only used in the "All" tab)
  const roomGroups: { room: string; rows: typeof rows }[] = [];
  if (grouped) {
    const idx = new Map<string, number>();
    for (const r of rows) {
      const room = r.original.room;
      if (!idx.has(room)) {
        idx.set(room, roomGroups.length);
        roomGroups.push({ room, rows: [] as unknown as typeof rows });
      }
      roomGroups[idx.get(room)!].rows.push(r);
    }
  }

  const toggleRoom = (room: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(room)) next.delete(room);
      else next.add(room);
      return next;
    });

  if (items === undefined) {
    return (
      <div className="py-24 text-center text-muted-foreground">
        Loading your checklist…
      </div>
    );
  }

  const renderItemRow = (r: (typeof rows)[number]) => (
    <TableRow
      key={r.id}
      className={cn(r.original.status === "bought" && "opacity-60")}
    >
      {r.getVisibleCells().map((c) => (
        <TableCell key={c.id} className="py-2 align-top">
          {flexRender(c.column.columnDef.cell, c.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );

  const renderSections = (sectionRows: typeof rows) =>
    bySection(sectionRows).map((sec) => (
      <React.Fragment key={sec.section || "_"}>
        {sec.section ? (
          <TableRow className="hover:bg-transparent">
            <TableCell
              colSpan={colCount}
              className="bg-muted/40 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {sec.section}
            </TableCell>
          </TableRow>
        ) : null}
        {sec.rows.map(renderItemRow)}
      </React.Fragment>
    ));

  return (
    <div className="space-y-4">
      <Summary items={items} />

      {/* room tabs */}
      <Tabs value={activeRoom} onValueChange={setActiveRoom}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
          <TabsTrigger value="all" className="text-xs">
            All rooms{" "}
            <span className="ml-1 text-muted-foreground">({data.length})</span>
          </TabsTrigger>
          {rooms.map((r) => (
            <TabsTrigger key={r} value={r} className="text-xs">
              {r}{" "}
              <span className="ml-1 text-muted-foreground">
                ({roomCounts[r]})
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search items…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="h-9 w-full max-w-xs"
        />
        <Select
          value={currentFilter("status")}
          onValueChange={(v) => setColFilter("status", v)}
        >
          <SelectTrigger size="sm" className="h-9 w-[150px]">
            <SelectValue placeholder="Any status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            <SelectItem value="need">Need to buy</SelectItem>
            <SelectItem value="bought">Bought</SelectItem>
            <SelectItem value="owned">Already owned</SelectItem>
            <SelectItem value="own-tristen">Tristen owns</SelectItem>
            <SelectItem value="own-jakob">Jakob owns</SelectItem>
            <SelectItem value="own-both">Both own</SelectItem>
          </SelectContent>
        </Select>
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
          variant={hideDone ? "default" : "outline"}
          size="sm"
          className="h-9"
          onClick={() => setHideDone((v) => !v)}
        >
          Hide sorted
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
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
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
            ) : grouped ? (
              roomGroups.map((g) => {
                const isOpen = !collapsed.has(g.room);
                const left = g.rows
                  .filter((r) => r.original.status === "need")
                  .reduce((s, r) => s + r.original.cost, 0);
                const doneN = g.rows.filter((r) =>
                  isHandled(r.original.status),
                ).length;
                return (
                  <React.Fragment key={g.room}>
                    <TableRow
                      className="cursor-pointer border-t bg-secondary/50 hover:bg-secondary"
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
                              {doneN}/{g.rows.length} sorted
                            </span>
                            <span>${left.toLocaleString()} to buy</span>
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isOpen && renderSections(g.rows)}
                  </React.Fragment>
                );
              })
            ) : (
              renderSections(rows)
            )}
          </TableBody>
        </Table>
      </div>

      <ItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        rooms={rooms}
        defaultRoom={activeRoom === "all" ? "" : activeRoom}
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
