import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, UserCheck, UserX, Clock, FileText, Upload, Users, UserPlus, FileSpreadsheet, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UsersList } from "@/components/admin/UsersList";
import { NewUserForm } from "@/components/admin/NewUserForm";
import { SystemLogs } from "@/components/admin/SystemLogs";
import * as XLSX from 'xlsx';

interface RegistrationRequest {
  id: string;
  name: string;
  email: string;
  requested_modules: string[];
  status: string;
  requested_at: string;
}

interface AdminLog {
  id: string;
  action: string;
  created_at: string;
  details: any;
}

interface SystemUser {
  id: string;
  email: string;
  created_at: string;
  roles: string[];
  modules: string[];
}

const Admin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [adminVerified, setAdminVerified] = useState<boolean | null>(null);
  const { isAdmin, loading } = useUserRole(user);
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  
  // Estados para importação
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState("");
  
  const navigate = useNavigate();

  // Inicialização de autenticação
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      console.log('[Admin] getUser result:', user?.email, user?.id);
      setUser(user);
      setAdminVerified(null); // Reset ao mudar usuário
      setAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[Admin] Auth state changed:', _event, session?.user?.email);
      setUser(session?.user ?? null);
      setAdminVerified(null); // Reset ao mudar sessão
      setAuthChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fallback: verificar admin via RPC se necessário
  useEffect(() => {
    if (!authChecked || !user || loading) return;

    const verifyAdminAccess = async () => {
      if (isAdmin) {
        console.log('[Admin] isAdmin=true via useUserRole');
        setAdminVerified(true);
        return;
      }

      // Fallback: chamar has_role diretamente
      console.log('[Admin] isAdmin=false, tentando fallback via RPC');
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      if (error) {
        console.error('[Admin] Erro no RPC has_role:', error);
        setAdminVerified(false);
      } else {
        console.log('[Admin] RPC has_role retornou:', data);
        setAdminVerified(data === true);
      }
    };

    verifyAdminAccess();
  }, [authChecked, user, loading, isAdmin]);

  // Log de estado atual
  useEffect(() => {
    console.log('[Admin] Estado - authChecked:', authChecked, 'user:', user?.id, 'loading:', loading, 'isAdmin:', isAdmin, 'adminVerified:', adminVerified);
  }, [authChecked, user, loading, isAdmin, adminVerified]);

  // Redirecionar se não for admin
  useEffect(() => {
    if (!authChecked || loading || adminVerified === null) return;
    
    if (user && adminVerified === false) {
      console.log('[Admin] Redirecionando - não é admin');
      toast.error("Acesso negado. Apenas administradores podem acessar esta página.");
      navigate("/");
    }
  }, [authChecked, user, adminVerified, loading, navigate]);

  useEffect(() => {
    if (isAdmin || adminVerified) {
      fetchRequests();
      fetchLogs();
      fetchUsers();
    }
  }, [isAdmin, adminVerified]);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('user_registration_requests')
      .select('*')
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar solicitações:', error);
      toast.error('Erro ao carregar solicitações');
    } else {
      setRequests(data || []);
    }
  };

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('admin_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Erro ao buscar logs:', error);
    } else {
      setLogs(data || []);
    }
  };

  const fetchUsers = async () => {
    try {
      // Buscar usuários com suas roles e módulos
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) throw authError;

      const usersData: SystemUser[] = [];

      for (const authUser of authUsers.users) {
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', authUser.id);

        const { data: modulesData } = await supabase
          .from('user_modules')
          .select('module')
          .eq('user_id', authUser.id);

        usersData.push({
          id: authUser.id,
          email: authUser.email || '',
          created_at: authUser.created_at,
          roles: rolesData?.map(r => r.role) || [],
          modules: modulesData?.map(m => m.module) || [],
        });
      }

      setUsers(usersData);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Erro ao carregar usuários');
    }
  };

  const handleApprove = async (request: RegistrationRequest) => {
    try {
      const { data, error } = await supabase.functions.invoke('approve-user-registration', {
        body: {
          requestId: request.id,
          approve: true,
          requestedModules: request.requested_modules,
          name: request.name,
          email: request.email,
        }
      });

      if (error) throw error;

      await supabase.from('admin_logs').insert({
        admin_id: user?.id,
        action: 'Aprovação de cadastro',
        details: {
          email: request.email,
          modules: request.requested_modules,
        }
      });

      toast.success(`Cadastro de ${request.name} aprovado com sucesso!`);
      fetchRequests();
      fetchLogs();
      fetchUsers();
    } catch (error: any) {
      console.error('Erro ao aprovar cadastro:', error);
      toast.error('Erro ao aprovar cadastro: ' + error.message);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    try {
      await supabase
        .from('user_registration_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          rejection_reason: rejectionReason,
        })
        .eq('id', selectedRequest.id);

      await supabase.from('admin_logs').insert({
        admin_id: user?.id,
        action: 'Rejeição de cadastro',
        details: {
          email: selectedRequest.email,
          reason: rejectionReason,
        }
      });

      toast.success('Solicitação rejeitada');
      setShowRejectDialog(false);
      setRejectionReason("");
      setSelectedRequest(null);
      fetchRequests();
      fetchLogs();
    } catch (error) {
      console.error('Erro ao rejeitar cadastro:', error);
      toast.error('Erro ao rejeitar cadastro');
    }
  };

  const getModuleName = (module: string) => {
    const names: Record<string, string> = {
      vistorias: 'Vistorias',
      projetos: 'Projetos',
      fiscalizacao: 'Fiscalização de Obras',
    };
    return names[module] || module;
  };

  // Handlers para importação
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (
        selectedFile.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        selectedFile.type === "application/vnd.ms-excel"
      ) {
        setImportFile(selectedFile);
      } else {
        toast.error("Por favor, selecione um arquivo Excel (.xlsx ou .xls)");
      }
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error("Por favor, selecione um arquivo");
      return;
    }

    setImportLoading(true);
    setImportProgress("Lendo arquivo...");

    try {
      const reader = new FileReader();
      reader.readAsArrayBuffer(importFile);
      
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            throw new Error("Erro ao ler arquivo");
          }

          setImportProgress("Processando Excel...");
          
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          console.log(`Total de linhas no arquivo: ${jsonData.length}`);
          
          setImportProgress("Importando dados...");
          
          const { data: result, error } = await supabase.functions.invoke("importar-vistorias", {
            body: {
              data: jsonData
            }
          });

          if (error) throw error;

          if (result.error) {
            throw new Error(result.error);
          }

          setImportProgress("Importação concluída!");
          toast.success(`Importação concluída! ${result.imported} de ${result.total} registros importados.`);
          
          if (result.errors && result.errors.length > 0) {
            console.warn("Erros durante importação:", result.errors);
            toast.warning(`Alguns registros apresentaram erros. Verifique o console para detalhes.`);
          }
          
          // Limpar o formulário
          setImportFile(null);
          setImportProgress("");
          
          // Recarregar logs para mostrar a auditoria
          fetchLogs();
        } catch (err: any) {
          console.error("Erro ao processar:", err);
          toast.error(err.message || "Erro ao processar o arquivo");
          setImportProgress("");
        } finally {
          setImportLoading(false);
        }
      };

      reader.onerror = () => {
        toast.error("Erro ao ler o arquivo");
        setImportLoading(false);
        setImportProgress("");
      };
    } catch (error: any) {
      console.error("Erro na importação:", error);
      toast.error(error.message || "Erro ao importar dados");
      setImportLoading(false);
      setImportProgress("");
    }
  };

  if (!authChecked || loading || adminVerified === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 animate-pulse text-primary" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (adminVerified === false) {
    return null;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Painel Administrativo</h1>
          <p className="text-muted-foreground">Gerencie usuários e visualize logs do sistema</p>
        </div>
      </div>

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">
            <Clock className="h-4 w-4 mr-2" />
            Solicitações
            {requests.length > 0 && (
              <Badge variant="destructive" className="ml-2">{requests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="new-user">
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Usuário
          </TabsTrigger>
          <TabsTrigger value="logs">
            <FileText className="h-4 w-4 mr-2" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="import">
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <div className="grid gap-4">
            {requests.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-muted-foreground">
                    <UserCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma solicitação pendente</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              requests.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{request.name}</CardTitle>
                        <CardDescription>{request.email}</CardDescription>
                      </div>
                      <Badge variant="secondary">
                        {format(new Date(request.requested_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Módulos solicitados:</p>
                        <div className="flex flex-wrap gap-2">
                          {request.requested_modules.map((module) => (
                            <Badge key={module} variant="outline">
                              {getModuleName(module)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleApprove(request)} className="gap-2">
                          <UserCheck className="h-4 w-4" />
                          Aprovar
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowRejectDialog(true);
                          }}
                          className="gap-2"
                        >
                          <UserX className="h-4 w-4" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="users">
          <UsersList users={users} onUpdate={fetchUsers} />
        </TabsContent>

        <TabsContent value="new-user">
          <NewUserForm onSuccess={() => {
            fetchUsers();
            fetchLogs();
          }} />
        </TabsContent>

        <TabsContent value="logs">
          <SystemLogs logs={logs} onRefresh={fetchLogs} />
        </TabsContent>

        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-6 w-6" />
                Importar Dados de Vistorias
              </CardTitle>
              <CardDescription>
                Faça upload do arquivo Excel com os dados de acompanhamento de vistorias técnicas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  O arquivo deve conter as seguintes colunas:
                  <ul className="list-disc list-inside mt-2 text-sm">
                    <li>OBJETO DE VISTORIA</li>
                    <li>OM APOIADA</li>
                    <li>Diretoria Responsável</li>
                    <li>Classificação da Urgência</li>
                    <li>Situação</li>
                    <li>ORIGEM DA SOLICITAÇÃO</li>
                    <li>DATA DA SOLICITAÇÃO</li>
                    <li>REFERÊNCIA OPUS</li>
                    <li>OBJETIVO</li>
                    <li>OBSERVAÇÕES</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="file">Arquivo Excel</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  disabled={importLoading}
                />
                {importFile && (
                  <p className="text-sm text-muted-foreground">
                    Arquivo selecionado: {importFile.name}
                  </p>
                )}
              </div>

              {importProgress && (
                <Alert>
                  <AlertDescription>{importProgress}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleImport}
                disabled={!importFile || importLoading}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                {importLoading ? "Importando..." : "Importar Dados"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Solicitação</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição para {selectedRequest?.name}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motivo da rejeição..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
