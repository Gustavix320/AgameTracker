"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";

type Registro = {
  torneio: {
    nome: string;
    buyin: number;
    app: string;
    estrutura?: string;
  };
  contas: number;
  rebuys: number;
  garantido: string;
  investimento: number;
  ganho: string;
  ganhosPorConta?: string[];
};

type Grind = {
  id: number;
  data: string;
  registros: Registro[];
};

type Linha = {
  nome: string;
  volume: number;
  investido: number;
  ganho: number;
  profit: number;
  roi: number;
};

export default function AdminJogadorDashboardPage() {
  const [historico, setHistorico] = useState<Grind[]>([]);
  const [usuario, setUsuario] = useState("Jogador");

  useEffect(() => {
    async function carregarDashboard() {
      const role = localStorage.getItem("perfilRole");

      if (role !== "admin") {
        window.location.href = "/dashboard";
        return;
      }

      const userId = localStorage.getItem("adminVisualizandoUserId");
      const nome = localStorage.getItem("adminVisualizandoNome");

      if (!userId) {
        window.location.href = "/admin";
        return;
      }

      setUsuario(nome || "Jogador");

      const { data, error } = await supabase
        .from("tournament_entries")
        .select("*")
        .eq("user_id", userId)
        .order("data", { ascending: true });

      if (error) {
        console.error("Erro ao carregar dashboard do jogador:", error);
        alert("Erro ao carregar dashboard do jogador.");
        return;
      }

      const historicoFormatado = (data || []).map((item: any) => ({
        id: item.id,
        data: item.data,
        registros: item.registros || [],
      }));

      setHistorico(historicoFormatado);
    }

    carregarDashboard();
  }, []);

  function numero(valor: any) {
    const convertido = Number(String(valor || 0).replace(",", "."));
    return Number.isFinite(convertido) ? convertido : 0;
  }

  function moeda(valor: number) {
    return Number(valor || 0).toFixed(2).replace(".", ",");
  }

  function roi(profit: number, investido: number) {
    return investido > 0 ? (profit / investido) * 100 : 0;
  }

  function getTodosRegistros() {
    return historico.flatMap((grind) =>
      (grind.registros || []).map((registro) => ({
        ...registro,
        data: grind.data,
      }))
    );
  }

  function detectarModalidade(registro: Registro) {
    const nome = registro.torneio.nome.toLowerCase();
    const estrutura = String(registro.torneio.estrutura || "").toLowerCase();

    if (
      estrutura.includes("mystery") ||
      nome.includes("mystery") ||
      nome.includes("mistery")
    ) {
      return "Mystery KO";
    }

    if (
      estrutura.includes("satelite") ||
      estrutura.includes("satellite") ||
      nome.includes("sat")
    ) {
      return "Satelite";
    }

    if (
      estrutura.includes("pko") ||
      estrutura.includes("ko") ||
      nome.includes("pko") ||
      nome.includes("ko")
    ) {
      return "KO";
    }

    return "Vanilla";
  }

  function detectarEstrutura(registro: Registro) {
    const nome = registro.torneio.nome.toLowerCase();
    const estrutura = String(registro.torneio.estrutura || "").toLowerCase();

    if (estrutura.includes("hyper") || nome.includes("hyper")) return "Hyper";
    if (estrutura.includes("turbo") || nome.includes("turbo")) return "Turbo";

    return "Regular";
  }

  function detectarSubestrutura(registro: Registro) {
    const nome = registro.torneio.nome.toLowerCase();
    const estrutura = String(registro.torneio.estrutura || "").toLowerCase();

    if (estrutura.includes("regular-pko")) return "Regular PKO";
    if (estrutura.includes("turbo-pko")) return "Turbo PKO";
    if (estrutura.includes("mystery-ko")) return "Mystery KO";
    if (estrutura.includes("freezeout")) return "Freezeout Vanilla";
    if (estrutura.includes("plus")) return "Plus Vanilla";
    if (estrutura.includes("turbo-vanilla")) return "Turbo Vanilla";
    if (estrutura.includes("regular-vanilla")) return "Vanilla";

    if (nome.includes("pko")) return "PKO";
    if (nome.includes("turbo")) return "Turbo";
    if (nome.includes("plus")) return "Plus Vanilla";

    return "Outros";
  }

  function faixaABI(registro: Registro) {
    const volume = numero(registro.contas) + numero(registro.rebuys);
    const abiReal = numero(registro.investimento) / Math.max(volume, 1);

    if (abiReal <= 150) return "ABI R$ 100";
    if (abiReal <= 300) return "ABI R$ 200";
    if (abiReal <= 400) return "ABI R$ 300";
    if (abiReal <= 550) return "ABI R$ 400";

    return "ABI R$ 500+";
  }

  function faixaAveragePlayers(registro: Registro) {
    const avg =
      numero(registro.garantido) > 0 && registro.torneio.buyin > 0
        ? numero(registro.garantido) / registro.torneio.buyin
        : 0;

    if (avg <= 0) return "Sem garantido";
    if (avg <= 100) return "0 a 100 players";
    if (avg <= 250) return "101 a 250 players";
    if (avg <= 500) return "251 a 500 players";
    if (avg <= 1000) return "501 a 1k players";

    return "1k+ players";
  }

  function diaSemana(dataISO: string) {
    return new Date(dataISO).toLocaleDateString("pt-BR", {
      weekday: "long",
    });
  }

  function montarTabela(getChave: (registro: Registro & { data: string }) => string) {
    const mapa: Record<string, Linha> = {};

    getTodosRegistros().forEach((registro) => {
      const chave = getChave(registro);

      if (!mapa[chave]) {
        mapa[chave] = {
          nome: chave,
          volume: 0,
          investido: 0,
          ganho: 0,
          profit: 0,
          roi: 0,
        };
      }

      const volume = numero(registro.contas) + numero(registro.rebuys);
      const investido = numero(registro.investimento);
      const ganho = numero(registro.ganho);

      mapa[chave].volume += volume;
      mapa[chave].investido += investido;
      mapa[chave].ganho += ganho;
    });

    return Object.values(mapa)
      .filter((linha) => linha.volume > 0)
      .map((linha) => {
        const profit = linha.ganho - linha.investido;

        return {
          ...linha,
          profit,
          roi: roi(profit, linha.investido),
        };
      });
  }

  function gerarCurvaProfit() {
    let acumulado = 0;
    const pontos: number[] = [];

    getTodosRegistros().forEach((registro) => {
      const profit = numero(registro.ganho) - numero(registro.investimento);
      acumulado += profit;
      pontos.push(acumulado);
    });

    return pontos;
  }

  const porApp = montarTabela((r) => r.torneio.app || "Sem app");
  const porModalidade = montarTabela((r) => detectarModalidade(r));
  const porABI = montarTabela((r) => faixaABI(r));
  const porEstrutura = montarTabela((r) => detectarEstrutura(r));
  const porSubestrutura = montarTabela((r) => detectarSubestrutura(r));
  const porAverage = montarTabela((r) => faixaAveragePlayers(r));
  const porDiaSemana = montarTabela((r) => diaSemana(r.data));
  const pontosProfit = gerarCurvaProfit();

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-zinc-500 text-sm">Área administrativa</p>
          <h1 className="text-4xl font-bold">Dashboard - {usuario}</h1>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              window.location.href = "/admin/jogador";
            }}
            className="bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-xl font-bold"
          >
            Voltar ao Histórico
          </button>

          <button
            onClick={() => {
              window.location.href = "/admin";
            }}
            className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-xl font-bold"
          >
            Consolidado
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <ResumoTabela titulo="ROI por App" linhas={porApp} />
        <ResumoTabela titulo="ROI por Modalidade" linhas={porModalidade} />
        <ResumoTabela titulo="ROI por ABI" linhas={porABI} />
        <ResumoTabela titulo="ROI por Estrutura" linhas={porEstrutura} />
        <ResumoTabela titulo="ROI por Subestrutura" linhas={porSubestrutura} />
        <ResumoTabela titulo="ROI por Average Players" linhas={porAverage} />
        <ResumoTabela titulo="ROI por Dia da Semana" linhas={porDiaSemana} />
      </div>

      <GraficoLinha titulo="Profit Acumulado" pontos={pontosProfit} />
    </div>
  );
}

