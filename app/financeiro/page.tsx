"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Reload = {
  id: string;
  user_id: string;
  app: string;
  account_name: string;
  current_balance: number;
  requested_amount: number;
  status: string;
  source: string;
  created_at: string;
  reviewed_at?: string;
};

type Profile = {
  id: string;
  nome: string;
  role: string;
};

type Finance = {
  user_id: string;
  makeup: number;
  min_bankroll_per_account: number;
};

type BankrollUpdate = {
  id: string;
  user_id: string;
  update_date: string;
  total_balance: number;
  created_at: string;
};

type WeeklyClosing = {
  id: string;
  user_id: string;
  week_label: string;
  started_at: string;
  closed_at: string;
  total_reload: number;
  total_balance: number;
  makeup_before: number;
  makeup_after: number;
  player_profit: number;
  player_share: number;
  status: string;
};

type FinanceLog = {
  id: string;
  user_id: string;
  player_name: string;
  type: string;
  action: string;
  amount: number;
  description: string;
  reload_id: string | null;
  related_log_id: string | null;
  created_at: string;
};

type GrupoReload = {
  user_id: string;
  nome: string;
  total: number;
  quantidade: number;
  reloads: Reload[];
};

export default function FinanceiroPage() {
  const [reloads, setReloads] = useState<Reload[]>([]);
  const [reloadsAceitos, setReloadsAceitos] = useState<Reload[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [finances, setFinances] = useState<Finance[]>([]);
  const [bankrollUpdates, setBankrollUpdates] = useState<BankrollUpdate[]>([]);
  const [weeklyClosings, setWeeklyClosings] = useState<WeeklyClosing[]>([]);
  const [logsFinanceiros, setLogsFinanceiros] = useState<FinanceLog[]>([]);
  const [abertos, setAbertos] = useState<string[]>([]);
  const [mostrarRelatorio, setMostrarRelatorio] = useState(false);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [jogadorRelatorio, setJogadorRelatorio] = useState<string | null>(null);
  const [usuario, setUsuario] = useState("Financeiro");
const [fotoPerfil, setFotoPerfil] = useState("");
const [menuPerfilAberto, setMenuPerfilAberto] = useState(false);
const [editandoPerfil, setEditandoPerfil] = useState<null | "nome" | "email" | "senha" | "foto">(null);
const [novoNome, setNovoNome] = useState("");
const [novoEmail, setNovoEmail] = useState("");
const [novaSenha, setNovaSenha] = useState("");

  useEffect(() => {
    async function carregar() {
      const role = localStorage.getItem("perfilRole");
      const nome = localStorage.getItem("usuario") || "Financeiro";
        const foto = localStorage.getItem("fotoPerfil") || "";

        setUsuario(nome);
        setNovoNome(nome);
        setFotoPerfil(foto);

      if (role !== "financeiro" && role !== "admin") {
        window.location.href = "/dashboard";
        return;
      }

      await carregarTudo();
    }

    carregar();
  }, []);

  async function carregarTudo() {
    const profilesData = await carregarProfiles();
    await garantirFinanceDosPlayers(profilesData);

    await Promise.all([
      carregarReloadsPendentes(),
      carregarReloadsAceitos(),
      carregarFinances(),
      carregarBankrollUpdates(),
      carregarWeeklyClosings(),
      carregarLogsFinanceiros(),
    ]);
  }

  async function salvarNome() {
  localStorage.setItem("usuario", novoNome);
  setUsuario(novoNome);

  await supabase.auth.updateUser({
    data: { nome: novoNome },
  });

  setEditandoPerfil(null);
}

async function salvarEmail() {
  if (!novoEmail) return;

  const { error } = await supabase.auth.updateUser({
    email: novoEmail,
  });

  if (error) {
    alert(error.message);
    return;
  }

  alert("Email atualizado. Talvez seja necessário confirmar pelo email.");
  setEditandoPerfil(null);
}

async function salvarSenha() {
  if (!novaSenha) return;

  const { error } = await supabase.auth.updateUser({
    password: novaSenha,
  });

  if (error) {
    alert(error.message);
    return;
  }

  alert("Senha atualizada com sucesso.");
  setNovaSenha("");
  setEditandoPerfil(null);
}

function salvarFoto(file: File | null) {
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (event) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX_WIDTH = 200;
      const scale = MAX_WIDTH / img.width;

      canvas.width = MAX_WIDTH;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const compressedBase64 = canvas.toDataURL("image/jpeg", 0.6);

      try {
        localStorage.setItem("fotoPerfil", compressedBase64);
        setFotoPerfil(compressedBase64);
        setEditandoPerfil(null);
      } catch {
        alert("Imagem muito grande. Escolha outra menor.");
      }
    };

    img.src = String(event.target?.result);
  };

  reader.readAsDataURL(file);
    }

    async function sairConta() {
    localStorage.clear();
    await supabase.auth.signOut();
    window.location.href = "/login";
}

  async function carregarProfiles() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, nome, role")
      .in("role", ["player", "admin"])
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar profiles:", error);
      alert("Erro ao carregar jogadores.");
      return [];
    }

    setProfiles((data || []) as Profile[]);
    return (data || []) as Profile[];
  }

  async function garantirFinanceDosPlayers(players: Profile[]) {
    const playersOnly = players.filter((p) => p.role === "player");

    if (playersOnly.length === 0) return;

    const linhas = playersOnly.map((player) => ({
      user_id: player.id,
      makeup: 0,
      min_bankroll_per_account: 1000,
    }));

    const { error } = await supabase.from("player_finance").upsert(linhas, {
      onConflict: "user_id",
      ignoreDuplicates: true,
    });

    if (error) console.error("Erro ao garantir financeiro dos players:", error);
  }

  async function carregarReloadsPendentes() {
    const { data, error } = await supabase
      .from("reload_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar reloads:", error);
      alert("Erro ao carregar reloads.");
      return;
    }

    setReloads((data || []) as Reload[]);
  }

  async function carregarReloadsAceitos() {
    const { data, error } = await supabase
      .from("reload_requests")
      .select("*")
      .eq("status", "accepted")
      .order("reviewed_at", { ascending: true });

    if (error) {
      console.error("Erro ao carregar reloads aceitos:", error);
      return;
    }

    setReloadsAceitos((data || []) as Reload[]);
  }

  async function carregarFinances() {
    const { data, error } = await supabase.from("player_finance").select("*");

    if (error) {
      console.error("Erro ao carregar financeiro:", error);
      return;
    }

    setFinances((data || []) as Finance[]);
  }

  async function carregarBankrollUpdates() {
    const { data, error } = await supabase
      .from("bankroll_updates")
      .select("*")
      .order("update_date", { ascending: true });

    if (error) {
      console.error("Erro ao carregar bankroll updates:", error);
      return;
    }

    setBankrollUpdates((data || []) as BankrollUpdate[]);
  }

  async function carregarWeeklyClosings() {
    const { data, error } = await supabase
      .from("weekly_closings")
      .select("*")
      .eq("status", "closed")
      .order("closed_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar fechamentos:", error);
      return;
    }

    setWeeklyClosings((data || []) as WeeklyClosing[]);
  }

  async function carregarLogsFinanceiros() {
    const { data, error } = await supabase
      .from("financial_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar histórico financeiro:", error);
      return;
    }

    setLogsFinanceiros((data || []) as FinanceLog[]);
  }

  function numero(valor: any) {
    const convertido = Number(String(valor || 0).replace(",", "."));
    return Number.isFinite(convertido) ? convertido : 0;
  }

  function moeda(valor: number) {
    return Number(valor || 0).toFixed(2).replace(".", ",");
  }

  function dataHora(dataISO: string) {
    return new Date(dataISO).toLocaleString("pt-BR");
  }

  function nomeJogador(userId: string) {
    return profiles.find((p) => p.id === userId)?.nome || "Jogador";
  }

  function financeDoJogador(userId: string) {
    return finances.find((f) => f.user_id === userId);
  }

  function alternarGrupo(userId: string) {
    setAbertos((atual) =>
      atual.includes(userId)
        ? atual.filter((id) => id !== userId)
        : [...atual, userId]
    );
  }

  async function registrarLogFinanceiro({
    userId,
    type,
    action,
    amount,
    description,
    reloadId,
    relatedLogId,
  }: {
    userId: string;
    type: string;
    action: string;
    amount: number;
    description: string;
    reloadId?: string | null;
    relatedLogId?: string | null;
  }) {
    const { data: userData } = await supabase.auth.getUser();

    await supabase.from("financial_logs").insert({
      user_id: userId,
      player_name: nomeJogador(userId),
      type,
      action,
      amount,
      description,
      reload_id: reloadId || null,
      related_log_id: relatedLogId || null,
      created_by: userData.user?.id || null,
    });
  }

  async function aceitarReload(reload: Reload) {
    const confirmar = confirm(
      `Aceitar reload de R$ ${moeda(reload.requested_amount)} para ${reload.account_name}?`
    );

    if (!confirmar) return;

    const finance = financeDoJogador(reload.user_id);
    const makeupAtual = numero(finance?.makeup);
    const novoMakeup = makeupAtual - numero(reload.requested_amount);

    const { error: financeError } = await supabase.from("player_finance").upsert({
      user_id: reload.user_id,
      makeup: novoMakeup,
      min_bankroll_per_account:
        numero(finance?.min_bankroll_per_account) || 1000,
    });

    if (financeError) {
      console.error("Erro ao atualizar makeup:", financeError);
      alert("Erro ao atualizar makeup.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("reload_requests")
      .update({
        status: "accepted",
        reviewed_by: userData.user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", reload.id);

    if (error) {
      console.error("Erro ao aceitar reload:", error);
      alert("Erro ao aceitar reload.");
      return;
    }

    await registrarLogFinanceiro({
      userId: reload.user_id,
      type: "reload",
      action: "reload_accepted",
      amount: numero(reload.requested_amount),
      reloadId: reload.id,
      description: `Reload enviado de R$ ${moeda(
        reload.requested_amount
      )} para ${nomeJogador(reload.user_id)} - Conta ${reload.account_name}`,
    });

    await carregarTudo();
  }

  async function recusarReload(reload: Reload) {
    const confirmar = confirm(`Recusar reload de ${reload.account_name}?`);
    if (!confirmar) return;

    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("reload_requests")
      .update({
        status: "rejected",
        reviewed_by: userData.user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", reload.id);

    if (error) {
      console.error("Erro ao recusar reload:", error);
      alert("Erro ao recusar reload.");
      return;
    }

    await registrarLogFinanceiro({
      userId: reload.user_id,
      type: "reload",
      action: "reload_rejected",
      amount: numero(reload.requested_amount),
      reloadId: reload.id,
      description: `Reload recusado de R$ ${moeda(
        reload.requested_amount
      )} para ${nomeJogador(reload.user_id)} - Conta ${reload.account_name}`,
    });

    await carregarTudo();
  }

  async function desfazerLog(log: FinanceLog) {
    if (!log.reload_id) {
      alert("Esse log não possui reload vinculado.");
      return;
    }

    const confirmar = confirm(`Desfazer ação?\n\n${log.description}`);
    if (!confirmar) return;

    if (log.action === "reload_accepted") {
      const finance = financeDoJogador(log.user_id);
      const makeupAtual = numero(finance?.makeup);
      const novoMakeup = makeupAtual + numero(log.amount);

      const { error: financeError } = await supabase.from("player_finance").upsert({
        user_id: log.user_id,
        makeup: novoMakeup,
        min_bankroll_per_account:
          numero(finance?.min_bankroll_per_account) || 1000,
      });

      if (financeError) {
        console.error("Erro ao desfazer makeup:", financeError);
        alert("Erro ao desfazer makeup.");
        return;
      }

      const { error: reloadError } = await supabase
        .from("reload_requests")
        .update({
          status: "pending",
          reviewed_by: null,
          reviewed_at: null,
        })
        .eq("id", log.reload_id);

      if (reloadError) {
        console.error("Erro ao desfazer reload:", reloadError);
        alert("Erro ao desfazer reload.");
        return;
      }

      await registrarLogFinanceiro({
        userId: log.user_id,
        type: "reload",
        action: "reload_undo",
        amount: numero(log.amount),
        reloadId: log.reload_id,
        relatedLogId: log.id,
        description: `Reload desfeito de R$ ${moeda(log.amount)} para ${
          log.player_name
        }`,
      });
    }

    if (log.action === "reload_rejected") {
      const { error: reloadError } = await supabase
        .from("reload_requests")
        .update({
          status: "pending",
          reviewed_by: null,
          reviewed_at: null,
        })
        .eq("id", log.reload_id);

      if (reloadError) {
        console.error("Erro ao desfazer recusa:", reloadError);
        alert("Erro ao desfazer recusa.");
        return;
      }

      await registrarLogFinanceiro({
        userId: log.user_id,
        type: "reload",
        action: "reload_undo",
        amount: numero(log.amount),
        reloadId: log.reload_id,
        relatedLogId: log.id,
        description: `Recusa de reload desfeita de R$ ${moeda(log.amount)} para ${
          log.player_name
        }`,
      });
    }

    await carregarTudo();
  }

  async function editarBancaMinima(userId: string) {
    const finance = financeDoJogador(userId);

    const valorTexto = prompt(
      `Nova banca mínima para ${nomeJogador(userId)}:`,
      String(finance?.min_bankroll_per_account || 1000)
    );

    if (!valorTexto) return;

    const valor = numero(valorTexto);

    if (valor <= 0) {
      alert("Valor inválido.");
      return;
    }

    const { error } = await supabase.from("player_finance").upsert({
      user_id: userId,
      min_bankroll_per_account: valor,
      makeup: numero(finance?.makeup),
    });

    if (error) {
      console.error("Erro ao atualizar banca mínima:", error);
      alert("Erro ao atualizar banca mínima.");
      return;
    }

    await carregarFinances();
  }

  const players = profiles.filter((p) => p.role === "player");

  const grupos: GrupoReload[] = Object.values(
    reloads.reduce((acc, reload) => {
      if (!acc[reload.user_id]) {
        acc[reload.user_id] = {
          user_id: reload.user_id,
          nome: nomeJogador(reload.user_id),
          total: 0,
          quantidade: 0,
          reloads: [],
        };
      }

      acc[reload.user_id].total += numero(reload.requested_amount);
      acc[reload.user_id].quantidade += 1;
      acc[reload.user_id].reloads.push(reload);

      return acc;
    }, {} as Record<string, GrupoReload>)
  );

  const logsDesfeitos = new Set(
    logsFinanceiros
      .filter((log) => log.related_log_id)
      .map((log) => log.related_log_id)
  );

  const totalReloadPendente = reloads.reduce(
    (acc, r) => acc + numero(r.requested_amount),
    0
  );

  const totalMakeup = finances.reduce((acc, f) => acc + numero(f.makeup), 0);

  const ultimoSaldoTime =
    bankrollUpdates.length > 0
      ? numero(bankrollUpdates[bankrollUpdates.length - 1].total_balance)
      : 0;

  const totalReloadAceitoSemanaAberta = reloadsAceitos.reduce(
    (acc, reload) => acc + numero(reload.requested_amount),
    0
  );

  const saldoSemana =
    weeklyClosings.length > 0
      ? numero(weeklyClosings[0].player_profit) -
        totalReloadAceitoSemanaAberta
      : totalReloadAceitoSemanaAberta * -1;

  const saldoMes =
    weeklyClosings.reduce((acc, fechamento) => {
      const fechadoEm = fechamento.closed_at
        ? new Date(fechamento.closed_at)
        : null;

      const hoje = new Date();

      if (
        fechadoEm &&
        fechadoEm.getFullYear() === hoje.getFullYear() &&
        fechadoEm.getMonth() === hoje.getMonth()
      ) {
        return acc + numero(fechamento.player_profit);
      }

      return acc;
    }, 0) - totalReloadAceitoSemanaAberta;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-zinc-500 text-sm">Controle Financeiro</p>
          <h1 className="text-4xl font-bold">Painel Financeiro Agame</h1>
        </div>

        <div className="relative">
  <button
    onClick={() => setMenuPerfilAberto(!menuPerfilAberto)}
    className="w-14 h-14 rounded-full overflow-hidden border-2 border-zinc-700 hover:border-blue-500 transition"
  >
    <img
      src={
        fotoPerfil ||
        `https://ui-avatars.com/api/?name=${usuario}&background=2563eb&color=fff`
      }
      alt="Perfil"
      className="w-full h-full object-cover"
    />
  </button>

    {menuPerfilAberto && (
        <div className="absolute right-0 mt-3 w-72 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-5 z-50">
        <div className="flex flex-col items-center mb-5">
            <img
            src={
                fotoPerfil ||
                `https://ui-avatars.com/api/?name=${usuario}&background=2563eb&color=fff`
            }
            alt="Perfil"
            className="w-24 h-24 rounded-full border-4 border-blue-600 object-cover"
            />

            <h2 className="text-2xl font-bold mt-3">{usuario}</h2>
            <p className="text-zinc-500 text-sm">Conta financeira</p>
        </div>

        <div className="space-y-3">
            <button
            onClick={() => setEditandoPerfil("nome")}
            className="w-full bg-zinc-800 hover:bg-zinc-700 p-3 rounded-xl text-left transition"
            >
            Alterar nome
            </button>

            {editandoPerfil === "nome" && (
            <div className="space-y-2">
                <input
                className="w-full bg-zinc-950 p-3 rounded-xl outline-none"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Novo nome"
                />
                <button
                onClick={salvarNome}
                className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded-xl font-bold"
                >
                Salvar nome
                </button>
            </div>
            )}

            <button
            onClick={() => setEditandoPerfil("email")}
            className="w-full bg-zinc-800 hover:bg-zinc-700 p-3 rounded-xl text-left transition"
            >
            Alterar email
            </button>

            {editandoPerfil === "email" && (
            <div className="space-y-2">
                <input
                className="w-full bg-zinc-950 p-3 rounded-xl outline-none"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                placeholder="Novo email"
                />
                <button
                onClick={salvarEmail}
                className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded-xl font-bold"
                >
                Salvar email
                </button>
            </div>
            )}

            <button
            onClick={() => setEditandoPerfil("senha")}
            className="w-full bg-zinc-800 hover:bg-zinc-700 p-3 rounded-xl text-left transition"
            >
            Alterar senha
            </button>

            {editandoPerfil === "senha" && (
            <div className="space-y-2">
                <input
                type="password"
                className="w-full bg-zinc-950 p-3 rounded-xl outline-none"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Nova senha"
                />
                <button
                onClick={salvarSenha}
                className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded-xl font-bold"
                >
                Salvar senha
                </button>
            </div>
            )}

            <button
            onClick={() => setEditandoPerfil("foto")}
            className="w-full bg-zinc-800 hover:bg-zinc-700 p-3 rounded-xl text-left transition"
            >
            Alterar imagem
            </button>

            {editandoPerfil === "foto" && (
            <input
                type="file"
                accept="image/*"
                className="w-full bg-zinc-950 p-3 rounded-xl"
                onChange={(e) => salvarFoto(e.target.files?.[0] || null)}
            />
            )}

            <button
            onClick={sairConta}
            className="w-full bg-red-600 hover:bg-red-700 p-3 rounded-xl font-bold transition"
            >
            Sair da conta
            </button>
        </div>
        </div>
    )}
    </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6">
        <h2 className="text-2xl font-bold mb-4">Reloads por Jogador</h2>

        {grupos.length === 0 && (
          <p className="text-zinc-500">Nenhum reload pendente.</p>
        )}

        <div className="space-y-3">
          {grupos.map((grupo) => {
            const aberto = abertos.includes(grupo.user_id);

            return (
              <div
                key={grupo.user_id}
                className="bg-zinc-950 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => alternarGrupo(grupo.user_id)}
                  className="w-full grid grid-cols-5 gap-4 items-center p-4 hover:bg-zinc-800 transition text-left"
                >
                  <p className="font-bold">{grupo.nome}</p>
                  <p>{grupo.quantidade} contas</p>
                  <p className="text-yellow-400 font-bold">
                    R$ {moeda(grupo.total)}
                  </p>
                  <p className="text-zinc-400">
                    {aberto ? "Recolher ▲" : "Expandir ▼"}
                  </p>
                  <p className="text-right text-zinc-500">pendente</p>
                </button>

                {aberto && (
                  <div className="border-t border-zinc-800 p-4 space-y-3">
                    {grupo.reloads.map((reload) => (
                      <div
                        key={reload.id}
                        className="grid grid-cols-7 gap-3 items-center bg-zinc-900 p-3 rounded-xl"
                      >
                        <p className="font-bold">{reload.account_name}</p>
                        <p>{reload.app}</p>
                        <p className="text-red-400">
                          Saldo R$ {moeda(reload.current_balance)}
                        </p>
                        <p className="text-yellow-400 font-bold">
                          Reload R$ {moeda(reload.requested_amount)}
                        </p>
                        <p className="text-zinc-400">{reload.source}</p>

                        <button
                          onClick={() => aceitarReload(reload)}
                          className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg font-bold"
                        >
                          Aceitar
                        </button>

                        <button
                          onClick={() => recusarReload(reload)}
                          className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg font-bold"
                        >
                          Recusar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-2xl font-bold mb-4">Makeup dos Jogadores</h2>

          <div className="space-y-3">
            {players.map((player) => {
              const finance = financeDoJogador(player.id);
              const makeup = numero(finance?.makeup);

              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl"
                >
                  <p className="font-bold">{player.nome}</p>
                  <p
                    className={
                      makeup < 0
                        ? "text-red-400 font-bold"
                        : "text-green-400 font-bold"
                    }
                  >
                    R$ {moeda(makeup)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-2xl font-bold mb-4">Banca Mínima</h2>

          <div className="space-y-3">
            {players.map((player) => {
              const finance = financeDoJogador(player.id);
              const banca = numero(finance?.min_bankroll_per_account) || 1000;

              return (
                <div
                  key={player.id}
                  className="grid grid-cols-3 gap-3 items-center bg-zinc-950 p-3 rounded-xl"
                >
                  <p className="font-bold">{player.nome}</p>
                  <p className="text-blue-400 font-bold">
                    R$ {moeda(banca)}
                  </p>

                  <button
                    onClick={() => editarBancaMinima(player.id)}
                    className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg font-bold"
                  >
                    Editar
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Relatório financeiro</h2>

            <button
              onClick={() => setMostrarRelatorio(!mostrarRelatorio)}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl font-bold"
            >
              Gerar Relatório
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 mb-5">
            <Card titulo="Reload pendente total" valor={`R$ ${moeda(totalReloadPendente)}`} />
            <Card titulo="Saldo da semana" valor={`R$ ${moeda(saldoSemana)}`} />
            <Card titulo="Saldo do mês até hoje" valor={`R$ ${moeda(saldoMes)}`} />
            <Card titulo="Última banca total informada" valor={`R$ ${moeda(ultimoSaldoTime)}`} />
            <Card titulo="Makeup total do time" valor={`R$ ${moeda(totalMakeup)}`} />
            <Card titulo="Jogadores com reload" valor={grupos.length} />
          </div>

          {mostrarRelatorio && (
            <div className="bg-zinc-950 rounded-xl p-4 mt-5">
              <h3 className="text-lg font-bold mb-3">Selecionar jogador</h3>

              <div className="grid grid-cols-2 gap-3 mb-5">
                {players.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => setJogadorRelatorio(player.id)}
                    className={`p-3 rounded-xl font-bold ${
                      jogadorRelatorio === player.id
                        ? "bg-green-600"
                        : "bg-zinc-800 hover:bg-zinc-700"
                    }`}
                  >
                    {player.nome}
                  </button>
                ))}
              </div>

              {jogadorRelatorio && (
                <div>
                  <h3 className="text-lg font-bold mb-3">Semanas disponíveis</h3>

                  <div className="space-y-2">
                    {weeklyClosings
                      .filter((semana) => semana.user_id === jogadorRelatorio)
                      .slice(0, 3)
                      .map((semana) => (
                        <button
                          key={semana.id}
                          onClick={() => {
                            alert(
                              `Gerar relatório de ${nomeJogador(
                                semana.user_id
                              )}\n${semana.week_label}`
                            );
                          }}
                          className="w-full bg-zinc-900 hover:bg-zinc-800 p-3 rounded-xl flex items-center justify-between"
                        >
                          <span>{semana.week_label}</span>

                          <span
                            className={
                              numero(semana.player_profit) >= 0
                                ? "text-green-400 font-bold"
                                : "text-red-400 font-bold"
                            }
                          >
                            R$ {moeda(numero(semana.player_profit))}
                          </span>
                        </button>
                      ))}

                    {weeklyClosings.filter(
                      (semana) => semana.user_id === jogadorRelatorio
                    ).length === 0 && (
                      <p className="text-zinc-500">
                        Esse jogador ainda não possui semanas fechadas.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-zinc-500 text-sm">Auditoria financeira</p>
            <h2 className="text-2xl font-bold">Histórico de reloads e sangrias</h2>
          </div>

          <button
            onClick={() => setMostrarHistorico(!mostrarHistorico)}
            className="bg-purple-600 hover:bg-purple-700 px-5 py-3 rounded-xl font-bold"
          >
            {mostrarHistorico ? "Ocultar histórico" : "Ver histórico"}
          </button>
        </div>

        {mostrarHistorico && (
          <div className="mt-5 bg-black border border-zinc-800 rounded-2xl p-5 max-h-[420px] overflow-y-auto">
            {logsFinanceiros.length === 0 && (
              <p className="text-zinc-500">Nenhum log financeiro ainda.</p>
            )}

            <div className="space-y-3 font-mono text-sm">
              {logsFinanceiros.map((log) => {
                const podeDesfazer =
                  (log.action === "reload_accepted" ||
                    log.action === "reload_rejected") &&
                  !logsDesfeitos.has(log.id);

                return (
                  <div
                    key={log.id}
                    className="grid grid-cols-[180px_1fr_120px] gap-3 items-center bg-zinc-950 border border-zinc-800 rounded-xl p-3"
                  >
                    <p className="text-zinc-500">{dataHora(log.created_at)}</p>

                    <p
                      className={
                        log.action === "reload_undo"
                          ? "text-yellow-400"
                          : log.action === "reload_rejected"
                          ? "text-red-400"
                          : "text-green-400"
                      }
                    >
                      {">"} {log.description}
                    </p>

                    {podeDesfazer ? (
                      <button
                        onClick={() => desfazerLog(log)}
                        className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg font-bold"
                      >
                        Desfazer
                      </button>
                    ) : (
                      <span className="text-zinc-600 text-right">
                        {logsDesfeitos.has(log.id) ? "desfeito" : "-"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ titulo, valor }: { titulo: string; valor: string | number }) {
  return (
    <div className="bg-zinc-950 p-4 rounded-xl">
      <p className="text-zinc-500 text-sm">{titulo}</p>
      <p className="text-xl font-bold mt-1">{valor}</p>
    </div>
  );
}