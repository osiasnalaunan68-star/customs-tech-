import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Archive, Loader2, RefreshCw, Search } from "lucide-react";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

interface HistoricalSADRecord {
  id: string;
  sad_year: number;
  sad_entry_no: string;
  reference_bl: string;
  client_name: string;
  declared_value_php: number;
  total_taxes_paid: number;
  archived_at: string;
}

const phpFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "PHP",
  currencyDisplay: "symbol",
  minimumFractionDigits: 2,
});

function formatPHP(value: number): string {
  // Some environments fall back to the "PHP" code instead of the symbol;
  // this guarantees the ₱ glyph regardless of locale data available.
  return phpFormatter.format(value).replace("PHP", "₱").replace("₱ ", "₱");
}

export default function HistoricalSAD() {
  const [records, setRecords] = useState<HistoricalSADRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function loadRecords() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/historical-sad`);
      if (!res.ok) throw new Error(`Failed to load archive (${res.status})`);
      const data = (await res.json()) as HistoricalSADRecord[];
      setRecords(data);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Something went wrong loading the archive."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
  }, []);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return records;
    return records.filter(
      (r) =>
        r.client_name.toLowerCase().includes(query) ||
        r.reference_bl.toLowerCase().includes(query) ||
        r.sad_entry_no.toLowerCase().includes(query)
    );
  }, [records, search]);

  return (
    <div className="flex min-h-screen flex-col gap-6 p-6 dark:bg-slate-900">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Historical SAD Archive</h1>
        <p className="text-sm text-slate-400">
          Finalized customs declarations and entry worksheets, archived for reference.
        </p>
      </div>

      <Card className="border-slate-800 dark:bg-slate-900">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-slate-100">Entry Worksheets</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search client, B/L, or SAD no..."
              className="border-slate-700 bg-slate-800 pl-8 text-slate-100 placeholder:text-slate-500"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading archive...
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <AlertCircle className="h-6 w-6 text-red-400" />
              <p className="text-sm text-slate-400">{loadError}</p>
              <Button variant="outline" size="sm" onClick={loadRecords} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Archive className="h-8 w-8 text-slate-600" />
              <p className="text-sm text-slate-400">
                No archived declarations yet. Finalized entries will appear here.
              </p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Search className="h-8 w-8 text-slate-600" />
              <p className="text-sm text-slate-400">
                No records match &quot;{search}&quot;. Try a different search term.
              </p>
            </div>
          ) : (
            <>
              <p className="mb-3 text-xs text-slate-500">
                Showing {filteredRecords.length} of {records.length} records
              </p>
              <div className="max-h-[600px] overflow-y-auto overflow-x-auto rounded-md border border-slate-800">
                <Table>
                  <TableHeader className="sticky top-0 z-10 dark:bg-slate-900">
                    <TableRow className="border-slate-800">
                      <TableHead className="text-slate-400">Year</TableHead>
                      <TableHead className="text-slate-400">SAD Entry No.</TableHead>
                      <TableHead className="text-slate-400">Reference B/L</TableHead>
                      <TableHead className="text-slate-400">Client Name</TableHead>
                      <TableHead className="text-right text-slate-400">
                        Declared Valuation
                      </TableHead>
                      <TableHead className="text-right text-slate-400">
                        Total Taxes Paid
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={record.id} className="border-slate-800">
                        <TableCell className="text-slate-300">{record.sad_year}</TableCell>
                        <TableCell className="font-medium text-slate-200">
                          {record.sad_entry_no}
                        </TableCell>
                        <TableCell className="text-slate-300">{record.reference_bl}</TableCell>
                        <TableCell className="text-slate-300">{record.client_name}</TableCell>
                        <TableCell className="text-right text-slate-300">
                          {formatPHP(record.declared_value_php)}
                        </TableCell>
                        <TableCell className="text-right text-slate-300">
                          {formatPHP(record.total_taxes_paid)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
