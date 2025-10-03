import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Search, Upload, AlertCircle, X, FileDown, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { format, subDays, subMonths, startOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Solicitacao {
  id: number;
  objeto: string;
  status: string;
  data_solicitacao: string;
  organizacao_id: number;
  classificacao_urgencia: string | null;
  organizacoes?: {
    'Organização Militar': string;
    'Órgão Setorial Responsável': string;
  };
}

const Solicitacoes = () => {
  const [user, setUser] = useState<User | null>(null);
  const { isAdmin } = useUserRole(user);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [filteredSolicitacoes, setFilteredSolicitacoes] = useState<Solicitacao[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [urgenciaFilter, setUrgenciaFilter] = useState("all");
  const [periodoFilter, setPeriodoFilter] = useState("all");
  const [sortBy, setSortBy] = useState("data-desc");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  useEffect(() => {
    fetchSolicitacoes();
  }, []);

  useEffect(() => {
    let filtered = [...solicitacoes];

    // Filtro de busca por texto
    if (searchTerm) {
      filtered = filtered.filter(
        (s) =>
          s.objeto.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.organizacoes?.['Organização Militar']?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro de status
    if (statusFilter !== "all") {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    // Filtro de urgência
    if (urgenciaFilter !== "all") {
      filtered = filtered.filter((s) => s.classificacao_urgencia === urgenciaFilter);
    }

    // Filtro de período
    if (periodoFilter !== "all") {
      const now = new Date();
      let cutoffDate: Date;

      switch (periodoFilter) {
        case "7days":
          cutoffDate = subDays(now, 7);
          break;
        case "30days":
          cutoffDate = subDays(now, 30);
          break;
        case "3months":
          cutoffDate = subMonths(now, 3);
          break;
        case "year":
          cutoffDate = startOfYear(now);
          break;
        default:
          cutoffDate = new Date(0);
      }

      filtered = filtered.filter((s) => new Date(s.data_solicitacao) >= cutoffDate);
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "data-desc":
          return new Date(b.data_solicitacao).getTime() - new Date(a.data_solicitacao).getTime();
        case "data-asc":
          return new Date(a.data_solicitacao).getTime() - new Date(b.data_solicitacao).getTime();
        case "objeto-az":
          return a.objeto.localeCompare(b.objeto);
        case "objeto-za":
          return b.objeto.localeCompare(a.objeto);
        case "status":
          return a.status.localeCompare(b.status);
        case "urgencia":
          const urgenciaOrder = { "Prioritário": 0, "Não Prioritário": 1 };
          const aUrgencia = urgenciaOrder[a.classificacao_urgencia as keyof typeof urgenciaOrder] ?? 2;
          const bUrgencia = urgenciaOrder[b.classificacao_urgencia as keyof typeof urgenciaOrder] ?? 2;
          return aUrgencia - bUrgencia;
        default:
          return 0;
      }
    });

    setFilteredSolicitacoes(filtered);
  }, [searchTerm, statusFilter, urgenciaFilter, periodoFilter, sortBy, solicitacoes]);

  const fetchSolicitacoes = async () => {
    try {
      const { data, error } = await supabase
        .from("solicitacoes")
        .select(`
          *,
          organizacoes ("Organização Militar", "Órgão Setorial Responsável")
        `)
        .order("data_solicitacao", { ascending: false });

      if (error) throw error;
      
      // Mapear os dados para a interface esperada
      const mappedData = (data || []).map((sol: any) => ({
        ...sol,
        organizacoes: sol.organizacoes ? {
          'Organização Militar': sol.organizacoes["Organização Militar"],
          'Órgão Setorial Responsável': sol.organizacoes["Órgão Setorial Responsável"],
        } : undefined,
      }));
      
      setSolicitacoes(mappedData);
      setFilteredSolicitacoes(mappedData);
    } catch (error: any) {
      toast.error("Erro ao carregar solicitações");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      pending: { label: "Pendente", className: "bg-accent/20 text-accent hover:bg-accent/30" },
      in_progress: { label: "Em Andamento", className: "bg-primary/20 text-primary hover:bg-primary/30" },
      completed: { label: "Concluída", className: "bg-secondary/20 text-secondary hover:bg-secondary/30" },
    };

    const variant = variants[status] || variants.pending;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const getUrgenciaBadge = (urgencia: string | null) => {
    if (!urgencia) return null;
    
    if (urgencia === "Prioritário") {
      return (
        <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30 gap-1">
          <AlertCircle className="w-3 h-3" />
          Prioritário
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="border-muted-foreground/30">
        Não Prioritário
      </Badge>
    );
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setUrgenciaFilter("all");
    setPeriodoFilter("all");
    setSortBy("data-desc");
  };

  const activeFiltersCount = [
    searchTerm !== "",
    statusFilter !== "all",
    urgenciaFilter !== "all",
    periodoFilter !== "all",
    sortBy !== "data-desc",
  ].filter(Boolean).length;

  const handleExportExcel = () => {
    exportToExcel(filteredSolicitacoes, 'vistorias');
    toast.success('Arquivo Excel gerado com sucesso!');
  };

  const handleExportPDF = () => {
    exportToPDF(filteredSolicitacoes, 'vistorias');
    toast.success('Arquivo PDF gerado com sucesso!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Solicitações</h2>
          <p className="text-muted-foreground">
            Gerencie todas as solicitações de inspeção
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExcel} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Baixar Excel
          </Button>
          <Button variant="outline" onClick={handleExportPDF} className="gap-2">
            <FileDown className="h-4 w-4" />
            Baixar PDF
          </Button>
          {isAdmin && (
            <Button
              onClick={() => navigate("/importar-vistorias")}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Importar Vistorias
            </Button>
          )}
        </div>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Filtros</CardTitle>
            {activeFiltersCount > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {activeFiltersCount} filtro{activeFiltersCount > 1 ? "s" : ""} ativo{activeFiltersCount > 1 ? "s" : ""}
              </p>
            )}
          </div>
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-2">
              <X className="h-4 w-4" />
              Limpar Tudo
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por objeto ou organização..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="completed">Concluída</SelectItem>
              </SelectContent>
            </Select>

            <Select value={urgenciaFilter} onValueChange={setUrgenciaFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Urgência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Urgências</SelectItem>
                <SelectItem value="Prioritário">Prioritário</SelectItem>
                <SelectItem value="Não Prioritário">Não Prioritário</SelectItem>
              </SelectContent>
            </Select>

            <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o Período</SelectItem>
                <SelectItem value="7days">Últimos 7 dias</SelectItem>
                <SelectItem value="30days">Últimos 30 dias</SelectItem>
                <SelectItem value="3months">Últimos 3 meses</SelectItem>
                <SelectItem value="year">Este ano</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="data-desc">Data (mais recente)</SelectItem>
                <SelectItem value="data-asc">Data (mais antiga)</SelectItem>
                <SelectItem value="objeto-az">Objeto (A-Z)</SelectItem>
                <SelectItem value="objeto-za">Objeto (Z-A)</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="urgencia">Urgência</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            Mostrando <span className="font-semibold text-foreground">{filteredSolicitacoes.length}</span> de{" "}
            <span className="font-semibold text-foreground">{solicitacoes.length}</span> solicitações
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredSolicitacoes.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Nenhuma solicitação encontrada
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredSolicitacoes.map((solicitacao) => (
            <Card
              key={solicitacao.id}
              className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold">{solicitacao.objeto}</h3>
                      {getStatusBadge(solicitacao.status)}
                      {getUrgenciaBadge(solicitacao.classificacao_urgencia)}
                    </div>
                    {solicitacao.organizacoes && (
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium">{solicitacao.organizacoes['Organização Militar']}</p>
                        <p>{solicitacao.organizacoes['Órgão Setorial Responsável']}</p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Criada em{" "}
                      {format(new Date(solicitacao.data_solicitacao), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate(`/solicitacao/${solicitacao.id}`)}
                    size="sm"
                    className="gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Ver Detalhes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Solicitacoes;
