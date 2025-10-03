import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { FileText, CheckCircle2, Clock, Paperclip, CalendarIcon, Filter, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { format, startOfYear, endOfYear } from "date-fns";
import { cn } from "@/lib/utils";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Organizacao {
  id: number;
  "Organização Militar": string;
  "Órgão Setorial Responsável": string;
  "Sigla da OM": string;
}

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalSolicitacoes: 0,
    totalVistorias: 0,
    totalAnexos: 0,
    pendentes: 0,
    finalizadas: 0,
    emExecucao: 0,
  });

  const [startDate, setStartDate] = useState<Date>(startOfYear(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfYear(new Date()));
  const [selectedOM, setSelectedOM] = useState<string>("all");
  const [selectedOrgaoSetorial, setSelectedOrgaoSetorial] = useState<string>("all");
  const [organizacoes, setOrganizacoes] = useState<Organizacao[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [omData, setOMData] = useState<any[]>([]);
  const [orgaoSetorialData, setOrgaoSetorialData] = useState<any[]>([]);

  useEffect(() => {
    fetchOrganizacoes();
  }, []);

  useEffect(() => {
    fetchStats();
    fetchMonthlyData();
    fetchOMData();
    fetchOrgaoSetorialData();
  }, [startDate, endDate, selectedOM, selectedOrgaoSetorial]);

  const fetchOrganizacoes = async () => {
    const { data, error } = await supabase
      .from("organizacoes")
      .select("*")
      .order('"Organização Militar"');

    if (error) {
      toast.error("Erro ao carregar organizações");
      return;
    }
    setOrganizacoes(data || []);
  };

  const applyFilters = (data: any[]) => {
    return data.filter((item) => {
      const itemDate = new Date(item.data_solicitacao);
      const matchesDate = (!startDate || itemDate >= startDate) && (!endDate || itemDate <= endDate);
      const matchesOM = selectedOM === "all" || item.organizacao_id === parseInt(selectedOM);
      return matchesDate && matchesOM;
    });
  };

  const fetchStats = async () => {
    try {
      const { data: allSolicitacoes, error } = await supabase
        .from("solicitacoes")
        .select("data_solicitacao, status, organizacao_id");

      if (error) throw error;

      const filtered = applyFilters(allSolicitacoes || []);

      const pendentes = filtered.filter((s) => s.status === "pending").length;
      const finalizadas = filtered.filter((s) => s.status === "completed").length;
      const emExecucao = filtered.filter((s) => s.status === "in_progress").length;

      const { count: vistoriasCount } = await supabase
        .from("vistorias")
        .select("*", { count: "exact", head: true });

      const { count: anexosCount } = await supabase
        .from("anexos")
        .select("*", { count: "exact", head: true });

      setStats({
        totalSolicitacoes: filtered.length,
        totalVistorias: vistoriasCount || 0,
        totalAnexos: anexosCount || 0,
        pendentes,
        finalizadas,
        emExecucao,
      });
    } catch (error: any) {
      toast.error("Erro ao carregar estatísticas");
      console.error(error);
    }
  };

  const fetchMonthlyData = async () => {
    try {
      const { data, error } = await supabase
        .from("solicitacoes")
        .select("data_solicitacao, status, organizacao_id");

      if (error) throw error;

      const filtered = applyFilters(data || []);

      const monthlyStats: Record<string, { recebidas: number; finalizadas: number; emExecucao: number }> = {};

      filtered.forEach((item) => {
        const month = format(new Date(item.data_solicitacao), "MMM");
        if (!monthlyStats[month]) {
          monthlyStats[month] = { recebidas: 0, finalizadas: 0, emExecucao: 0 };
        }
        monthlyStats[month].recebidas++;
        if (item.status === "completed") monthlyStats[month].finalizadas++;
        if (item.status === "in_progress") monthlyStats[month].emExecucao++;
      });

      const chartData = Object.entries(monthlyStats).map(([month, stats]) => ({
        mes: month,
        Recebidas: stats.recebidas,
        Finalizadas: stats.finalizadas,
        "Em Execução": stats.emExecucao,
      }));

      setMonthlyData(chartData);
    } catch (error) {
      console.error("Erro ao buscar dados mensais:", error);
    }
  };

  const fetchOMData = async () => {
    try {
      const { data: solicitacoes, error } = await supabase
        .from("solicitacoes")
        .select("organizacao_id, data_solicitacao");

      if (error) throw error;

      const filtered = applyFilters(solicitacoes || []);

      const omCounts: Record<number, number> = {};
      filtered.forEach((item) => {
        if (item.organizacao_id) {
          omCounts[item.organizacao_id] = (omCounts[item.organizacao_id] || 0) + 1;
        }
      });

      const chartData = organizacoes
        .filter((org) => omCounts[org.id])
        .map((org) => ({
          om: org["Organização Militar"],
          Total: omCounts[org.id],
        }));

      setOMData(chartData);
    } catch (error) {
      console.error("Erro ao buscar dados por OM:", error);
    }
  };

  const fetchOrgaoSetorialData = async () => {
    try {
      const { data: solicitacoes, error } = await supabase
        .from("solicitacoes")
        .select("organizacao_id, data_solicitacao");

      if (error) throw error;

      const filtered = applyFilters(solicitacoes || []);

      const setorialCounts: Record<string, number> = {};
      filtered.forEach((item) => {
        const org = organizacoes.find((o) => o.id === item.organizacao_id);
        if (org) {
          const setorial = org["Órgão Setorial Responsável"];
          setorialCounts[setorial] = (setorialCounts[setorial] || 0) + 1;
        }
      });

      const chartData = Object.entries(setorialCounts).map(([orgao, total]) => ({
        orgao,
        Total: total,
      }));

      if (selectedOrgaoSetorial !== "all") {
        const filtered = chartData.filter((item) => item.orgao === selectedOrgaoSetorial);
        setOrgaoSetorialData(filtered);
      } else {
        setOrgaoSetorialData(chartData);
      }
    } catch (error) {
      console.error("Erro ao buscar dados por Órgão Setorial:", error);
    }
  };

  const orgaosSetoriais = Array.from(new Set(organizacoes.map((o) => o["Órgão Setorial Responsável"])));

  const cards = [
    {
      title: "Vistorias Recebidas",
      value: stats.totalSolicitacoes,
      icon: FileText,
      gradient: "from-primary to-primary/80",
    },
    {
      title: "Vistorias Finalizadas",
      value: stats.finalizadas,
      icon: CheckCircle2,
      gradient: "from-secondary to-secondary/80",
    },
    {
      title: "Vistorias Pendentes",
      value: stats.pendentes,
      icon: Clock,
      gradient: "from-accent to-accent/80",
    },
    {
      title: "Em Execução",
      value: stats.emExecucao,
      icon: TrendingUp,
      gradient: "from-purple-500 to-purple-400",
    },
  ];

  return (
    <div 
      className="min-h-[calc(100vh-8rem)] bg-cover bg-center bg-no-repeat relative -m-6 p-6"
      style={{ backgroundImage: 'url(/dashboard-bg.jpg)' }}
    >
      <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" />
      <div className="relative z-10 space-y-8 animate-fade-in">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Dashboard</h2>
          <p className="text-muted-foreground">
            Visão geral do sistema de inspeções com filtros e análises
          </p>
        </div>

      {/* Filtros */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Período Inicial */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Período Inicial</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Período Final */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Período Final</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy") : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Organização Militar */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Organização Militar</label>
              <Select value={selectedOM} onValueChange={setSelectedOM}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="all">Todas</SelectItem>
                  {organizacoes.map((org) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org["Organização Militar"]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Órgão Setorial */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Órgão Setorial</label>
              <Select value={selectedOrgaoSetorial} onValueChange={setSelectedOrgaoSetorial}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="all">Todos</SelectItem>
                  {orgaosSetoriais.map((orgao) => (
                    <SelectItem key={orgao} value={orgao}>
                      {orgao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Indicadores Rápidos */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, index) => (
          <Card
            key={card.title}
            className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-slide-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center`}
              >
                <card.icon className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráfico Mensal */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Vistorias por Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
              <Legend />
              <Line type="monotone" dataKey="Recebidas" stroke="hsl(var(--primary))" strokeWidth={2} />
              <Line type="monotone" dataKey="Finalizadas" stroke="hsl(var(--secondary))" strokeWidth={2} />
              <Line type="monotone" dataKey="Em Execução" stroke="hsl(var(--accent))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráficos por OM e Órgão Setorial */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gráfico por OM */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Vistorias por Organização Militar</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={omData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="om" />
                <YAxis />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="Total" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico por Órgão Setorial */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Vistorias por Órgão Setorial</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={orgaoSetorialData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="orgao" />
                <YAxis />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="Total" fill="hsl(var(--secondary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
