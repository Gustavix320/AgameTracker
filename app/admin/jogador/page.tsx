"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Grind = {
  id: number;
  data: string;
  torneios: number;
  abi: number;
  averagePlayers?: number;
  investido: number;
  itm?: number;
  ganhos: number;
  profit: number;
  roi: number;
  registros: any[];
};

type Resumo = {
  torneios: number;
  abi: number;
  averagePlayers: number;
  investido: number;
  itm: number;
  ganhos: number;
  profit: number;
  roi: number;
};

const mesesPT = [
  "JANEIRO",
  "FEVEREIRO",
  "MARÇO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
];

export default function AdminJogadorPage() {
  const [historico, setHistorico] = useState<Grind[]>([]);
  const [jogadorNome, setJogadorNome] = useState("Jogador");
  const [carregando, setCarregando] = useState(true);

  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth();

  const [anosAbertos, setAnosAbertos] = useState<number[]>([anoAtual]);

  const [mesesAbertos, setMesesAbertos] = useState<string[]>([
    `${anoAtual}-${mesAtual}`,
  ]);

  useEffect(() => {
    async function carregarJogador() {
      const role = localStorage.getItem("perfilRole");

      if (role !== "admin") {
        window.location.href = "/dashboard";
        return;
      }

      const userId = localStorage.getItem("adminVisualizandoUserId");

      const nome =
        localStorage.getItem("adminVisualizandoNome") || "Jogador";

      if (!userId) {
        window.location.href = "/admin";
        return;
      }

      setJogadorNome(nome);

      const { data, error } = await supabase
        .from("tournament_entries")
        .select("*")
        .eq("user_id", userId)
        .order("data", { ascending: false });

      if (error) {
        console.error("Erro ao carregar jogador:", error);

        alert("Erro ao carregar histórico do jogador.");

        setCarregando(false);

        return;
      }

      const historicoFormatado = (data || []).map((item: any) => ({
        id: item.id,
        data: item.data,
        torneios: item.torneios,
        abi: item.abi,
        averagePlayers: item.average_players,
        investido: item.investido,
        itm: item.itm,
        ganhos: item.ganhos,
        profit: item.profit,
        roi: item.roi,
        registros: item.registros || [],
      }));

      setHistorico(historicoFormatado);

      setCarregando(false);
    }

    carregarJogador();
  }, []);

  function numero(valor: any) {
    const convertido = Number(String(valor || 0).replace(",", "."));

    return Number.isFinite(convertido) ? convertido : 0;
  }

  function moeda(valor: number) {
    return Number(valor || 0).toFixed(2).replace(".", ",");
  }

  function formatarData(dataISO: string) {
    const data = new Date(dataISO);

    const diaSemana = data.toLocaleDateString("pt-BR", {
      weekday: "short",
    });

    const dataFormatada = data.toLocaleDateString("pt-BR");

    return `${diaSemana.replace(".", "")} ${dataFormatada}`;
  }

  function alternarAno(ano: number) {
    setAnosAbertos((atual) =>
      atual.includes(ano)
        ? atual.filter((item) => item !== ano)
        : [...atual, ano]
    );
  }

  function alternarMes(chave: string) {
    setMesesAbertos((atual) =>
      atual.includes(chave)
        ? atual.filter((item) => item !== chave)
        : [...atual, chave]
    );
  }

  function calcularResumo(grinds: Grind[]): Resumo {
    const torneios = grinds.reduce(
      (acc, grind) => acc + numero(grind.torneios),
      0
    );

    const investido = grinds.reduce(
      (acc, grind) => acc + numero(grind.investido),
      0
    );

    const ganhos = grinds.reduce(
      (acc, grind) => acc + numero(grind.ganhos),
      0
    );

    const profit = ganhos - investido;

    const abi = torneios > 0 ? investido / torneios : 0;

    const roi = investido > 0 ? (profit / investido) * 100 : 0;

    let totalITM = 0;

    let totalEntradas = 0;

    let somaAveragePlayers = 0;

    let totalRegistrosComGarantido = 0;

    grinds.forEach((grind) => {
      grind.registros?.forEach((registro) => {
        const entradas =
          numero(registro.contas) + numero(registro.rebuys);

        totalEntradas += entradas;

        const ganhosPorConta = registro.ganhosPorConta || [];

        totalITM += ganhosPorConta.filter(
          (valor: string) => numero(valor) > 0
        ).length;

        if (
          numero(registro.garantido) > 0 &&
          registro.torneio?.buyin > 0
        ) {
          somaAveragePlayers +=
            numero(registro.garantido) / registro.torneio.buyin;

          totalRegistrosComGarantido += 1;
        }
      });
    });

    const itm =
      totalEntradas > 0
        ? (totalITM / totalEntradas) * 100
        : 0;

    const averagePlayers =
      totalRegistrosComGarantido > 0
        ? somaAveragePlayers / totalRegistrosComGarantido
        : 0;

    return {
      torneios,
      abi,
      averagePlayers,
      investido,
      itm,
      ganhos,
      profit,
      roi,
    };
  }

  const historicoPorAno = historico.reduce((acc, grind) => {
    const data = new Date(grind.data);

    const ano = data.getFullYear();

    const mes = data.getMonth();

    if (!acc[ano]) acc[ano] = {};

    if (!acc[ano][mes]) acc[ano][mes] = [];

    acc[ano][mes].push(grind);

    return acc;
  }, {} as Record<number, Record<number, Grind[]>>);

  const anos = Object.keys(historicoPorAno)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-zinc-500 text-sm">
            Área administrativa
          </p>

          <h1 className="text-4xl font-bold">
            Histórico de Grinds - {jogadorNome}
          </h1>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              window.location.href =
                "/admin/jogador/dashboard";
            }}
            className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-xl font-bold"
          >
            Ver Dashboard
          </button>

          <button
            onClick={() => {
              window.location.href = "/admin";
            }}
            className="bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-xl font-bold"
          >
            Voltar ao Consolidado
          </button>
        </div>
      </div>

      {carregando && (
        <p className="text-zinc-400">
          Carregando histórico...
        </p>
      )}

      {!carregando && historico.length === 0 && (
        <p className="text-zinc-500">
          Esse jogador ainda não possui grinds.
        </p>
      )}

      {!carregando && (
        <div className="space-y-6">
          {anos.map((ano) => {
            const grindsDoAno =
              Object.values(historicoPorAno[ano]).flat();

            const resumoAno = calcularResumo(grindsDoAno);

            const anoAberto = anosAbertos.includes(ano);

            return (
              <div
                key={ano}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5"
              >
                <button
                  onClick={() => alternarAno(ano)}
                  className="w-full flex items-center justify-center gap-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl p-4 mb-5 transition"
                >
                  <h2 className="text-3xl font-bold">
                    {ano}
                  </h2>

                  <span className="text-zinc-400 text-xl">
                    {anoAberto ? "▲" : "▼"}
                  </span>
                </button>

                <div className="grid grid-cols-8 gap-3 text-center mb-5">
                  <Card
                    titulo="Torneios"
                    valor={resumoAno.torneios}
                  />

                  <Card
                    titulo="ABI"
                    valor={`R$ ${moeda(resumoAno.abi)}`}
                  />

                  <Card
                    titulo="Average Players"
                    valor={resumoAno.averagePlayers.toFixed(1)}
                  />

                  <Card
                    titulo="Investido"
                    valor={`R$ ${moeda(resumoAno.investido)}`}
                    cor="text-red-400"
                  />

                  <Card
                    titulo="Ganhos"
                    valor={`R$ ${moeda(resumoAno.ganhos)}`}
                    cor="text-green-400"
                  />

                  <Card
                    titulo="ITM"
                    valor={`${moeda(resumoAno.itm)}%`}
                    cor="text-blue-400"
                  />

                  <Card
                    titulo="Profit"
                    valor={`R$ ${moeda(resumoAno.profit)}`}
                    cor={
                      resumoAno.profit >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  />

                  <Card
                    titulo="ROI"
                    valor={`${moeda(resumoAno.roi)}%`}
                    cor={
                      resumoAno.roi >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  />
                </div>

                {anoAberto && (
                  <div className="space-y-5">
                    {Object.keys(historicoPorAno[ano])
                      .map(Number)
                      .sort((a, b) => b - a)
                      .map((mes) => {
                        const chaveMes = `${ano}-${mes}`;

                        const mesAberto =
                          mesesAbertos.includes(chaveMes);

                        const grindsDoMes =
                          historicoPorAno[ano][mes];

                        const resumoMes =
                          calcularResumo(grindsDoMes);

                        return (
                          <div
                            key={chaveMes}
                            className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4"
                          >
                            <button
                              onClick={() =>
                                alternarMes(chaveMes)
                              }
                              className="w-full flex items-center justify-center gap-3 bg-zinc-900 hover:bg-zinc-800 rounded-xl p-3 mb-4 transition"
                            >
                              <h3 className="text-2xl font-bold">
                                {mesesPT[mes]}
                              </h3>

                              <span className="text-zinc-400">
                                {mesAberto ? "▲" : "▼"}
                              </span>
                            </button>

                            <div className="grid grid-cols-8 gap-3 text-center mb-4">
                              <Card
                                titulo="Torneios"
                                valor={resumoMes.torneios}
                              />

                              <Card
                                titulo="ABI"
                                valor={`R$ ${moeda(
                                  resumoMes.abi
                                )}`}
                              />

                              <Card
                                titulo="Average Players"
                                valor={resumoMes.averagePlayers.toFixed(
                                  1
                                )}
                              />

                              <Card
                                titulo="Investido"
                                valor={`R$ ${moeda(
                                  resumoMes.investido
                                )}`}
                                cor="text-red-400"
                              />

                              <Card
                                titulo="Ganhos"
                                valor={`R$ ${moeda(
                                  resumoMes.ganhos
                                )}`}
                                cor="text-green-400"
                              />

                              <Card
                                titulo="ITM"
                                valor={`${moeda(
                                  resumoMes.itm
                                )}%`}
                                cor="text-blue-400"
                              />

                              <Card
                                titulo="Profit"
                                valor={`R$ ${moeda(
                                  resumoMes.profit
                                )}`}
                                cor={
                                  resumoMes.profit >= 0
                                    ? "text-green-400"
                                    : "text-red-400"
                                }
                              />

                              <Card
                                titulo="ROI"
                                valor={`${moeda(
                                  resumoMes.roi
                                )}%`}
                                cor={
                                  resumoMes.roi >= 0
                                    ? "text-green-400"
                                    : "text-red-400"
                                }
                              />
                            </div>

                            {mesAberto && (
                              <div className="space-y-3">
                                {grindsDoMes.map((grind) => (
                                  <div
                                    key={grind.id}
                                    className="grid grid-cols-8 gap-3 bg-zinc-900 hover:bg-zinc-800 transition rounded-xl p-3 text-center"
                                  >
                                    <p className="font-bold">
                                      {formatarData(
                                        grind.data
                                      )}
                                    </p>

                                    <p>{grind.torneios}</p>

                                    <p>
                                      R$ {moeda(grind.abi)}
                                    </p>

                                    <p className="text-red-400">
                                      R${" "}
                                      {moeda(
                                        grind.investido
                                      )}
                                    </p>

                                    <p className="text-green-400">
                                      R$ {moeda(grind.ganhos)}
                                    </p>

                                    <p
                                      className={
                                        grind.profit >= 0
                                          ? "text-green-400 font-bold"
                                          : "text-red-400 font-bold"
                                      }
                                    >
                                      R${" "}
                                      {moeda(grind.profit)}
                                    </p>

                                    <p
                                      className={
                                        grind.roi >= 0
                                          ? "text-green-400 font-bold"
                                          : "text-red-400 font-bold"
                                      }
                                    >
                                      {moeda(grind.roi)}%
                                    </p>

                                    <p className="text-blue-400 font-bold">
                                      {moeda(
                                        grind.itm || 0
                                      )}
                                      %
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Card({
  titulo,
  valor,
  cor = "text-white",
}: {
  titulo: string;
  valor: string | number;
  cor?: string;
}) {
  return (
    <div className="bg-zinc-950 p-3 rounded-xl">
      <p className="text-zinc-500 text-sm">{titulo}</p>

      <p className={`font-bold ${cor}`}>{valor}</p>
    </div>
  );
}