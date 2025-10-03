import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VistoriaData {
  'OBJETO DE VISTORIA': string;
  'OM APOIADA': string;
  'Diretoria Responsável': string;
  'Classificação da Urgência': string;
  'Situação': string;
  'ORIGEM DA SOLICITAÇÃO (Nº do DiEx quando houver)': string;
  'DATA DA SOLICITAÇÃO': string | number;
  'REFERÊNCIA OPUS': string;
  'OBJETIVO (ADICIONAR POSSÍVEL CONTATO)': string;
  'DATA DA VISTORIA'?: string | number;
  'VT EXECUTADA POR'?: string;
  'STATUS - ATUALIZAÇÃO SEMANAL'?: string;
  'DATA/PREVISÃO DE CONCLUSÃO'?: string | number;
  'MEIO DE RESPOSTA DA SOLICITAÇÃO'?: string;
  'DATA DA RESPOSTA A SOLICITAÇÃO'?: string | number;
  'Nº OPUS DA VISTORIA (SE FOR O CASO)'?: string;
  'QUANTIDADE DE DIAS PARA TOTAL ATENDIMENTO\n(Envio do DIEx de resposta)'?: string;
  'QUANTIDADE DE DIAS PARA EXECUÇÃO\n(Vistoria in loco)'?: string;
  'OBSERVAÇÕES'?: string;
}

