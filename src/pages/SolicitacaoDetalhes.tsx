import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Calendar, 
  Building2, 
  FileText, 
  Paperclip, 
  Edit, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  CheckCircle, 
  Clock,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SolicitacaoDetalhes {
  id: number;
  objeto: string;
  status: string;
  data_solicitacao: string;
  endereco_completo: string | null;
  diretoria_responsavel: string | null;
  classificacao_urgencia: string | null;
  documento_origem_dados: string | null;
  documento_origem_anexo: string | null;
  numero_referencia_opous: string | null;
  objetivo_vistoria: string | null;
  tipo_vistoria: string | null;
  contato_nome: string | null;
  contato_telefone: string | null;
  contato_email: string | null;
  organizacoes?: {
    nome: string;
    diretoria: string;
  };
}

interface Vistoria {
  id: number;
  descricao: string;
  data_vistoria: string;
  relatorio: string;
}

interface Anexo {
  id: number;
  url: string;
  tipo: string;
  uploaded_at: string;
}

const SolicitacaoDetalhes = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [solicitacao, setSolicitacao] = useState<SolicitacaoDetalhes | null>(null);
  const [vistorias, setVistorias] = useState<Vistoria[]>([]);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    if (!id) return;
    
    try {
      const solicitacaoId = parseInt(id);
      
      const [solicitacaoRes, vistoriasRes, anexosRes] = await Promise.all([
        supabase
          .from("solicitacoes")
          .select(`*, organizacoes ("Organização Militar", "Órgão Setorial Responsável")`)
          .eq("id", solicitacaoId)
          .single(),
        supabase
          .from("vistorias")
          .select("*")
          .eq("solicitacao_id", solicitacaoId)
          .order("data_vistoria", { ascending: false }),
        supabase
          .from("anexos")
          .select("*")
          .eq("solicitacao_id", solicitacaoId)
          .order("uploaded_at", { ascending: false }),
      ]);

      if (solicitacaoRes.error) throw solicitacaoRes.error;

      const mappedSolicitacao = {
        ...solicitacaoRes.data,
        organizacoes: solicitacaoRes.data.organizacoes ? {
          nome: solicitacaoRes.data.organizacoes["Organização Militar"],
          diretoria: solicitacaoRes.data.organizacoes["Órgão Setorial Responsável"],
        } : undefined,
      };

      setSolicitacao(mappedSolicitacao);
      setVistorias(vistoriasRes.data || []);
      setAnexos(anexosRes.data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar detalhes");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (status: string) => {
    setNewStatus(status);
    setShowStatusDialog(true);
  };

  const confirmStatusChange = async () => {
    if (!id || !newStatus) return;

    if (newStatus === "completed" && vistorias.length === 0) {
      toast.error("Não é possível marcar como concluída sem ao menos uma vistoria registrada");
      setShowStatusDialog(false);
      return;
    }

    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from("solicitacoes")
        .update({ status: newStatus })
        .eq("id", parseInt(id));

      if (error) throw error;

      setSolicitacao(prev => prev ? { ...prev, status: newStatus } : null);
      toast.success("Status atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    } finally {
      setUpdatingStatus(false);
      setShowStatusDialog(false);
    }
  };

  const displayField = (value: string | null | undefined) => {
    return value && value.trim() !== "" ? value : "-";
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pendente", variant: "secondary" as const, color: "text-yellow-600" },
      in_progress: { label: "Em Andamento", variant: "default" as const, color: "text-blue-600" },
      completed: { label: "Concluída", variant: "outline" as const, color: "text-green-600" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant} className={config.color}>{config.label}</Badge>;
  };

  const getUrgenciaBadge = (urgencia: string | null) => {
    if (!urgencia) return <span className="text-muted-foreground">-</span>;
    const isPrioritario = urgencia === "Prioritário";
    return (
      <Badge variant={isPrioritario ? "destructive" : "secondary"}>
        {urgencia}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!solicitacao) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-muted-foreground">Solicitação não encontrada</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate("/solicitacoes")}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <Button
          variant="default"
          onClick={() => navigate(`/solicitacao/${id}/editar`)}
          className="gap-2"
        >
          <Edit className="w-4 h-4" />
          Editar Solicitação
        </Button>
      </div>

      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">
          {solicitacao.objeto}
        </h2>
        <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-4">
          {solicitacao.organizacoes && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span>{solicitacao.organizacoes.nome}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>
              {format(new Date(solicitacao.data_solicitacao), "dd/MM/yyyy")}
            </span>
          </div>
          {getStatusBadge(solicitacao.status)}
        </div>

        <div className="flex gap-2 mt-4">
          {solicitacao.status === "pending" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("in_progress")}
              className="gap-2"
            >
              <Clock className="w-4 h-4" />
              Marcar como Em Andamento
            </Button>
          )}
          {solicitacao.status === "in_progress" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange("completed")}
                className="gap-2 text-green-600 border-green-600 hover:bg-green-50"
              >
                <CheckCircle className="w-4 h-4" />
                Marcar como Concluída
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange("pending")}
                className="gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                Retornar para Pendente
              </Button>
            </>
          )}
          {solicitacao.status === "completed" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("in_progress")}
              className="gap-2"
            >
              <Clock className="w-4 h-4" />
              Reabrir como Em Andamento
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Informações Gerais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Objeto da Vistoria</p>
              <p className="text-sm">{displayField(solicitacao.objeto)}</p>
            </div>
            {solicitacao.organizacoes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Organização Militar Apoiada</p>
                <p className="text-sm">{solicitacao.organizacoes.nome}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Diretoria Responsável</p>
              <p className="text-sm">{displayField(solicitacao.diretoria_responsavel)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Tipo de Vistoria</p>
              <p className="text-sm">{displayField(solicitacao.tipo_vistoria)}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Endereço Completo
              </p>
              <p className="text-sm">{displayField(solicitacao.endereco_completo)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Data da Solicitação</p>
              <p className="text-sm">
                {format(new Date(solicitacao.data_solicitacao), "dd/MM/yyyy")}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Classificação da Urgência</p>
              {getUrgenciaBadge(solicitacao.classificacao_urgencia)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documentação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Documento que Originou a Solicitação</p>
              <p className="text-sm">{displayField(solicitacao.documento_origem_dados)}</p>
            </div>
            {solicitacao.documento_origem_anexo && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Documento Anexado</p>
                <a
                  href={solicitacao.documento_origem_anexo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-2"
                >
                  <Paperclip className="w-4 h-4" />
                  Ver documento
                </a>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Número de Referência OPOUS</p>
              <p className="text-sm">{displayField(solicitacao.numero_referencia_opous)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Objetivo da Vistoria</p>
              <p className="text-sm whitespace-pre-wrap">{displayField(solicitacao.objetivo_vistoria)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Contato do Responsável na OM Apoiada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Nome</p>
              <p className="text-sm">{displayField(solicitacao.contato_nome)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Telefone
              </p>
              <p className="text-sm">{displayField(solicitacao.contato_telefone)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                E-mail
              </p>
              {solicitacao.contato_email ? (
                <a
                  href={`mailto:${solicitacao.contato_email}`}
                  className="text-sm text-primary hover:underline"
                >
                  {solicitacao.contato_email}
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">-</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Vistorias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vistorias.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma vistoria registrada ainda.
              </p>
            ) : (
              <div className="space-y-4">
                {vistorias.map((vistoria) => (
                  <div
                    key={vistoria.id}
                    className="border-l-2 border-primary pl-4 py-2"
                  >
                    <p className="text-sm font-medium">{vistoria.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(vistoria.data_vistoria), "dd/MM/yyyy")}
                    </p>
                    {vistoria.relatorio && (
                      <a
                        href={vistoria.relatorio}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline mt-1 inline-block"
                      >
                        Ver relatório
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paperclip className="w-5 h-5" />
              Anexos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {anexos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum anexo disponível.
              </p>
            ) : (
              <div className="space-y-2">
                {anexos.map((anexo) => (
                  <a
                    key={anexo.id}
                    href={anexo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded hover:bg-accent transition-colors"
                  >
                    <Paperclip className="w-4 h-4" />
                    <div className="flex-1">
                      <p className="text-sm">Anexo</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(anexo.uploaded_at), "dd/MM/yyyy")}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração de status</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja alterar o status desta solicitação?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updatingStatus}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange} disabled={updatingStatus}>
              {updatingStatus ? "Atualizando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SolicitacaoDetalhes;
