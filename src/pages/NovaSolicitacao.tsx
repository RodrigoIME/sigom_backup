import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Upload, FileText, CalendarIcon, Building2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Organizacao {
  id: number;
  nome: string;
  sigla: string;
  diretoria: string;
  endereco?: string;
}

interface OrgaoSetorial {
  id: number;
  nome: string;
  sigla: string;
}

const TIPOS_VISTORIA = [
  "Técnica Regular",
  "Preventiva",
  "De Rotina",
  "De Ordem Superior",
  "Corretiva/Emergencial",
  "Para Recebimento de Obra",
  "Administrativa/Patrimonial",
];

const NovaSolicitacao = () => {
  const [objeto, setObjeto] = useState("");
  const [organizacaoId, setOrganizacaoId] = useState("");
  const [enderecoCompleto, setEnderecoCompleto] = useState("");
  const [contatoNome, setContatoNome] = useState("");
  const [contatoTelefone, setContatoTelefone] = useState("");
  const [contatoEmail, setContatoEmail] = useState("");
  const [diretoriaResponsavel, setDiretoriaResponsavel] = useState("");
  const [siglaDaOM, setSiglaDaOM] = useState("");
  const [dataSolicitacao, setDataSolicitacao] = useState(new Date());
  const [classificacaoUrgencia, setClassificacaoUrgencia] = useState("");
  const [documentoOrigemDados, setDocumentoOrigemDados] = useState("");
  const [documentoOrigemFile, setDocumentoOrigemFile] = useState<File | null>(null);
  const [numeroReferenciaOpous, setNumeroReferenciaOpous] = useState("");
  const [objetivoVistoria, setObjetivoVistoria] = useState("");
  const [tipoVistoria, setTipoVistoria] = useState("");
  const [organizacoes, setOrganizacoes] = useState<Organizacao[]>([]);
  const [orgaosSetoriais, setOrgaosSetoriais] = useState<OrgaoSetorial[]>([]);
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [vistoriaNoEnderecoOM, setVistoriaNoEnderecoOM] = useState(true);
  const [enderecoOMOriginal, setEnderecoOMOriginal] = useState("");
  const [searchOM, setSearchOM] = useState("");
  const navigate = useNavigate();

  // Filtrar organizações por busca
  const organizacoesFiltradas = organizacoes.filter((org) =>
    org.nome.toLowerCase().includes(searchOM.toLowerCase()) ||
    org.sigla.toLowerCase().includes(searchOM.toLowerCase())
  );

  useEffect(() => {
    fetchOrganizacoes();
    fetchOrgaosSetoriais();
  }, []);

  const fetchOrganizacoes = async () => {
    const { data, error } = await supabase
      .from("organizacoes")
      .select("*")
      .order('"Organização Militar"');

    if (error) {
      toast.error("Erro ao carregar organizações");
      return;
    }

    // Mapear os dados do Supabase para a interface esperada
    const mappedData: Organizacao[] = (data || []).map((org: any) => ({
      id: org.id,
      nome: org["Organização Militar"],
      sigla: org["Sigla da OM"],
      diretoria: org["Órgão Setorial Responsável"],
      endereco: org.endereco_completo,
    }));

    setOrganizacoes(mappedData);
  };

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

  // Pré-preencher endereço, diretoria e sigla ao selecionar organização
  const handleOrganizacaoChange = (orgId: string) => {
    setOrganizacaoId(orgId);
    const orgSelecionada = organizacoes.find((org) => org.id.toString() === orgId);
    
    if (orgSelecionada) {
      // Preencher automaticamente a sigla
      setSiglaDaOM(orgSelecionada.sigla);
      
      // Preencher automaticamente a diretoria
      setDiretoriaResponsavel(orgSelecionada.diretoria);
      
      // Preencher endereço
      if (orgSelecionada.endereco) {
        setEnderecoOMOriginal(orgSelecionada.endereco);
        setEnderecoCompleto(orgSelecionada.endereco);
        setVistoriaNoEnderecoOM(true);
      } else {
        setEnderecoOMOriginal("");
        setEnderecoCompleto("");
        setVistoriaNoEnderecoOM(true);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar endereço
      if (!enderecoCompleto || enderecoCompleto.trim() === "") {
        toast.error("Por favor, informe o endereço onde será realizada a vistoria");
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      // Upload do documento de origem se houver
      let documentoOrigemUrl = "";
      if (documentoOrigemFile) {
        const fileName = `${Date.now()}_${documentoOrigemFile.name}`;
        const filePath = `${user.id}/documentos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("anexos")
          .upload(filePath, documentoOrigemFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("anexos")
          .getPublicUrl(filePath);

        documentoOrigemUrl = publicUrl;
      }

      const { data: solicitacao, error: solicitacaoError } = await supabase
        .from("solicitacoes")
        .insert({
          objeto,
          organizacao_id: parseInt(organizacaoId),
          usuario_id: user.id,
          status: "pending",
          endereco_completo: enderecoCompleto,
          contato_nome: contatoNome,
          contato_telefone: contatoTelefone,
          contato_email: contatoEmail,
          diretoria_responsavel: diretoriaResponsavel,
          data_solicitacao: dataSolicitacao.toISOString(),
          classificacao_urgencia: classificacaoUrgencia,
          documento_origem_dados: documentoOrigemDados,
          documento_origem_anexo: documentoOrigemUrl,
          numero_referencia_opous: numeroReferenciaOpous,
          objetivo_vistoria: objetivoVistoria,
          tipo_vistoria: tipoVistoria,
        })
        .select()
        .single();

      if (solicitacaoError) throw solicitacaoError;

      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileName = `${Date.now()}_${file.name}`;
          const filePath = `${user.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("anexos")
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from("anexos")
            .getPublicUrl(filePath);

          await supabase.from("anexos").insert({
            solicitacao_id: solicitacao.id,
            url: publicUrl,
            tipo: file.type,
          });
        }
      }

      toast.success("Solicitação criada com sucesso!");
      navigate("/solicitacoes");
    } catch (error: any) {
      toast.error("Erro ao criar solicitação");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">Nova Solicitação</h2>
        <p className="text-muted-foreground">
          Preencha os dados para criar uma nova solicitação de inspeção
        </p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Dados da Solicitação</CardTitle>
          <CardDescription>
            Todos os campos são obrigatórios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="objeto">Objeto da Vistoria</Label>
              <Textarea
                id="objeto"
                placeholder="Descreva o objeto da vistoria..."
                value={objeto}
                onChange={(e) => setObjeto(e.target.value)}
                required
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizacao">Organização Militar Apoiada</Label>
              <Select 
                value={organizacaoId} 
                onValueChange={handleOrganizacaoChange} 
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma organização" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input 
                      placeholder="Buscar organização..."
                      value={searchOM}
                      onChange={(e) => setSearchOM(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  {organizacoesFiltradas.length === 0 ? (
                    <SelectItem value="empty" disabled>
                      Nenhuma organização encontrada
                    </SelectItem>
                  ) : (
                    organizacoesFiltradas.map((org) => (
                      <SelectItem key={org.id} value={org.id.toString()}>
                        <div className="flex items-center justify-between gap-3 w-full">
                          <span className="font-medium truncate flex-1">{org.nome}</span>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono shrink-0">
                            {org.sigla}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {organizacaoId && (
              <>
                <div className="space-y-2">
                  <Label>Sigla da Organização Militar</Label>
                  <div className="bg-muted p-3 rounded-lg border border-border flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium font-mono">
                      {siglaDaOM}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      ✓ Preenchido automaticamente
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Órgão Setorial Responsável</Label>
                  <div className="bg-muted p-3 rounded-lg border border-border flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {diretoriaResponsavel}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      ✓ Preenchido automaticamente
                    </span>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-3">
              <Label>A vistoria será realizada no endereço da OM?</Label>
              <RadioGroup
                value={vistoriaNoEnderecoOM ? "sim" : "nao"}
                onValueChange={(value) => {
                  const novoValor = value === "sim";
                  setVistoriaNoEnderecoOM(novoValor);
                  
                  if (novoValor) {
                    setEnderecoCompleto(enderecoOMOriginal);
                  } else {
                    setEnderecoCompleto("");
                  }
                }}
                disabled={!organizacaoId}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sim" id="endereco-sim" />
                  <Label htmlFor="endereco-sim" className="font-normal cursor-pointer">
                    Sim, no endereço cadastrado da OM
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nao" id="endereco-nao" />
                  <Label htmlFor="endereco-nao" className="font-normal cursor-pointer">
                    Não, em outro local
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {vistoriaNoEnderecoOM && organizacaoId && (
              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço da Vistoria</Label>
                <div className="bg-muted p-4 rounded-lg border border-border">
                  <p className="text-sm font-medium text-foreground">
                    {enderecoOMOriginal || "Endereço não cadastrado"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    📍 Endereço cadastrado da Organização Militar
                  </p>
                </div>
              </div>
            )}

            {!vistoriaNoEnderecoOM && organizacaoId && (
              <div className="space-y-2">
                <Label htmlFor="endereco-alternativo">
                  Endereço Completo onde Será Realizada a Vistoria
                </Label>
                <Textarea
                  id="endereco-alternativo"
                  placeholder="Digite o endereço completo onde será realizada a vistoria..."
                  value={enderecoCompleto}
                  onChange={(e) => setEnderecoCompleto(e.target.value)}
                  required
                  className="min-h-[80px]"
                />
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="text-amber-500">⚠️</span>
                  <p>
                    Atenção: A vistoria será realizada em endereço diferente do cadastrado na OM
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <Label>Contato do Responsável na OM Apoiada</Label>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contatoNome">Nome</Label>
                  <Input
                    id="contatoNome"
                    placeholder="Nome completo do responsável"
                    value={contatoNome}
                    onChange={(e) => setContatoNome(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contatoTelefone">Telefone</Label>
                  <Input
                    id="contatoTelefone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={contatoTelefone}
                    onChange={(e) => setContatoTelefone(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contatoEmail">E-mail</Label>
                  <Input
                    id="contatoEmail"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={contatoEmail}
                    onChange={(e) => setContatoEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataSolicitacao">Data da Solicitação</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataSolicitacao && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataSolicitacao ? format(dataSolicitacao, "dd/MM/yyyy") : <span>Selecione uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataSolicitacao}
                    onSelect={(date) => date && setDataSolicitacao(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="classificacao">Classificação da Urgência</Label>
              <Select value={classificacaoUrgencia} onValueChange={setClassificacaoUrgencia} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a urgência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Prioritário">Prioritário</SelectItem>
                  <SelectItem value="Não Prioritário">Não Prioritário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentoDados">Documento que Originou a Solicitação (Dados)</Label>
              <Textarea
                id="documentoDados"
                placeholder="Descreva os dados do documento (número, tipo, data, etc.)"
                value={documentoOrigemDados}
                onChange={(e) => setDocumentoOrigemDados(e.target.value)}
                required
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentoAnexo">Anexar Documento de Origem</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                <input
                  id="documentoAnexo"
                  type="file"
                  onChange={(e) => setDocumentoOrigemFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="documentoAnexo" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Clique para anexar o documento
                  </p>
                  {documentoOrigemFile && (
                    <p className="text-sm text-primary mt-2 font-medium">
                      {documentoOrigemFile.name}
                    </p>
                  )}
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="opous">Número de Referência no Sistema OPOUS</Label>
              <Input
                id="opous"
                placeholder="Número de referência no OPOUS"
                value={numeroReferenciaOpous}
                onChange={(e) => setNumeroReferenciaOpous(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="objetivo">Objetivo da Vistoria</Label>
              <Textarea
                id="objetivo"
                placeholder="Descreva o objetivo da vistoria..."
                value={objetivoVistoria}
                onChange={(e) => setObjetivoVistoria(e.target.value)}
                required
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Vistoria</Label>
              <Select value={tipoVistoria} onValueChange={setTipoVistoria} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de vistoria" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_VISTORIA.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="files">Anexos Adicionais (opcional)</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                <input
                  id="files"
                  type="file"
                  multiple
                  onChange={(e) => setFiles(e.target.files)}
                  className="hidden"
                />
                <label htmlFor="files" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Clique para selecionar arquivos adicionais
                  </p>
                  {files && files.length > 0 && (
                    <p className="text-sm text-primary mt-2 font-medium">
                      {files.length} arquivo(s) selecionado(s)
                    </p>
                  )}
                </label>
              </div>
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
                disabled={loading}
                className="flex-1 gap-2"
              >
                <FileText className="w-4 h-4" />
                {loading ? "Criando..." : "Criar Solicitação"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NovaSolicitacao;