function convertExcelDate(excelDate: string | number): string | null {
  if (!excelDate) return null;
  
  try {
    if (typeof excelDate === 'number') {
      // Excel armazena datas como números (dias desde 1900-01-01)
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + excelDate * 86400000);
      return date.toISOString();
    } else {
      // Tentar converter string
      const date = new Date(excelDate);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  } catch (e) {
    console.log('Erro ao converter data:', e);
  }
  
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[importar-vistorias] Requisição sem token de autenticação');
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Obter usuário do token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('[importar-vistorias] Token inválido:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verificar se o usuário é admin
    const { data: isAdmin, error: roleError } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (roleError || !isAdmin) {
      console.error('[importar-vistorias] Acesso negado para usuário:', user.email, 'isAdmin:', isAdmin, 'error:', roleError?.message);
      return new Response(
        JSON.stringify({ 
          error: 'Acesso negado. Apenas administradores podem importar dados.' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[importar-vistorias] Importação iniciada por admin:', user.email);

    const { data } = await req.json();

    if (!data || !Array.isArray(data)) {
      throw new Error('Dados inválidos');
    }

    console.log(`Processando ${data.length} registros...`);

    let importedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < data.length; i++) {
      const row: VistoriaData = data[i];
      
      try {
        const objeto = row['OBJETO DE VISTORIA'];
        const omApoiada = row['OM APOIADA'];
        const diretoriaResponsavel = row['Diretoria Responsável'];
        const classificacaoUrgencia = row['Classificação da Urgência'];
        const situacao = row['Situação'];
        const origemSolicitacao = row['ORIGEM DA SOLICITAÇÃO (Nº do DiEx quando houver)'];
        const dataSolicitacao = row['DATA DA SOLICITAÇÃO'];
        const referenciaOpus = row['REFERÊNCIA OPUS'];
        const objetivo = row['OBJETIVO (ADICIONAR POSSÍVEL CONTATO)'];
        const dataVistoria = row['DATA DA VISTORIA'];
        const vtExecutadaPor = row['VT EXECUTADA POR'];
        const statusAtualizacao = row['STATUS - ATUALIZAÇÃO SEMANAL'];
        const observacoes = row['OBSERVAÇÕES'];

        // Validar campos obrigatórios
        if (!objeto || !omApoiada) {
          errors.push(`Linha ${i + 2}: Campos obrigatórios faltando (OBJETO ou OM APOIADA)`);
          continue;
        }

        // Buscar ou criar a organização
        let organizacaoId: number | null = null;
        
        const { data: orgExistente } = await supabase
          .from('organizacoes')
          .select('id')
          .eq('Organização Militar', omApoiada)
          .maybeSingle();

        if (orgExistente) {
          organizacaoId = orgExistente.id;
        } else {
          const { data: novaOrg, error: orgError } = await supabase
            .from('organizacoes')
            .insert({
              'Organização Militar': omApoiada,
              'Sigla da OM': omApoiada.substring(0, 10),
              'Órgão Setorial Responsável': diretoriaResponsavel || 'N/A',
            })
            .select('id')
            .single();

          if (orgError) {
            console.error('Erro ao criar organização:', orgError);
            errors.push(`Linha ${i + 2}: Erro ao criar organização - ${orgError.message}`);
            continue;
          }
          organizacaoId = novaOrg.id;
        }

        // Converter data
        const dataSolicitacaoFormatada = convertExcelDate(dataSolicitacao) || new Date().toISOString();

        // Mapear status
        let status = 'pending';
        if (situacao) {
          const situacaoLower = situacao.toLowerCase();
          if (situacaoLower.includes('atendida') && !situacaoLower.includes('não')) {
            status = 'completed';
          } else if (situacaoLower.includes('andamento')) {
            status = 'in_progress';
          }
        }

        // Inserir solicitação
        const { data: solicitacao, error: solicitacaoError } = await supabase
          .from('solicitacoes')
          .insert({
            objeto: objeto,
            organizacao_id: organizacaoId,
            status: status,
            data_solicitacao: dataSolicitacaoFormatada,
            diretoria_responsavel: diretoriaResponsavel || null,
            classificacao_urgencia: classificacaoUrgencia || null,
            documento_origem_dados: origemSolicitacao || null,
            numero_referencia_opous: referenciaOpus || null,
            objetivo_vistoria: objetivo || null,
          })
          .select('id')
          .single();

        if (solicitacaoError) {
          console.error('Erro ao criar solicitação:', solicitacaoError);
          errors.push(`Linha ${i + 2}: Erro ao criar solicitação - ${solicitacaoError.message}`);
          continue;
        }

        // Se houver dados de vistoria, criar registro
        if (dataVistoria || vtExecutadaPor || statusAtualizacao) {
          const dataVistoriaFormatada = dataVistoria 
            ? convertExcelDate(dataVistoria) || new Date().toISOString()
            : new Date().toISOString();

          const { error: vistoriaError } = await supabase
            .from('vistorias')
            .insert({
              solicitacao_id: solicitacao.id,
              descricao: statusAtualizacao || vtExecutadaPor || 'Vistoria técnica',
              data_vistoria: dataVistoriaFormatada,
              relatorio: observacoes || null,
            });

          if (vistoriaError) {
            console.error('Erro ao criar vistoria:', vistoriaError);
            errors.push(`Linha ${i + 2}: Erro ao criar vistoria - ${vistoriaError.message}`);
          }
        }

        importedCount++;
        console.log(`Importado (${importedCount}/${data.length}): ${objeto}`);
      } catch (rowError: any) {
        console.error('Erro ao processar linha:', rowError);
        errors.push(`Linha ${i + 2}: ${rowError.message}`);
      }
    }

    console.log(`Importação concluída: ${importedCount} registros importados`);
    if (errors.length > 0) {
      console.log(`Erros encontrados: ${errors.length}`);
      console.log(errors.join('\n'));
    }

    // Registrar auditoria da importação
    const { error: logError } = await supabase
      .from('admin_logs')
      .insert({
        admin_id: user.id,
        action: 'import_vistorias',
        details: {
          imported_count: importedCount,
          total_rows: data.length,
          errors_count: errors.length,
          timestamp: new Date().toISOString()
        }
      });

    if (logError) {
      console.error('[importar-vistorias] Erro ao registrar log:', logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        imported: importedCount,
        total: data.length,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Retornar apenas os primeiros 10 erros
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Erro geral:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Erro ao processar arquivo',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
