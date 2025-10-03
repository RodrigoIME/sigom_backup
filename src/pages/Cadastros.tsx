import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, Landmark, Save } from "lucide-react";

interface OrgaoSetorial {
  id: number;
  nome: string;
  sigla: string;
}

const Cadastros = () => {
  // Estados para Organização Militar
  const [omNome, setOmNome] = useState("");
  const [omSigla, setOmSigla] = useState("");
  const [omOrgaoSetorialId, setOmOrgaoSetorialId] = useState("");
  const [omEndereco, setOmEndereco] = useState("");
  const [omLoading, setOmLoading] = useState(false);

  // Estados para Órgão Setorial
  const [osNome, setOsNome] = useState("");
  const [osSigla, setOsSigla] = useState("");
  const [osLoading, setOsLoading] = useState(false);

  // Lista de órgãos setoriais
  const [orgaosSetoriais, setOrgaosSetoriais] = useState<OrgaoSetorial[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    fetchOrgaosSetoriais();
  }, []);

  const fetchOrgaosSetoriais = async () => {
    const { data, error } = await supabase
      .from("Orgao_de_Direcao_Setorial")
      .select("*")
      .order("Nome_do_Orgao_de_Direcao_Setorial");

    if (error) {
      toast.error("Erro ao carregar órgãos setoriais");
      return;
    }

    const mapped: OrgaoSetorial[] = (data || []).map((os: any) => ({
      id: os.id,
      nome: os["Nome_do_Orgao_de_Direcao_Setorial"],
      sigla: os["Sigla_do_Orgao_de_Direcao_Setorial"],
    }));

    setOrgaosSetoriais(mapped);
  };

  const handleSubmitOrganizacao = async (e: React.FormEvent) => {
    e.preventDefault();
    setOmLoading(true);

    try {
      // Buscar sigla do órgão setorial selecionado
      const orgaoSelecionado = orgaosSetoriais.find(
        (os) => os.id.toString() === omOrgaoSetorialId
      );

      if (!orgaoSelecionado) {
        toast.error("Órgão Setorial não encontrado");
        return;
      }

      const { error } = await supabase
        .from("organizacoes")
        .insert({
          "Organização Militar": omNome,
          "Sigla da OM": omSigla,
          "Órgão Setorial Responsável": orgaoSelecionado.sigla,
          endereco_completo: omEndereco,
        });

      if (error) throw error;

      toast.success("Organização Militar cadastrada com sucesso!");
      
      // Limpar formulário
      setOmNome("");
      setOmSigla("");
      setOmOrgaoSetorialId("");
      setOmEndereco("");
    } catch (error: any) {
      toast.error("Erro ao cadastrar organização militar");
      console.error(error);
    } finally {
      setOmLoading(false);
    }
  };

  const handleSubmitOrgaoSetorial = async (e: React.FormEvent) => {
    e.preventDefault();
    setOsLoading(true);

    try {
      // Verificar se já existe essa sigla
      const { data: existing } = await supabase
        .from("Orgao_de_Direcao_Setorial")
        .select("id")
        .eq("Sigla_do_Orgao_de_Direcao_Setorial", osSigla)
        .maybeSingle();

      if (existing) {
        toast.error("Já existe um órgão setorial com esta sigla");
        return;
      }

      const { error } = await supabase
        .from("Orgao_de_Direcao_Setorial")
        .insert({
          "Nome_do_Orgao_de_Direcao_Setorial": osNome,
          "Sigla_do_Orgao_de_Direcao_Setorial": osSigla,
        });

      if (error) throw error;

      toast.success("Órgão Setorial cadastrado com sucesso!");
      
      // Limpar formulário e atualizar lista
      setOsNome("");
      setOsSigla("");
      fetchOrgaosSetoriais();
    } catch (error: any) {
      toast.error("Erro ao cadastrar órgão setorial");
      console.error(error);
    } finally {
      setOsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">Cadastros</h2>
        <p className="text-muted-foreground">
          Gerencie Organizações Militares e Órgãos Setoriais do sistema
        </p>
      </div>

      <Tabs defaultValue="organizacao" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="organizacao" className="gap-2">
            <Building2 className="w-4 h-4" />
            Organização Militar
          </TabsTrigger>
          <TabsTrigger value="orgao" className="gap-2">
            <Landmark className="w-4 h-4" />
            Órgão Setorial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organizacao">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Nova Organização Militar</CardTitle>
              <CardDescription>
                Cadastre uma nova Organização Militar no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitOrganizacao} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="om-nome">Nome da Organização Militar</Label>
                  <Input
                    id="om-nome"
                    placeholder="Ex: 1º Batalhão de Infantaria"
                    value={omNome}
                    onChange={(e) => setOmNome(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="om-sigla">Sigla da OM</Label>
                  <Input
                    id="om-sigla"
                    placeholder="Ex: 1º BI"
                    value={omSigla}
                    onChange={(e) => setOmSigla(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="om-orgao">Órgão Setorial Responsável</Label>
                  <Select 
                    value={omOrgaoSetorialId} 
                    onValueChange={setOmOrgaoSetorialId}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o órgão setorial" />
                    </SelectTrigger>
                    <SelectContent>
                      {orgaosSetoriais.length === 0 ? (
                        <SelectItem value="empty" disabled>
                          Nenhum órgão setorial cadastrado
                        </SelectItem>
                      ) : (
                        orgaosSetoriais.map((os) => (
                          <SelectItem key={os.id} value={os.id.toString()}>
                            {os.sigla} - {os.nome}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {orgaosSetoriais.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Cadastre primeiro um Órgão Setorial na aba ao lado
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="om-endereco">Endereço Completo</Label>
                  <Textarea
                    id="om-endereco"
                    placeholder="Endereço completo da organização militar..."
                    value={omEndereco}
                    onChange={(e) => setOmEndereco(e.target.value)}
                    required
                    className="min-h-[100px]"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/solicitacoes")}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={omLoading || orgaosSetoriais.length === 0}
                    className="flex-1 gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {omLoading ? "Cadastrando..." : "Cadastrar Organização"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orgao">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Novo Órgão Setorial</CardTitle>
              <CardDescription>
                Cadastre um novo Órgão de Direção Setorial no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitOrgaoSetorial} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="os-nome">Nome do Órgão de Direção Setorial</Label>
                  <Input
                    id="os-nome"
                    placeholder="Ex: Comando Logístico"
                    value={osNome}
                    onChange={(e) => setOsNome(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="os-sigla">Sigla do Órgão</Label>
                  <Input
                    id="os-sigla"
                    placeholder="Ex: COLOG"
                    value={osSigla}
                    onChange={(e) => setOsSigla(e.target.value.toUpperCase())}
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/solicitacoes")}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={osLoading}
                    className="flex-1 gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {osLoading ? "Cadastrando..." : "Cadastrar Órgão Setorial"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Cadastros;
