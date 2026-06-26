import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Plus,
  Loader2,
  Check,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  PackageSearch,
} from "lucide-react";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

type OperationalStatus =
  | "Documents Received"
  | "Entry Lodgement"
  | "Assessment/Payment"
  | "Gatepass Released"
  | "Delivered";

const STATUS_PIPELINE: OperationalStatus[] = [
  "Documents Received",
  "Entry Lodgement",
  "Assessment/Payment",
  "Gatepass Released",
  "Delivered",
];

interface Client {
  id: string;
  company_name: string;
  importer_tin: string;
  cprs_status: "Active" | "Expired" | "Suspended";
  cprs_expiry: string;
  contact_person: string;
  email: string;
  phone: string;
  cprs_expiring_soon: boolean;
}

interface Shipment {
  id: string;
  client_id: string;
  bl_awb_no: string;
  registry_no: string;
  carrier: string;
  container_no: string;
  port_of_entry: string;
  eta: string;
  operational_status: OperationalStatus;
  created_at: string;
}

interface ShipmentFormState {
  client_id: string;
  bl_awb_no: string;
  registry_no: string;
  carrier: string;
  container_no: string;
  port_of_entry: string;
  eta: string;
}

const EMPTY_FORM: ShipmentFormState = {
  client_id: "",
  bl_awb_no: "",
  registry_no: "",
  carrier: "",
  container_no: "",
  port_of_entry: "",
  eta: "",
};

function getNextStatus(current: OperationalStatus): OperationalStatus | null {
  const idx = STATUS_PIPELINE.indexOf(current);
  if (idx === -1 || idx === STATUS_PIPELINE.length - 1) return null;
  return STATUS_PIPELINE[idx + 1];
}

