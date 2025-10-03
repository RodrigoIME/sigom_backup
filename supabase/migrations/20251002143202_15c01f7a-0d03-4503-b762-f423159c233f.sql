-- Ativar RLS nas tabelas antigas que não têm (com nomes case-sensitive)
ALTER TABLE public."Organizacao_Militar" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Orgao_de_Direcao_Setorial" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anexos ENABLE ROW LEVEL SECURITY;

-- ============================
-- POLÍTICAS PARA Organizacao_Militar (tabela legada)
-- ============================

CREATE POLICY "Todos podem ver Organizacao_Militar"
  ON public."Organizacao_Militar"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins podem inserir Organizacao_Militar"
  ON public."Organizacao_Militar"
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem atualizar Organizacao_Militar"
  ON public."Organizacao_Militar"
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================
-- POLÍTICAS PARA Orgao_de_Direcao_Setorial
-- ============================

CREATE POLICY "Todos podem ver Orgao_de_Direcao_Setorial"
  ON public."Orgao_de_Direcao_Setorial"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins podem inserir Orgao_de_Direcao_Setorial"
  ON public."Orgao_de_Direcao_Setorial"
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem atualizar Orgao_de_Direcao_Setorial"
  ON public."Orgao_de_Direcao_Setorial"
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================
-- POLÍTICAS PARA usuarios
-- ============================

CREATE POLICY "Usuários podem ver próprio perfil"
  ON public.usuarios
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuários podem atualizar próprio perfil"
  ON public.usuarios
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins podem atualizar usuários"
  ON public.usuarios
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================
-- POLÍTICAS PARA anexos
-- ============================

CREATE POLICY "Usuários veem anexos de suas solicitações"
  ON public.anexos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.solicitacoes 
      WHERE id = anexos.solicitacao_id 
      AND (usuario_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Usuários podem inserir anexos em suas solicitações"
  ON public.anexos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.solicitacoes 
      WHERE id = anexos.solicitacao_id 
      AND (usuario_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Usuários podem deletar anexos de suas solicitações"
  ON public.anexos
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.solicitacoes 
      WHERE id = anexos.solicitacao_id 
      AND (usuario_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );