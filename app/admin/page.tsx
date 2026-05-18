"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type PlayerResumo = {
  user_id: string;
  nome: string;
  torneios: number;
  investido: number;
  ganhos: number;
  profit: number;
  abi: number;
  roi: number;
  itm: number;
  totalITM: number;
};

export default function AdminPage() {
  const [players, setPlayers] = useState<PlayerResumo[]>([]);
  const [carregando, setCarregando] = useState(true);

  function numero(valor: any) {
    const convertido = Number(String(valor || 0).replace(",", "."));
    return Number.isFinite(convertido) ? convertido : 0;
  }

  function moeda(valor: number) {
    return Number(valor || 0).toFixed(2).replace(".", ",");
  }

  function calcularITMRegistros(registros: any[]) {
    let totalEntradas = 0;
    let totalITM = 0;

    registros.forEach((registro) => {
      const entradas = numero(registro.contas) + numero(registro.rebuys);
      totalEntradas += entradas;

      const ganhosPorConta = registro.ganhosPorConta || [];

      totalITM += ganhosPorConta.filter(
        (valor: string) => numero(valor) > 0
      ).length;
    });

    return { totalEntradas, totalITM };
  }

  useEffect(() => {
    async function carregarConsolidado() {
      const role = localStorage.getItem("perfilRole");

      if (role !== "admin") {
        window.location.href = "/dashboard";
        return;
      }

      const { data, error } = await supabase
        .from("tournament_entries")
        .select("*")
        .order("data", { ascending: false });

      if (error) {
        console.error("Erro ao carregar consolidado:", error);
        alert("Erro ao carregar consolidado do time.");
        setCarregando(false);
        return;
      }

      const mapa: Record<string, PlayerResumo> = {};

      (data || []).forEach((grind: any) => {
        const userId = grind.user_id || "sem-id";
        const nome = grind.player_name || "Sem nome";

        if (!mapa[userId]) {
          mapa[userId] = {
            user_id: userId,
            nome,
            torneios: 0,
            investido: 0,
            ganhos: 0,
            profit: 0,
            abi: 0,
            roi: 0,
            itm: 0,
            totalITM: 0,
          };
        }

        const registros = grind.registros || [];
        const itmInfo = calcularITMRegistros(registros);

        mapa[userId].torneios += numero(grind.torneios);
        mapa[userId].investido += numero(grind.investido);
        mapa[userId].ganhos += numero(grind.ganhos);
        mapa[userId].totalITM += itmInfo.totalITM;
      });

      const resumo = Object.values(mapa).map((player) => {
        const profit = player.ganhos - player.investido;
        const abi =
          player.torneios > 0 ? player.investido / player.torneios : 0;
        const roi =
          player.investido > 0 ? (profit / player.investido) * 100 : 0;
        const itm =
          player.torneios > 0 ? (player.totalITM / player.torneios) * 100 : 0;

        return {
          ...player,
          profit,
          abi,
          roi,
          itm,
        };
      });

      setPlayers(resumo);
      setCarregando(false);
    }

    carregarConsolidado();
  }, []);

  function sair() {
    localStorage.clear();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-zinc-500 text-sm">Área administrativa</p>
          <h1 className="text-4xl font-bold">Consolidado do Time</h1>
        </div>

        <button
          onClick={sair}
          className="bg-red-600 hover:bg-red-700 px-5 py-3 rounded-xl font-bold"
        >
          Sair
        </button>
      </div>

      {carregando && <p className="text-zinc-400">Carregando dados...</p>}

      {!carregando && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-8 bg-zinc-800 p-4 font-bold text-center">
            <p>Jogador</p>
            <p>Torneios</p>
            <p>ABI</p>
            <p>Investido</p>
            <p>Ganhos</p>
            <p>Profit</p>
            <p>ROI</p>
            <p>ITM</p>
          </div>

          {players.length === 0 && (
            <p className="p-5 text-center text-zinc-500">
              Nenhum grind encontrado ainda.
            </p>
          )}

          {players.map((player) => (
            <button
              key={player.user_id}
              onClick={() => {
                localStorage.setItem("adminVisualizandoUserId", player.user_id);
                localStorage.setItem("adminVisualizandoNome", player.nome);
                window.location.href = "/admin/jogador";
              }}
              className="w-full grid grid-cols-8 p-4 text-center border-t border-zinc-800 hover:bg-zinc-800 transition"
            >
              <p className="font-bold text-left">{player.nome}</p>

              <p className="font-bold">{player.torneios}</p>

              <p>R$ {moeda(player.abi)}</p>

              <p className="text-red-400">R$ {moeda(player.investido)}</p>

              <p className="text-green-400">R$ {moeda(player.ganhos)}</p>

              <p
                className={
                  player.profit >= 0
                    ? "text-green-400 font-bold"
                    : "text-red-400 font-bold"
                }
              >
                R$ {moeda(player.profit)}
              </p>

              <p
                className={
                  player.roi >= 0
                    ? "text-green-400 font-bold"
                    : "text-red-400 font-bold"
                }
              >
                {moeda(player.roi)}%
              </p>

              <p className="text-blue-400 font-bold">{moeda(player.itm)}%</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}