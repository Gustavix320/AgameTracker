"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

type Modo = "inicio" | "login" | "cadastro";

export default function LoginPage() {
  const router = useRouter();

  const [modo, setModo] = useState<Modo>("inicio");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);

  async function carregarPerfil(userId: string, fallbackNome: string, fallbackEmail: string) {
    const { data: perfil } = await supabase
      .from("profiles")
      .select("id, nome, email, role")
      .eq("id", userId)
      .single();

    if (!perfil) {
      const { data: novoPerfil } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          nome: fallbackNome,
          email: fallbackEmail,
          role: "player",
        })
        .select("id, nome, email, role")
        .single();

      return novoPerfil;
    }

    return perfil;
  }

  async function handleRegister() {
    setMensagem("");
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { nome },
      },
    });

    if (error) {
      setMensagem(
        error.message.includes("User already registered")
          ? "Email já cadastrado."
          : error.message
      );
      setLoading(false);
      return;
    }

    const user = data.user;

    if (user) {
      const perfil = await carregarPerfil(user.id, nome || email, email);

      localStorage.setItem("usuario", perfil?.nome || nome || email);
      localStorage.setItem("perfilRole", perfil?.role || "player");
      localStorage.setItem("userId", user.id);
    }

    router.push("/dashboard");
  }

  async function handleLogin() {
    setMensagem("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setMensagem(error.message);
      setLoading(false);
      return;
    }

    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) {
      setMensagem("Erro ao carregar usuário.");
      setLoading(false);
      return;
    }

    const nomeUsuario = user.user_metadata?.nome || email;
    const perfil = await carregarPerfil(user.id, nomeUsuario, email);

    localStorage.setItem("usuario", perfil?.nome || nomeUsuario);
    localStorage.setItem("perfilRole", perfil?.role || "player");
    localStorage.setItem("userId", user.id);

    if (perfil?.role === "admin") {
      localStorage.setItem("perfilRole", "admin");
      router.push("/admin");
      return;
    }

    if (perfil?.role === "financeiro") {
      localStorage.setItem("perfilRole", "financeiro");
      router.push("/financeiro");
      return;
    }

    localStorage.setItem("perfilRole", "player");
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="bg-zinc-900 p-8 rounded-2xl w-full max-w-md border border-zinc-800">
        <h1 className="text-3xl font-bold text-white mb-6">
          Tracker de Resultados
        </h1>

        {mensagem && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 p-3 text-sm">
            {mensagem}
          </div>
        )}

        {modo === "inicio" && (
          <div className="space-y-4">
            <button
              onClick={() => setModo("login")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-bold"
            >
              Entrar
            </button>

            <button
              onClick={() => setModo("cadastro")}
              className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg font-bold"
            >
              Criar Conta
            </button>
          </div>
        )}

        {modo === "login" && (
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full p-3 rounded-lg bg-zinc-800 text-white outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Senha"
              className="w-full p-3 rounded-lg bg-zinc-800 text-white outline-none"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-3 rounded-lg font-bold"
            >
              {loading ? "Carregando..." : "Entrar"}
            </button>

            <button
              onClick={() => setModo("inicio")}
              className="w-full bg-zinc-700 hover:bg-zinc-600 text-white p-3 rounded-lg"
            >
              Voltar
            </button>
          </div>
        )}

        {modo === "cadastro" && (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Nome de usuário"
              className="w-full p-3 rounded-lg bg-zinc-800 text-white outline-none"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />

            <input
              type="email"
              placeholder="Email"
              className="w-full p-3 rounded-lg bg-zinc-800 text-white outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Senha"
              className="w-full p-3 rounded-lg bg-zinc-800 text-white outline-none"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />

            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white p-3 rounded-lg font-bold"
            >
              {loading ? "Carregando..." : "Criar Conta"}
            </button>

            <button
              onClick={() => setModo("inicio")}
              className="w-full bg-zinc-700 hover:bg-zinc-600 text-white p-3 rounded-lg"
            >
              Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}