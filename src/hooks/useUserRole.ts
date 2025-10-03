import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'user';
export type AppModule = 'vistorias' | 'projetos' | 'fiscalizacao';

interface UserRoleData {
  roles: AppRole[];
  modules: AppModule[];
  isAdmin: boolean;
  hasModule: (module: AppModule) => boolean;
  loading: boolean;
}

export const useUserRole = (user: User | null): UserRoleData => {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [modules, setModules] = useState<AppModule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      console.log('[useUserRole] Nenhum usuário autenticado');
      setRoles([]);
      setModules([]);
      setLoading(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        console.log('[useUserRole] Buscando dados para usuário:', user.id, user.email);
        
        // Buscar roles
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (rolesError) {
          console.error('[useUserRole] Erro ao buscar roles:', rolesError);
        } else {
          console.log('[useUserRole] Roles encontradas:', rolesData);
        }

        // Buscar módulos
        const { data: modulesData, error: modulesError } = await supabase
          .from('user_modules')
          .select('module')
          .eq('user_id', user.id);

        if (modulesError) {
          console.error('[useUserRole] Erro ao buscar módulos:', modulesError);
        } else {
          console.log('[useUserRole] Módulos encontrados:', modulesData);
        }

        const fetchedRoles = rolesData?.map(r => r.role as AppRole) || [];
        const fetchedModules = modulesData?.map(m => m.module as AppModule) || [];
        
        console.log('[useUserRole] Roles processadas:', fetchedRoles);
        console.log('[useUserRole] Módulos processados:', fetchedModules);
        console.log('[useUserRole] É admin?', fetchedRoles.includes('admin'));

        setRoles(fetchedRoles);
        setModules(fetchedModules);
      } catch (error) {
        console.error('[useUserRole] Erro crítico ao buscar dados do usuário:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const hasModule = (module: AppModule) => modules.includes(module);
  const isAdmin = roles.includes('admin');

  return { roles, modules, isAdmin, hasModule, loading };
};
