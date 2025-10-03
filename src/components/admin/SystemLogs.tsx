import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Download, ChevronLeft, ChevronRight } from "lucide-react";
import * as XLSX from 'xlsx';
import { toast } from "sonner";

interface AdminLog {
  id: string;
  action: string;
  created_at: string;
  details: any;
}

interface SystemLogsProps {
  logs: AdminLog[];
  onRefresh: () => void;
}

const PAGE_SIZE = 20;

export const SystemLogs = ({ logs: initialLogs, onRefresh }: SystemLogsProps) => {
  const [logs, setLogs] = useState<AdminLog[]>(initialLogs);
  const [filteredLogs, setFilteredLogs] = useState<AdminLog[]>(initialLogs);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setLogs(initialLogs);
    setFilteredLogs(initialLogs);
  }, [initialLogs]);

  useEffect(() => {
    if (actionFilter === "all") {
      setFilteredLogs(logs);
    } else {
      setFilteredLogs(logs.filter(log => log.action === actionFilter));
    }
    setCurrentPage(1);
  }, [actionFilter, logs]);

  const uniqueActions = Array.from(new Set(logs.map(log => log.action)));

  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + PAGE_SIZE);

  const handleExport = () => {
    try {
      const exportData = filteredLogs.map(log => ({
        'Data': format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        'Ação': log.action,
        'Email': log.details?.email || '-',
        'Detalhes': JSON.stringify(log.details),
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Logs");
      XLSX.writeFile(wb, `logs-sistema-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      
      toast.success('Logs exportados com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar logs');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Histórico de Ações
            </CardTitle>
            <CardDescription>
              {filteredLogs.length} registro(s) encontrado(s)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                {uniqueActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {paginatedLogs.map((log) => (
            <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <p className="font-medium">{log.action}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              {log.details && (
                <Badge variant="outline" className="ml-2">
                  {log.details.email}
                </Badge>
              )}
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};