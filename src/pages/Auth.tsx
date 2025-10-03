import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ClipboardCheck, LogIn, UserPlus } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [requestedModules, setRequestedModules] = useState<string[]>(["vistorias"]);
  const [loading, setLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleModuleToggle = (module: string) => {
    setRequestedModules((prev) =>
      prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        toast.success("Login realizado com sucesso!");
      } else {
        // Criar solicitação de cadastro
        if (requestedModules.length === 0) {
          toast.error("Selecione pelo menos um módulo");
          setLoading(false);
          return;
        }

        const { error } = await supabase
          .from('user_registration_requests')
          .insert({
            name: nome,
            email: email,
            requested_modules: requestedModules as any,
          });

        if (error) throw error;
        
        setRequestSent(true);
        toast.success("Solicitação enviada! Aguarde aprovação do administrador.");
        setNome("");
        setEmail("");
        setPassword("");
        setRequestedModules(["vistorias"]);
      }
    } catch (error: any) {
      toast.error(error.message || "Ocorreu um erro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 animate-fade-in">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <ClipboardCheck className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold">
            {isLogin ? "Bem-vindo!" : requestSent ? "Solicitação Enviada" : "Solicitar Acesso"}
          </CardTitle>
          <CardDescription className="text-base">
            {isLogin
              ? "Entre com suas credenciais para continuar"
              : requestSent
              ? "Sua solicitação foi enviada com sucesso"
              : "Preencha os dados e escolha os módulos desejados"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requestSent && !isLogin ? (
            <div className="space-y-4 text-center">
              <div className="p-4 bg-secondary/20 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Sua solicitação de cadastro está aguardando aprovação do administrador.
                  Você receberá um email quando seu acesso for liberado.
                </p>
              </div>
              <Button
                onClick={() => {
                  setRequestSent(false);
                  setIsLogin(true);
                }}
                className="w-full"
              >
                Voltar ao Login
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome Completo</Label>
                      <Input
                        id="nome"
                        type="text"
                        placeholder="Seu nome completo"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        required
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label>Módulos Solicitados</Label>
                      <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="vistorias"
                            checked={requestedModules.includes("vistorias")}
                            onCheckedChange={() => handleModuleToggle("vistorias")}
                          />
                          <label htmlFor="vistorias" className="text-sm font-medium cursor-pointer">
                            Vistorias
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="projetos"
                            checked={requestedModules.includes("projetos")}
                            onCheckedChange={() => handleModuleToggle("projetos")}
                          />
                          <label htmlFor="projetos" className="text-sm font-medium cursor-pointer">
                            Projetos
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="fiscalizacao"
                            checked={requestedModules.includes("fiscalizacao")}
                            onCheckedChange={() => handleModuleToggle("fiscalizacao")}
                          />
                          <label htmlFor="fiscalizacao" className="text-sm font-medium cursor-pointer">
                            Fiscalização de Obras
                          </label>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                {isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-11"
                    />
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold"
                  disabled={loading}
                >
                  {loading ? (
                    "Processando..."
                  ) : (
                    <>
                      {isLogin ? <LogIn className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                      {isLogin ? "Entrar" : "Solicitar Cadastro"}
                    </>
                  )}
                </Button>
              </form>
              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setRequestSent(false);
                  }}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {isLogin ? "Não tem uma conta? " : "Já tem uma conta? "}
                  <span className="font-semibold text-primary">
                    {isLogin ? "Solicite acesso" : "Faça login"}
                  </span>
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
