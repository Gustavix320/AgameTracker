"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type AppPoker = "PPP" | "Suprema";

type Conta = {
  id: string;
  app: AppPoker;
  account_name: string;
  active: boolean;
};

type Reload = {
  id: string;
  app: AppPoker;
  account_name: string;
  requested_amount: number;
  status: string;
  source: string;
};

export default function BancaPage() {
  const [usuario, setUsuario] = useState("Jogador");
  const [userId, setUserId] = useState("");
  const [contas, setContas] = useState<Conta[]>([]);
  const [reloads, setReloads] = useState<Reload[]>([]);
  const [dataBanca, setDataBanca] = useState(new Date().toISOString().split("T")[0]);
  const [appNovaConta, setAppNovaConta] = useState<AppPoker>("PPP");
  const [nomeNovaConta, setNomeNovaConta] = useState("");
  const [saldos, setSaldos] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<string[]>([]);
  const [makeup, setMakeup] = useState(0);
  const [bancaMinima, setBancaMinima] = useState(1000);

  useEffect(() => {
    async function carregar() {
      const nome = localStorage.getItem("usuario") || "Jogador";
      setUsuario(nome);

      const { data: userData, error } = await supabase.auth.getUser();

      if (error || !userData.user) {
        window.location.href = "/login";
        return;
      }

      setUserId(userData.user.id);

      await garantirFinanceiro(userData.user.id);
      await garantirSemanaAberta(userData.user.id);
      await carregarFinanceiro(userData.user.id);
      await carregarContas(userData.user.id);
      await carregarReloads(userData.user.id);
    }

    carregar();
  }, []);

  function numero(valor: any) {
    const convertido = Number(String(valor || 0).replace(",", "."));
    return Number.isFinite(convertido) ? convertido : 0;
  }

  function moeda(valor: number) {
    return Number(valor || 0).toFixed(2).replace(".", ",");
  }

  async function garantirFinanceiro(id: string) {
    await supabase.from("player_finance").upsert(
      {
        user_id: id,
        min_bankroll_per_account: 1000,
        makeup: 0,
      },
      {
        onConflict: "user_id",
        ignoreDuplicates: true,
      }
    );
  }

  async function garantirSemanaAberta(id: string) {
    const { data: existente, error } = await supabase
      .from("weekly_closings")
      .select("*")
      .eq("user_id", id)
      .eq("status", "open")
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar semana aberta:", error);
      return;
    }

    if (existente) return;

    const agora = new Date();

    const { error: insertError } = await supabase.from("weekly_closings").insert({
      user_id: id,
      started_at: agora.toISOString(),
      week_label: `Semana ${agora.toLocaleDateString("pt-BR")}`,
      status: "open",
    });

    if (insertError) {
      console.error("Erro ao criar semana:", insertError);
    }
  }

  async function carregarFinanceiro(id: string) {
    const { data, error } = await supabase
      .from("player_finance")
      .select("*")
      .eq("user_id", id)
      .single();

    if (error) {
      console.error("Erro ao carregar financeiro:", error);
      return;
    }

    setMakeup(numero(data?.makeup));
    setBancaMinima(numero(data?.min_bankroll_per_account) || 1000);
  }

  async function carregarContas(id: string) {
    const { data, error } = await supabase
      .from("player_accounts")
      .select("*")
      .eq("user_id", id)
      .eq("active", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erro ao carregar contas:", error);
      return;
    }

    setContas((data || []) as Conta[]);
  }

  async function carregarReloads(id: string) {
    const { data, error } = await supabase
      .from("reload_requests")
      .select("*")
      .eq("user_id", id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar reloads:", error);
      return;
    }

    setReloads((data || []) as Reload[]);
  }

  function usarHoje() {
    setDataBanca(new Date().toISOString().split("T")[0]);
  }

  async function adicionarConta() {
    if (!nomeNovaConta.trim()) {
      alert("Digite o nome da conta.");
      return;
    }

    const { error } = await supabase.from("player_accounts").insert({
      user_id: userId,
      app: appNovaConta,
      account_name: nomeNovaConta.trim(),
    });

    if (error) {
      console.error("Erro ao adicionar conta:", error);
      alert("Erro ao adicionar conta.");
      return;
    }

    setNomeNovaConta("");
    await carregarContas(userId);
  }

  async function inserirBanca() {
    if (!userId) return;

    const novosLogs: string[] = [];
    const balances: any[] = [];
    const reloadsParaCriar: any[] = [];

    novosLogs.push(`Banca atualizada - ${usuario} - ${dataBanca}`);

    contas.forEach((conta) => {
      const saldo = numero(saldos[conta.id]);

      balances.push({
        account_id: conta.id,
        app: conta.app,
        account_name: conta.account_name,
        balance: saldo,
      });

      if (saldo < bancaMinima) {
        const valorReload = bancaMinima - saldo;

        novosLogs.push(
          `${conta.account_name} - R$ ${moeda(saldo)} - Reload automático solicitado - R$ ${moeda(valorReload)}`
        );

        reloadsParaCriar.push({
          user_id: userId,
          account_id: conta.id,
          app: conta.app,
          account_name: conta.account_name,
          current_balance: saldo,
          requested_amount: valorReload,
          status: "pending",
          source: "auto",
        });
      } else {
        novosLogs.push(`${conta.account_name} - R$ ${moeda(saldo)} - Sem reload necessário`);
      }
    });

    const totalBalance = balances.reduce((acc, item) => acc + numero(item.balance), 0);

    const { error: updateError } = await supabase.from("bankroll_updates").insert({
      user_id: userId,
      update_date: dataBanca,
      total_balance: totalBalance,
      balances,
      logs: novosLogs,
    });

    if (updateError) {
      console.error("Erro ao inserir banca:", updateError);
      alert("Erro ao inserir banca.");
      return;
    }

    if (reloadsParaCriar.length > 0) {
      const { error: reloadError } = await supabase
        .from("reload_requests")
        .insert(reloadsParaCriar);

      if (reloadError) {
        console.error("Erro ao criar reloads:", reloadError);
        alert("Banca salva, mas houve erro ao criar reloads.");
        return;
      }
    }

    setLogs(novosLogs);
    await carregarReloads(userId);

    alert("Banca atualizada com sucesso.");
  }

  async function finalizarSemana() {
    if (!userId) return;

    const confirmar = confirm("Deseja finalizar a semana operacional?");
    if (!confirmar) return;

    const { data: semana, error: semanaError } = await supabase
      .from("weekly_closings")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "open")
      .single();

    if (semanaError || !semana) {
      console.error("Erro ao buscar semana aberta:", semanaError);
      alert("Semana operacional não encontrada.");
      return;
    }

    const { data: reloadsAceitos, error: reloadError } = await supabase
      .from("reload_requests")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "accepted")
      .gte("reviewed_at", semana.started_at);

    if (reloadError) {
      console.error("Erro ao buscar reloads aceitos:", reloadError);
      alert("Erro ao buscar reloads aceitos.");
      return;
    }

    const totalReload = (reloadsAceitos || []).reduce(
      (acc: number, reload: any) => acc + numero(reload.requested_amount),
      0
    );

    const totalBalance = contas.reduce((acc, conta) => {
      return acc + numero(saldos[conta.id]);
    }, 0);

    const makeupBefore = numero(makeup);

    // Regra atual:
    // Resultado operacional = saldo informado no fechamento - reloads aceitos da semana.
    // Depois podemos separar sangria real em outra tabela.
    const resultado = totalBalance - totalReload;

    let makeupAfter = makeupBefore;
    let playerShare = 0;

    if (resultado > 0) {
      makeupAfter = makeupBefore + resultado;

      if (makeupAfter > 0) {
        playerShare = makeupAfter * 0.5;
        makeupAfter = 0;
      }
    } else {
      makeupAfter = makeupBefore + resultado;
    }

    const agora = new Date();

    const label = `${new Date(semana.started_at).toLocaleDateString(
      "pt-BR"
    )} → ${agora.toLocaleDateString("pt-BR")}`;

    const { error: fecharError } = await supabase
      .from("weekly_closings")
      .update({
        closed_at: agora.toISOString(),
        status: "closed",
        week_label: label,
        total_reload: totalReload,
        total_balance: totalBalance,
        makeup_before: makeupBefore,
        makeup_after: makeupAfter,
        player_profit: resultado,
        player_share: playerShare,
      })
      .eq("id", semana.id);

    if (fecharError) {
      console.error("Erro ao finalizar semana:", fecharError);
      alert("Erro ao finalizar semana.");
      return;
    }

    const { error: financeError } = await supabase
      .from("player_finance")
      .update({
        makeup: makeupAfter,
      })
      .eq("user_id", userId);

    if (financeError) {
      console.error("Erro ao atualizar makeup:", financeError);
      alert("Semana fechada, mas houve erro ao atualizar makeup.");
      return;
    }

    await garantirSemanaAberta(userId);
    await carregarFinanceiro(userId);

    alert(
      playerShare > 0
        ? `Semana finalizada.\nSaldo positivo: R$ ${moeda(resultado)}\nSua parte: R$ ${moeda(playerShare)}`
        : `Semana finalizada.\nMakeup atualizado para R$ ${moeda(makeupAfter)}`
    );

    window.location.reload();
  }

  async function solicitarReloadManual(conta: Conta) {
    const valorTexto = prompt(`Valor do reload manual para ${conta.account_name}:`);

    if (!valorTexto) return;

    const valor = numero(valorTexto);

    if (valor <= 0) {
      alert("Valor inválido.");
      return;
    }

    const { error } = await supabase.from("reload_requests").insert({
      user_id: userId,
      account_id: conta.id,
      app: conta.app,
      account_name: conta.account_name,
      current_balance: numero(saldos[conta.id]),
      requested_amount: valor,
      status: "pending",
      source: "manual",
    });

    if (error) {
      console.error("Erro ao solicitar reload:", error);
      alert("Erro ao solicitar reload.");
      return;
    }

    setLogs((atual) => [
      ...atual,
      `${conta.account_name} - Reload manual solicitado - R$ ${moeda(valor)}`,
    ]);

    await carregarReloads(userId);
  }

  async function editarReload(reload: Reload) {
    const novoValorTexto = prompt(
      `Novo valor para ${reload.account_name}:`,
      String(reload.requested_amount)
    );

    if (!novoValorTexto) return;

    const novoValor = numero(novoValorTexto);

    if (novoValor <= 0) {
      alert("Valor inválido.");
      return;
    }

    const { error } = await supabase
      .from("reload_requests")
      .update({
        requested_amount: novoValor,
      })
      .eq("id", reload.id);

    if (error) {
      console.error("Erro ao editar reload:", error);
      alert("Erro ao editar reload.");
      return;
    }

    await carregarReloads(userId);
  }

  async function excluirReload(id: string) {
    const confirmar = confirm("Excluir esse reload pendente?");
    if (!confirmar) return;

    const { error } = await supabase.from("reload_requests").delete().eq("id", id);

    if (error) {
      console.error("Erro ao excluir reload:", error);
      alert("Erro ao excluir reload.");
      return;
    }

    await carregarReloads(userId);
  }

  async function editarNomeConta(conta: Conta) {
    const novoNome = prompt("Novo nome da conta:", conta.account_name);

    if (!novoNome || !novoNome.trim()) return;

    const { error } = await supabase
      .from("player_accounts")
      .update({
        account_name: novoNome.trim(),
      })
      .eq("id", conta.id)
      .eq("user_id", userId);

    if (error) {
      console.error("Erro ao editar conta:", error);
      alert("Erro ao editar conta.");
      return;
    }

    await carregarContas(userId);
  }

  async function excluirConta(conta: Conta) {
    const confirmar = confirm(`Excluir a conta ${conta.account_name}?`);
    if (!confirmar) return;

    const { error } = await supabase
      .from("player_accounts")
      .update({
        active: false,
      })
      .eq("id", conta.id)
      .eq("user_id", userId);

    if (error) {
      console.error("Erro ao excluir conta:", error);
      alert("Erro ao excluir conta.");
      return;
    }

    await carregarContas(userId);
  }

  const contasPPP = contas.filter((conta) => conta.app === "PPP");
  const contasSuprema = contas.filter((conta) => conta.app === "Suprema");

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-zinc-500 text-sm">Controle Financeiro</p>

          <h1 className="text-4xl font-bold">Atualizar Banca - {usuario}</h1>

          <p className="mt-2 text-zinc-400">
            Makeup atual:{" "}
            <span
              className={
                makeup < 0
                  ? "text-red-400 font-bold"
                  : "text-green-400 font-bold"
              }
            >
              R$ {moeda(makeup)}
            </span>
          </p>
        </div>

        <button
          onClick={() => {
            window.location.href = "/historico";
          }}
          className="bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-xl font-bold"
        >
          Voltar
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-2xl font-bold mb-4">Adicionar nova conta</h2>

          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setAppNovaConta("PPP")}
              className={`flex-1 p-3 rounded-xl font-bold ${
                appNovaConta === "PPP" ? "bg-blue-600" : "bg-zinc-800"
              }`}
            >
              PPP
            </button>

            <button
              onClick={() => setAppNovaConta("Suprema")}
              className={`flex-1 p-3 rounded-xl font-bold ${
                appNovaConta === "Suprema"
                  ? "bg-yellow-500 text-black"
                  : "bg-zinc-800"
              }`}
            >
              Suprema
            </button>
          </div>

          <input
            value={nomeNovaConta}
            onChange={(e) => setNomeNovaConta(e.target.value)}
            placeholder="Nome da conta"
            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 mb-4 outline-none"
          />

          <button
            onClick={adicionarConta}
            className="w-full bg-green-600 hover:bg-green-700 p-3 rounded-xl font-bold"
          >
            Adicionar
          </button>
        </div>

        <div className="xl:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-end gap-3 mb-6">
            <div className="flex-1">
              <label className="text-zinc-400 text-sm">Data da banca</label>

              <input
                type="date"
                value={dataBanca}
                onChange={(e) => setDataBanca(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 mt-2 outline-none"
              />
            </div>

            <button
              onClick={usarHoje}
              className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-xl font-bold"
            >
              Hoje
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <BlocoContas
              titulo="Contas PPP"
              contas={contasPPP}
              saldos={saldos}
              setSaldos={setSaldos}
              solicitarReloadManual={solicitarReloadManual}
              editarNomeConta={editarNomeConta}
              excluirConta={excluirConta}
            />

            <BlocoContas
              titulo="Contas Suprema"
              contas={contasSuprema}
              saldos={saldos}
              setSaldos={setSaldos}
              solicitarReloadManual={solicitarReloadManual}
              editarNomeConta={editarNomeConta}
              excluirConta={excluirConta}
            />
          </div>

          <button
            onClick={finalizarSemana}
            className="w-full bg-purple-600 hover:bg-purple-700 p-4 rounded-xl font-bold mt-6"
          >
            Finalizar Semana
          </button>

          <button
            onClick={inserirBanca}
            className="w-full bg-green-600 hover:bg-green-700 p-4 rounded-xl font-bold mt-4"
          >
            Inserir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
        <div className="bg-black border border-zinc-800 rounded-2xl p-5 min-h-72">
          <h2 className="text-2xl font-bold mb-4">Console</h2>

          {logs.length === 0 && <p className="text-zinc-500">Nenhum log ainda.</p>}

          <div className="space-y-2 font-mono text-sm">
            {logs.map((log, index) => (
              <p key={index} className="text-green-400">
                {">"} {log}
              </p>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-2xl font-bold mb-4">Reloads Pendentes</h2>

          {reloads.length === 0 && (
            <p className="text-zinc-500">Nenhum reload pendente.</p>
          )}

          <div className="space-y-3">
            {reloads.map((reload) => (
              <div
                key={reload.id}
                className="grid grid-cols-5 gap-3 items-center bg-zinc-950 p-3 rounded-xl"
              >
                <p className="font-bold">{reload.account_name}</p>

                <p>{reload.app}</p>

                <p className="text-yellow-400 font-bold">
                  R$ {moeda(reload.requested_amount)}
                </p>

                <p className="text-zinc-400">{reload.source}</p>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => editarReload(reload)}
                    className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-sm font-bold"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => excluirReload(reload.id)}
                    className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-sm font-bold"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BlocoContas({
  titulo,
  contas,
  saldos,
  setSaldos,
  solicitarReloadManual,
  editarNomeConta,
  excluirConta,
}: {
  titulo: string;
  contas: Conta[];
  saldos: Record<string, string>;
  setSaldos: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  solicitarReloadManual: (conta: Conta) => void;
  editarNomeConta: (conta: Conta) => void;
  excluirConta: (conta: Conta) => void;
}) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
      <h3 className="text-xl font-bold mb-4">{titulo}</h3>

      {contas.length === 0 && (
        <p className="text-zinc-500">Nenhuma conta cadastrada.</p>
      )}

      <div className="space-y-3">
        {contas.map((conta) => (
          <div
            key={conta.id}
            className="grid grid-cols-[1fr_180px_180px_42px] gap-3 items-center"
          >
            <div className="flex items-center justify-between gap-2 min-w-[140px]">
              <p className="font-bold leading-tight">{conta.account_name}</p>

              <button
                onClick={() => editarNomeConta(conta)}
                className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-zinc-800 transition text-sm"
                title="Editar nome"
              >
                ✏️
              </button>
            </div>

            <input
              type="text"
              inputMode="decimal"
              placeholder="Saldo"
              value={saldos[conta.id] || ""}
              onChange={(e) =>
                setSaldos((atual) => ({
                  ...atual,
                  [conta.id]: e.target.value,
                }))
              }
              className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 outline-none"
            />

            <button
              onClick={() => solicitarReloadManual(conta)}
              className="bg-yellow-500 hover:bg-yellow-600 text-black p-3 rounded-xl font-bold"
            >
              Solicitar Reload
            </button>

            <button
              onClick={() => excluirConta(conta)}
              className="bg-red-600 hover:bg-red-700 text-white w-10 h-10 rounded-xl font-bold text-lg"
              title="Excluir conta"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}