import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

interface NewUserFormProps {
  onSuccess: () => void;
}

const AVAILABLE_ROLES = ['admin', 'user'];
const AVAILABLE_MODULES = ['vistorias', 'projetos', 'fiscalizacao'];

const MODULE_NAMES: Record<string, string> = {
  vistorias: 'Vistorias',
  projetos: 'Projetos',
  fiscalizacao: 'Fiscalização',
};

export const NewUserForm = ({ onSuccess }: NewUserFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['user']);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setFormData({ ...formData, password });
    toast.success('Senha gerada automaticamente');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (selectedRoles.length === 0) {
      toast.error('Selecione pelo menos uma role');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user-direct', {
        body: {
          email: formData.email,
          name: formData.name,
          password: formData.password,
          roles: selectedRoles,
          modules: selectedModules,
        }
      });

      if (error) throw error;
      
      // Verificar se há erro no data retornado
      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success('Usuário criado com sucesso!');
      
      // Resetar form
      setFormData({ name: '', email: '', password: '' });
      setSelectedRoles(['user']);
      setSelectedModules([]);
      
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      toast.error('Erro ao criar usuário: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Novo Usuário
        </CardTitle>
        <CardDescription>
          Cadastre um novo usuário diretamente no sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome do usuário"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha *</Label>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={generatePassword}
                className="h-auto p-0"
              >
                Gerar senha
              </Button>
            </div>
            <Input
              id="password"
              type="text"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Senha para o usuário"
            />
            <p className="text-xs text-muted-foreground">
              Copie esta senha e envie para o usuário de forma segura
            </p>
          </div>

          <div className="space-y-2">
            <Label>Roles *</Label>
            <div className="space-y-2">
              {AVAILABLE_ROLES.map((role) => (
                <div key={role} className="flex items-center space-x-2">
                  <Checkbox
                    id={`new-role-${role}`}
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
                    htmlFor={`new-role-${role}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {role}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Módulos</Label>
            <div className="space-y-2">
              {AVAILABLE_MODULES.map((module) => (
                <div key={module} className="flex items-center space-x-2">
                  <Checkbox
                    id={`new-module-${module}`}
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
                    htmlFor={`new-module-${module}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {MODULE_NAMES[module]}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={creating} className="w-full">
            {creating ? 'Criando...' : 'Criar Usuário'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};