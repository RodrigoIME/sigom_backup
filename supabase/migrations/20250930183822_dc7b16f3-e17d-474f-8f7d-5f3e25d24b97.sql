-- Remover organizações duplicadas (manter apenas o ID menor de cada duplicata)
DELETE FROM organizacoes
WHERE id IN (
  SELECT o1.id
  FROM organizacoes o1
  INNER JOIN organizacoes o2 
    ON o1."Organização Militar" = o2."Organização Militar" 
    AND o1."Órgão Setorial Responsável" = o2."Órgão Setorial Responsável"
    AND o1."Sigla da OM" = o2."Sigla da OM"
    AND o1.id > o2.id
);

-- Modificar tabela solicitacoes: remover campo contato_responsavel e adicionar 3 campos separados
ALTER TABLE solicitacoes DROP COLUMN IF EXISTS contato_responsavel;

ALTER TABLE solicitacoes ADD COLUMN IF NOT EXISTS contato_nome TEXT;
ALTER TABLE solicitacoes ADD COLUMN IF NOT EXISTS contato_telefone TEXT;
ALTER TABLE solicitacoes ADD COLUMN IF NOT EXISTS contato_email TEXT;

COMMENT ON COLUMN solicitacoes.contato_nome IS 'Nome do responsável na OM apoiada';
COMMENT ON COLUMN solicitacoes.contato_telefone IS 'Telefone do responsável';
COMMENT ON COLUMN solicitacoes.contato_email IS 'E-mail do responsável';

-- Atualizar constraint de tipo_vistoria com as novas opções
ALTER TABLE solicitacoes DROP CONSTRAINT IF EXISTS tipo_vistoria_check;

ALTER TABLE solicitacoes 
ADD CONSTRAINT tipo_vistoria_check 
CHECK (tipo_vistoria IN (
  'Técnica Regular',
  'Preventiva',
  'De Rotina',
  'De Ordem Superior',
  'Corretiva/Emergencial',
  'Para Recebimento de Obra',
  'Administrativa/Patrimonial'
));