function ShipmentProgressTracker({ status }: { status: OperationalStatus }) {
  const currentIndex = STATUS_PIPELINE.indexOf(status);

  return (
    <div className="flex w-full min-w-[260px] flex-col gap-1.5">
      <div className="flex items-center">
        {STATUS_PIPELINE.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <div key={step} className="flex flex-1 items-center last:flex-none">
              <div
                title={step}
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-semibold transition-colors",
                  isCompleted && "border-emerald-500 bg-emerald-500 text-white",
                  isCurrent && "border-blue-500 bg-blue-500/20 text-blue-400",
                  !isCompleted && !isCurrent && "border-slate-700 bg-slate-800 text-slate-500"
                )}
              >
                {isCompleted ? <Check className="h-3 w-3" /> : index + 1}
              </div>
              {index < STATUS_PIPELINE.length - 1 && (
                <div
                  className={cn(
                    "mx-1 h-0.5 flex-1",
                    index < currentIndex ? "bg-emerald-500" : "bg-slate-700"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      <span className="text-xs font-medium text-slate-300">{status}</span>
    </div>
  );
}

export default function Shipments() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<ShipmentFormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function fetchShipments(): Promise<Shipment[]> {
    const res = await fetch(`${API_BASE_URL}/api/shipments`);
    if (!res.ok) throw new Error(`Failed to load shipments (${res.status})`);
    return (await res.json()) as Shipment[];
  }

  async function fetchClients(): Promise<Client[]> {
    const res = await fetch(`${API_BASE_URL}/api/clients`);
    if (!res.ok) throw new Error(`Failed to load clients (${res.status})`);
    return (await res.json()) as Client[];
  }

  async function loadAll() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [shipmentData, clientData] = await Promise.all([
        fetchShipments(),
        fetchClients(),
      ]);
      setShipments(shipmentData);
      setClients(clientData);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Something went wrong loading shipments."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach((c) => map.set(c.id, c.company_name));
    return map;
  }, [clients]);

  const statusCounts = useMemo(() => {
    const counts = new Map<OperationalStatus, number>();
    STATUS_PIPELINE.forEach((s) => counts.set(s, 0));
    shipments.forEach((s) => {
      counts.set(s.operational_status, (counts.get(s.operational_status) ?? 0) + 1);
    });
    return counts;
  }, [shipments]);

  function updateForm<K extends keyof ShipmentFormState>(
    key: K,
    value: ShipmentFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  async function handleCreateShipment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    if (!form.client_id) {
      setFormError("Please select a consignee.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shipments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        throw new Error(`Failed to create shipment (${res.status})`);
      }
      await loadAll();
      resetForm();
      setIsDialogOpen(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Could not create the shipment. Try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAdvanceStatus(shipment: Shipment) {
    const next = getNextStatus(shipment.operational_status);
    if (!next) return;

    setActionError(null);
    setAdvancingId(shipment.id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shipments/${shipment.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operational_status: next }),
      });
      if (!res.ok) {
        throw new Error(`Failed to advance status (${res.status})`);
      }
      const updated = (await res.json()) as Shipment;
      setShipments((prev) =>
        prev.map((s) => (s.id === shipment.id ? updated : s))
      );
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not advance this shipment's status."
      );
    } finally {
      setAdvancingId(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col gap-6 p-6 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Shipment Tracker</h1>
          <p className="text-sm text-slate-400">
            Monitor active importations through every clearance milestone.
          </p>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add New Shipment
            </Button>
          </DialogTrigger>
          <DialogContent className="border-slate-800 dark:bg-slate-900 sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-slate-100">Add New Shipment</DialogTitle>
              <DialogDescription className="text-slate-400">
                Register a new importation to start tracking it through the pipeline.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateShipment} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="client_id" className="text-slate-300">
                  Consignee
                </Label>
                <select
                  id="client_id"
                  required
                  value={form.client_id}
                  onChange={(e) => updateForm("client_id", e.target.value)}
                  className="flex h-9 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>
                    Select a client...
                  </option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bl_awb_no" className="text-slate-300">
                    B/L or AWB No.
                  </Label>
                  <Input
                    id="bl_awb_no"
                    required
                    value={form.bl_awb_no}
                    onChange={(e) => updateForm("bl_awb_no", e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="registry_no" className="text-slate-300">
                    Registry No.
                  </Label>
                  <Input
                    id="registry_no"
                    required
                    value={form.registry_no}
                    onChange={(e) => updateForm("registry_no", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="carrier" className="text-slate-300">
                    Carrier
                  </Label>
                  <Input
                    id="carrier"
                    required
                    value={form.carrier}
                    onChange={(e) => updateForm("carrier", e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="container_no" className="text-slate-300">
                    Container No.
                  </Label>
                  <Input
                    id="container_no"
                    value={form.container_no}
                    onChange={(e) => updateForm("container_no", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="port_of_entry" className="text-slate-300">
                    Port of Entry
                  </Label>
                  <Input
                    id="port_of_entry"
                    required
                    value={form.port_of_entry}
                    onChange={(e) => updateForm("port_of_entry", e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="eta" className="text-slate-300">
                    ETA
                  </Label>
                  <Input
                    id="eta"
                    type="date"
                    required
                    value={form.eta}
                    onChange={(e) => updateForm("eta", e.target.value)}
                  />
                </div>
              </div>

              {formError && (
                <div className="flex items-center gap-2 rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}

              <DialogFooter>
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSubmitting ? "Saving..." : "Save Shipment"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_PIPELINE.map((step) => (
          <Badge
            key={step}
            variant="outline"
            className="border-slate-700 bg-slate-800/60 text-slate-300"
          >
            {step}: {statusCounts.get(step) ?? 0}
          </Badge>
        ))}
      </div>

      {actionError && (
        <div className="flex items-center gap-2 rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {actionError}
        </div>
      )}

      <Card className="border-slate-800 dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-slate-100">Active Shipments</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading shipments...
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <AlertCircle className="h-6 w-6 text-red-400" />
              <p className="text-sm text-slate-400">{loadError}</p>
              <Button variant="outline" size="sm" onClick={loadAll} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          ) : shipments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <PackageSearch className="h-8 w-8 text-slate-600" />
              <p className="text-sm text-slate-400">
                No shipments yet. Add your first shipment to start tracking it.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Consignee</TableHead>
                    <TableHead className="text-slate-400">B/L or AWB No.</TableHead>
                    <TableHead className="text-slate-400">Carrier</TableHead>
                    <TableHead className="text-slate-400">Container No.</TableHead>
                    <TableHead className="text-slate-400">Port of Entry</TableHead>
                    <TableHead className="text-slate-400">ETA</TableHead>
                    <TableHead className="text-slate-400">Pipeline Status</TableHead>
                    <TableHead className="text-right text-slate-400">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments.map((shipment) => {
                    const next = getNextStatus(shipment.operational_status);
                    return (
                      <TableRow key={shipment.id} className="border-slate-800">
                        <TableCell className="font-medium text-slate-200">
                          {clientNameById.get(shipment.client_id) ?? "Unknown client"}
                        </TableCell>
                        <TableCell className="text-slate-300">{shipment.bl_awb_no}</TableCell>
                        <TableCell className="text-slate-300">{shipment.carrier}</TableCell>
                        <TableCell className="text-slate-300">{shipment.container_no}</TableCell>
                        <TableCell className="text-slate-300">{shipment.port_of_entry}</TableCell>
                        <TableCell className="text-slate-300">
                          {new Date(shipment.eta).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <ShipmentProgressTracker status={shipment.operational_status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!next || advancingId === shipment.id}
                            onClick={() => handleAdvanceStatus(shipment)}
                            className="gap-1.5 border-slate-700"
                          >
                            {advancingId === shipment.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                            {next ? `Advance to ${next}` : "Delivered"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
