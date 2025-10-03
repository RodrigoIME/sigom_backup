-- Adicionar novos campos na tabela solicitacoes
ALTER TABLE public.solicitacoes
ADD COLUMN IF NOT EXISTS endereco_completo TEXT,
ADD COLUMN IF NOT EXISTS contato_responsavel TEXT,
ADD COLUMN IF NOT EXISTS diretoria_responsavel TEXT,
ADD COLUMN IF NOT EXISTS classificacao_urgencia TEXT CHECK (classificacao_urgencia IN ('Prioritário', 'Não Prioritário')),
ADD COLUMN IF NOT EXISTS documento_origem_dados TEXT,
ADD COLUMN IF NOT EXISTS documento_origem_anexo TEXT,
ADD COLUMN IF NOT EXISTS numero_referencia_opous TEXT,
ADD COLUMN IF NOT EXISTS objetivo_vistoria TEXT,
ADD COLUMN IF NOT EXISTS tipo_vistoria TEXT;

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.solicitacoes.endereco_completo IS 'Endereço completo onde será realizada a vistoria';
COMMENT ON COLUMN public.solicitacoes.contato_responsavel IS 'Contato do responsável na OM apoiada para acompanhar a vistoria';
COMMENT ON COLUMN public.solicitacoes.diretoria_responsavel IS 'Diretoria responsável pela vistoria';
COMMENT ON COLUMN public.solicitacoes.classificacao_urgencia IS 'Classificação da urgência: Prioritário ou Não Prioritário';
COMMENT ON COLUMN public.solicitacoes.documento_origem_dados IS 'Dados do documento que originou a solicitação';
COMMENT ON COLUMN public.solicitacoes.documento_origem_anexo IS 'URL do anexo do documento que originou a solicitação';
COMMENT ON COLUMN public.solicitacoes.numero_referencia_opous IS 'Número de referência no Sistema Unificado do Processo de Obras (OPOUS)';
COMMENT ON COLUMN public.solicitacoes.objetivo_vistoria IS 'Objetivo da vistoria';
COMMENT ON COLUMN public.solicitacoes.tipo_vistoria IS 'Tipo de vistoria';