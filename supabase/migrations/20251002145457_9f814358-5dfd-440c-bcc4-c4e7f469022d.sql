-- Atualizar política SELECT de solicitacoes para incluir acesso por módulo vistorias
DROP POLICY IF EXISTS "Usuários veem suas solicitações" ON public.solicitacoes;

CREATE POLICY "Usuários veem suas solicitações" 
ON public.solicitacoes
FOR SELECT
USING (
  (usuario_id = auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_module_access(auth.uid(), 'vistorias'::app_module)
);

-- Atualizar política SELECT de vistorias para incluir acesso por módulo vistorias
DROP POLICY IF EXISTS "Usuários veem vistorias de suas solicitações" ON public.vistorias;

CREATE POLICY "Usuários veem vistorias de suas solicitações" 
ON public.vistorias
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM solicitacoes
    WHERE solicitacoes.id = vistorias.solicitacao_id
    AND (
      (solicitacoes.usuario_id = auth.uid())
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_module_access(auth.uid(), 'vistorias'::app_module)
    )
  )
);

-- Atualizar política SELECT de anexos para incluir acesso por módulo vistorias
DROP POLICY IF EXISTS "Usuários veem anexos de suas solicitações" ON public.anexos;

CREATE POLICY "Usuários veem anexos de suas solicitações" 
ON public.anexos
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM solicitacoes
    WHERE solicitacoes.id = anexos.solicitacao_id
    AND (
      (solicitacoes.usuario_id = auth.uid())
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_module_access(auth.uid(), 'vistorias'::app_module)
    )
  )
);