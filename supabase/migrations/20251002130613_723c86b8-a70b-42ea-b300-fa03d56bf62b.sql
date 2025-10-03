-- Criar ENUMs (apenas se não existirem)
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.app_module AS ENUM ('vistorias', 'projetos', 'fiscalizacao');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tabela de roles dos usuários
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- Tabela de módulos dos usuários
CREATE TABLE IF NOT EXISTS public.user_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    module app_module NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID REFERENCES auth.users(id),
    UNIQUE (user_id, module)
);

-- Tabela de solicitações de cadastro
CREATE TABLE IF NOT EXISTS public.user_registration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    requested_modules app_module[] NOT NULL,
    status approval_status DEFAULT 'pending',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT
);

-- Tabela de logs administrativos
CREATE TABLE IF NOT EXISTS public.admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) NOT NULL,
    action TEXT NOT NULL,
    target_user_id UUID REFERENCES auth.users(id),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Função SECURITY DEFINER para verificar role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função SECURITY DEFINER para verificar acesso a módulo
CREATE OR REPLACE FUNCTION public.has_module_access(_user_id UUID, _module app_module)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_modules
    WHERE user_id = _user_id AND module = _module
  )
$$;

-- Drop policies existentes para recriar
DROP POLICY IF EXISTS "Usuários podem ver suas próprias roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins podem ver todas as roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins podem inserir roles" ON public.user_roles;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios módulos" ON public.user_modules;
DROP POLICY IF EXISTS "Admins podem ver todos os módulos" ON public.user_modules;
DROP POLICY IF EXISTS "Admins podem gerenciar módulos" ON public.user_modules;
DROP POLICY IF EXISTS "Admins podem ver solicitações" ON public.user_registration_requests;
DROP POLICY IF EXISTS "Qualquer um pode criar solicitação" ON public.user_registration_requests;
DROP POLICY IF EXISTS "Admins podem atualizar solicitações" ON public.user_registration_requests;
DROP POLICY IF EXISTS "Admins podem ver logs" ON public.admin_logs;
DROP POLICY IF EXISTS "Sistema pode inserir logs" ON public.admin_logs;

-- Políticas RLS para user_roles
CREATE POLICY "Usuários podem ver suas próprias roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins podem ver todas as roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem inserir roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para user_modules
CREATE POLICY "Usuários podem ver seus próprios módulos"
ON public.user_modules FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins podem ver todos os módulos"
ON public.user_modules FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem gerenciar módulos"
ON public.user_modules FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para registration_requests
CREATE POLICY "Admins podem ver solicitações"
ON public.user_registration_requests FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Qualquer um pode criar solicitação"
ON public.user_registration_requests FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Admins podem atualizar solicitações"
ON public.user_registration_requests FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para admin_logs
CREATE POLICY "Admins podem ver logs"
ON public.admin_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sistema pode inserir logs"
ON public.admin_logs FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));