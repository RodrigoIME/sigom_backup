-- Ativar RLS nas tabelas que não têm
ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vistorias ENABLE ROW LEVEL SECURITY;

-- ============================
-- POLÍTICAS PARA ORGANIZACOES
-- ============================

-- Todos podem ver organizações
CREATE POLICY "Todos podem ver organizações"
  ON public.organizacoes
  FOR SELECT
  TO authenticated
  USING (true);

-- Admins podem inserir organizações
CREATE POLICY "Admins podem inserir organizações"
  ON public.organizacoes
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins podem atualizar organizações
CREATE POLICY "Admins podem atualizar organizações"
  ON public.organizacoes
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================
-- POLÍTICAS PARA SOLICITACOES
-- ============================

-- Usuários veem suas solicitações ou admins veem todas
CREATE POLICY "Usuários veem suas solicitações"
  ON public.solicitacoes
  FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Usuários podem inserir suas próprias solicitações
CREATE POLICY "Usuários podem inserir solicitações"
  ON public.solicitacoes
  FOR INSERT
  TO authenticated
  WITH CHECK (usuario_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Usuários podem atualizar suas próprias solicitações ou admins podem atualizar qualquer uma
CREATE POLICY "Usuários podem atualizar suas solicitações"
  ON public.solicitacoes
  FOR UPDATE
  TO authenticated
  USING (usuario_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Admins podem deletar solicitações
CREATE POLICY "Admins podem deletar solicitações"
  ON public.solicitacoes
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================
-- POLÍTICAS PARA VISTORIAS
-- ============================

-- Usuários veem vistorias de suas solicitações
CREATE POLICY "Usuários veem vistorias de suas solicitações"
  ON public.vistorias
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.solicitacoes 
      WHERE id = vistorias.solicitacao_id 
      AND (usuario_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- Usuários podem inserir vistorias em suas solicitações
CREATE POLICY "Usuários podem inserir vistorias"
  ON public.vistorias
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.solicitacoes 
      WHERE id = vistorias.solicitacao_id 
      AND (usuario_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- Usuários podem atualizar vistorias de suas solicitações
CREATE POLICY "Usuários podem atualizar vistorias"
  ON public.vistorias
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.solicitacoes 
      WHERE id = vistorias.solicitacao_id 
      AND (usuario_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- Admins podem deletar vistorias
CREATE POLICY "Admins podem deletar vistorias"
  ON public.vistorias
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));