function ResumoTabela({
  titulo,
  linhas,
}: {
  titulo: string;
  linhas: Linha[];
}) {
  function moeda(valor: number) {
    return Number(valor || 0).toFixed(2).replace(".", ",");
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="bg-blue-900/40 p-3 text-center">
        <h2 className="font-bold text-xl">{titulo}</h2>
      </div>

      <div className="grid grid-cols-3 bg-zinc-800 text-center font-bold p-2">
        <p>Tipo</p>
        <p>Volume</p>
        <p>ROI</p>
      </div>

      {linhas.length === 0 && (
        <p className="text-zinc-500 p-4 text-center">Sem dados ainda</p>
      )}

      {linhas.map((linha) => (
        <div
          key={linha.nome}
          className="grid grid-cols-3 text-center p-2 border-t border-zinc-800"
        >
          <p>{linha.nome}</p>
          <p className="font-bold">{linha.volume}</p>
          <p
            className={
              linha.roi >= 0
                ? "text-green-400 font-bold"
                : "text-red-400 font-bold"
            }
          >
            {moeda(linha.roi)}%
          </p>
        </div>
      ))}
    </div>
  );
}

function GraficoLinha({
  titulo,
  pontos,
}: {
  titulo: string;
  pontos: number[];
}) {
  function moeda(valor: number) {
    return Number(valor || 0).toFixed(2).replace(".", ",");
  }

  if (pontos.length === 0) {
    return (
      <div className="bg-white text-zinc-900 rounded-2xl p-5">
        <h3 className="text-xl font-bold mb-4">{titulo}</h3>
        <p className="text-zinc-500">Sem dados</p>
      </div>
    );
  }

  const largura = 600;
  const altura = 260;
  const padding = 30;

  const pontosComZero = [0, ...pontos];

  const min = Math.min(...pontosComZero);
  const max = Math.max(...pontosComZero);
  const range = max - min || 1;

  const quantidadeLinhas = 5;

  const labelsY = Array.from({ length: quantidadeLinhas }, (_, i) => {
    return max - (i / (quantidadeLinhas - 1)) * (max - min);
  });

  const coordenadas = pontosComZero.map((valor, index) => {
    const x =
      padding +
      (index / Math.max(pontosComZero.length - 1, 1)) *
        (largura - padding * 2);

    const y =
      altura -
      padding -
      ((valor - min) / range) * (altura - padding * 2);

    return `${x},${y}`;
  });

  const yZero =
    altura - padding - ((0 - min) / range) * (altura - padding * 2);

  return (
    <div className="bg-zinc-950 rounded-2xl p-5">
      <h3 className="text-xl font-bold mb-4">{titulo}</h3>

      <svg viewBox={`0 0 ${largura} ${altura}`} className="w-full h-80 bg-white rounded-xl">
        {labelsY.map((label, i) => {
          const y =
            padding + (i / (quantidadeLinhas - 1)) * (altura - padding * 2);

          return (
            <g key={i}>
              <line
                x1={padding}
                y1={y}
                x2={largura - padding}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
              />

              <text x={10} y={y + 4} fill="#111827" fontSize="12" fontWeight="700">
                R$ {moeda(label)}
              </text>
            </g>
          );
        })}

        <line
          x1={padding}
          y1={yZero}
          x2={largura - padding}
          y2={yZero}
          stroke="#9ca3af"
          strokeWidth="1.5"
        />

        <polyline
          points={coordenadas.join(" ")}
          fill="none"
          stroke="#dc2626"
          strokeWidth="3"
        />
      </svg>
    </div>
  );
}