-- Atribuir role 'admin' ao usuário existente
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'contatorodrigoscosta@gmail.com'
ON CONFLICT DO NOTHING;

-- Atribuir role 'user' também (para garantir acesso padrão)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user'::app_role
FROM auth.users
WHERE email = 'contatorodrigoscosta@gmail.com'
ON CONFLICT DO NOTHING;

-- Atribuir módulo 'vistorias'
INSERT INTO public.user_modules (user_id, module)
SELECT id, 'vistorias'::app_module
FROM auth.users
WHERE email = 'contatorodrigoscosta@gmail.com'
ON CONFLICT DO NOTHING;

-- Atribuir módulo 'projetos'
INSERT INTO public.user_modules (user_id, module)
SELECT id, 'projetos'::app_module
FROM auth.users
WHERE email = 'contatorodrigoscosta@gmail.com'
ON CONFLICT DO NOTHING;

-- Atribuir módulo 'fiscalizacao'
INSERT INTO public.user_modules (user_id, module)
SELECT id, 'fiscalizacao'::app_module
FROM auth.users
WHERE email = 'contatorodrigoscosta@gmail.com'
ON CONFLICT DO NOTHING;