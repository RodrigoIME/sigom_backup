import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Users, Edit } from "lucide-react";

interface SystemUser {
  id: string;
  email: string;
  created_at: string;
  roles: string[];
  modules: string[];
}

interface UsersListProps {
  users: SystemUser[];
  onUpdate: () => void;
}

const AVAILABLE_ROLES = ['admin', 'user'];
const AVAILABLE_MODULES = ['vistorias', 'projetos', 'fiscalizacao'];

const MODULE_NAMES: Record<string, string> = {
  vistorias: 'Vistorias',
  projetos: 'Projetos',
  fiscalizacao: 'Fiscalização',
};

export const UsersList = ({ users, onUpdate }: UsersListProps) => {
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);

  const handleEditUser = (user: SystemUser) => {
    setSelectedUser(user);
    setSelectedRoles(user.roles);
    setSelectedModules(user.modules);
    setEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    setUpdating(true);
    try {
      const currentUser = await supabase.auth.getUser();
      
      // Deletar roles existentes
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedUser.id);

      // Inserir novas roles
      const roleInserts = selectedRoles.map(role => ({
        user_id: selectedUser.id,
        role: role as 'admin' | 'user'
      }));
      
      if (roleInserts.length > 0) {
        await supabase
          .from('user_roles')
          .insert(roleInserts);
      }

      // Deletar módulos existentes
      await supabase
        .from('user_modules')
        .delete()
        .eq('user_id', selectedUser.id);

      // Inserir novos módulos
      const moduleInserts = selectedModules.map(module => ({
        user_id: selectedUser.id,
        module: module as 'vistorias' | 'projetos' | 'fiscalizacao',
        granted_by: currentUser.data.user?.id
      }));
      
      if (moduleInserts.length > 0) {
        await supabase
          .from('user_modules')
          .insert(moduleInserts);
      }

      // Log da ação
      await supabase.from('admin_logs').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        target_user_id: selectedUser.id,
        action: 'Edição de roles/módulos',
        details: {
          email: selectedUser.email,
          new_roles: selectedRoles,
          new_modules: selectedModules,
        }
      });

      toast.success('Usuário atualizado com sucesso!');
      setEditDialogOpen(false);
      onUpdate();
    } catch (error: any) {
      console.error('Erro ao atualizar usuário:', error);
      toast.error('Erro ao atualizar usuário: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuários do Sistema
          </CardTitle>
          <CardDescription>
            Total de {users.length} usuário(s) cadastrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Cadastrado em</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Módulos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {user.roles.map((role) => (
                        <Badge key={role} variant={role === 'admin' ? 'default' : 'secondary'}>
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {user.modules.map((module) => (
                        <Badge key={module} variant="outline">
                          {MODULE_NAMES[module] || module}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditUser(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Roles</Label>
              <div className="space-y-2">
                {AVAILABLE_ROLES.map((role) => (
                  <div key={role} className="flex items-center space-x-2">
                    <Checkbox
                      id={`role-${role}`}
                      checked={selectedRoles.includes(role)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRoles([...selectedRoles, role]);
                        } else {
                          setSelectedRoles(selectedRoles.filter(r => r !== role));
                        }
                      }}
                    />
                    <label
                      htmlFor={`role-${role}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {role}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Módulos</Label>
              <div className="space-y-2">
                {AVAILABLE_MODULES.map((module) => (
                  <div key={module} className="flex items-center space-x-2">
                    <Checkbox
                      id={`module-${module}`}
                      checked={selectedModules.includes(module)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedModules([...selectedModules, module]);
                        } else {
                          setSelectedModules(selectedModules.filter(m => m !== module));
                        }
                      }}
                    />
                    <label
                      htmlFor={`module-${module}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {MODULE_NAMES[module]}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateUser} disabled={updating}>
              {updating ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};