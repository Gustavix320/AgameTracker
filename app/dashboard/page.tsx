"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Registro = {
  torneio: {
    nome: string;
    buyin: number;
    app: string;
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

export default function DashboardPage() {
  const [historico, setHistorico] = useState<Grind[]>([]);
  const [graficosAbertos, setGraficosAbertos] = useState(false);
  const [menuPerfilAberto, setMenuPerfilAberto] = useState(false);
  const [usuario, setUsuario] = useState("Usuário");
  const [editandoPerfil, setEditandoPerfil] = useState<null | "nome" | "email" | "senha" | "foto">(null);
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [fotoPerfil, setFotoPerfil] = useState("");

useEffect(() => {
  async function carregarDashboard() {
    const nome = localStorage.getItem("usuario") || "Usuário";
    const foto = localStorage.getItem("fotoPerfil") || "";

    setUsuario(nome);
    setNovoNome(nome);
    setFotoPerfil(foto);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      window.location.href = "/login";
      return;
    }

    const { data, error } = await supabase
      .from("tournament_entries")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("data", { ascending: true });

    if (error) {
      console.error("Erro ao carregar dashboard:", error);
      alert("Erro ao carregar dashboard do Supabase.");
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
  }

  carregarDashboard();
}, []);

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

      // compressão jpeg
      const compressedBase64 = canvas.toDataURL(
        "image/jpeg",
        0.6
      );

      try {
        localStorage.setItem(
          "fotoPerfil",
          compressedBase64
        );

        setFotoPerfil(compressedBase64);
        setEditandoPerfil(null);
      } catch (err) {
        alert("Imagem muito grande. Escolha outra menor.");
      }
    };

    img.src = String(event.target?.result);
  };

  reader.readAsDataURL(file);
}

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

  function detectarEstilo(registro: Registro) {
    const nome = registro.torneio.nome.toLowerCase();
    const estrutura = String((registro.torneio as any).estrutura || "").toLowerCase();

    if (estrutura.includes("mysteryko") || nome.includes("mystery") || nome.includes("mistery")) {
      return "Mystery KO";
    }

    if (estrutura.includes("satellite") || nome.includes("sat") || nome.includes("stl")) {
      return "Satelite";
    }

    if (estrutura.includes("pko") || estrutura.includes("ko") || nome.includes("pko") || nome.includes("ko")) {
      return "KO";
    }

    return "Vanilla";
  }

  function detectarEstrutura(registro: Registro) {
    const nome = registro.torneio.nome.toLowerCase();
    const estrutura = String((registro.torneio as any).estrutura || "").toLowerCase();

    if (estrutura.includes("hyper") || nome.includes("hyper") || nome.includes("sonic")) {
      return "Hyper";
    }

    if (estrutura.includes("turbo") || nome.includes("turbo") || nome.includes("trb")) {
      return "Turbo";
    }

    return "Regular";
  }

function detectarSubestrutura(registro: Registro) {
  const nome = String(registro.torneio.nome || "").toLowerCase();
  const estrutura = String((registro.torneio as any).estrutura || "").toLowerCase();

  const texto = `${nome} ${estrutura}`
    .replaceAll("_", "")
    .replaceAll("-", "")
    .replaceAll(" ", "");

  // Mystery KO
  if (
    texto.includes("regularmysterypko") ||
    texto.includes("regularmysteryko") ||
    texto.includes("mysterypko") ||
    texto.includes("mysteryko")
  ) {
    return "Regular Mystery KO";
  }

  if (
    texto.includes("turbomysterypko") ||
    texto.includes("turbomysteryko")
  ) {
    return "Turbo Mystery KO";
  }

  // PKO
  if (estrutura.includes("regular-pko") || estrutura.includes("regular-ko")) {
    return "Regular PKO";
  }

  if (estrutura.includes("turbo-pko") || estrutura.includes("turbo-ko")) {
    return "Turbo PKO";
  }

  // Vanilla
  if (estrutura.includes("hyper-vanilla")) {
    return "Hyper Vanilla";
  }

  if (estrutura.includes("turbo-vanilla")) {
    if (nome.includes("plus")) return "Plus Vanilla";
    return "Turbo Vanilla";
  }

  if (estrutura.includes("regular-vanilla")) {
    if (nome.includes("freeze") || nome.includes("freezeout")) {
      return "Freezeout Vanilla";
    }

    return "Vanilla";
  }

  return "Outros";
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

  function ResumoTabela({
    titulo,
    linhas,
  }: {
    titulo: string;
    linhas: Linha[];
  }) {
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

  const porApp = montarTabela((r) => r.torneio.app || "Sem app");
  const porEstilo = montarTabela((r) => detectarEstilo(r));
  const porAverage = montarTabela((r) => faixaAveragePlayers(r));
  const porDiaSemana = montarTabela((r) => diaSemana(r.data));
  const porEstrutura = montarTabela((r) => detectarEstrutura(r));
  const porSubestrutura = montarTabela((r) => detectarSubestrutura(r));
  const total = montarTabela(() => "Total")[0];

  function faixaABI(registro: Registro) {
  const abiReal = numero(registro.investimento) / Math.max(numero(registro.contas) + numero(registro.rebuys), 1);

  if (abiReal <= 150) return "ABI R$ 100";
  if (abiReal <= 300) return "ABI R$ 200";
  if (abiReal <= 400) return "ABI R$ 300";
  if (abiReal <= 550) return "ABI R$ 400";

  return "ABI R$ 500+";
}

const porABI = montarTabela((r) => faixaABI(r));

  function gerarCurvaProfit(
    filtro?: (registro: Registro & { data: string }) => boolean
  ) {
    let acumulado = 0;
    const pontos: number[] = [];

    getTodosRegistros().forEach((registro) => {
      if (filtro && !filtro(registro)) return;

      const profit = numero(registro.ganho) - numero(registro.investimento);
      acumulado += profit;
      pontos.push(acumulado);
    });

    return pontos;
  }

  function GraficoLinha({
    titulo,
    pontos,
  }: {
    titulo: string;
    pontos: number[];
  }) {
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

        <div className="relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-zinc-400 text-sm font-medium">
            Profit
          </div>

          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-zinc-400 text-sm font-medium">
            Volume
          </div>

          <svg
            viewBox={`0 0 ${largura} ${altura}`}
            className="w-full h-80 bg-white rounded-xl"
          >
            {labelsY.map((label, i) => {
              const y =
                padding +
                (i / (quantidadeLinhas - 1)) *
                  (altura - padding * 2);

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

                  <text
                    x={10}
                    y={y + 4}
                    fill="#111827"
                    fontSize="12"
                    fontWeight="700"
                    style={{
                      textShadow: "0px 0px 2px rgba(0,0,0,0.25)",
                    }}
                  >
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

            {pontosComZero.map((_, index) => {
              if (
                index % Math.ceil(pontosComZero.length / 8) !== 0 &&
                index !== pontosComZero.length - 1
              ) {
                return null;
              }

              const x =
                padding +
                (index / Math.max(pontosComZero.length - 1, 1)) *
                  (largura - padding * 2);

              return (
                <g key={index}>
                  <line
                    x1={x}
                    y1={altura - padding}
                    x2={x}
                    y2={padding}
                    stroke="#f3f4f6"
                    strokeWidth="1"
                  />

                  <text
                    x={x - 8}
                    y={altura - 8}
                    fill="#111827"
                    fontSize="12"
                    fontWeight="700"
                    style={{
                      textShadow: "0px 0px 2px rgba(0,0,0,0.25)",
                    }}
                  >
                    {index}
                  </text>
                </g>
              );
            })}

            <polyline
              points={coordenadas.join(" ")}
              fill="none"
              stroke="#dc2626"
              strokeWidth="3"
            />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Dashboard - {usuario}</h1>

        <div className="relative">
          <button
            onClick={() => setMenuPerfilAberto(!menuPerfilAberto)}
            className="w-14 h-14 rounded-full overflow-hidden border-2 border-zinc-700 hover:border-blue-500 transition"
          >
            <img
              src={fotoPerfil || `https://ui-avatars.com/api/?name=${usuario}&background=2563eb&color=fff`}
              alt="Perfil"
              className="w-full h-full object-cover"
            />
          </button>

          {menuPerfilAberto && (
            <div className="absolute right-0 mt-3 w-72 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-5 z-50">
              <div className="flex flex-col items-center mb-5">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-blue-500 mb-3">
                  <img
                    src={fotoPerfil || `https://ui-avatars.com/api/?name=${usuario}&background=2563eb&color=fff`}
                    alt="Perfil"
                    className="w-full h-full object-cover"
                  />
                </div>

                <h2 className="text-xl font-bold">{usuario}</h2>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setEditandoPerfil("nome")}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 p-3 rounded-xl text-left transition"
                >
                  Alterar nome
                </button>

                <button 
                onClick={() => setEditandoPerfil("email")}
                className="w-full bg-zinc-800 hover:bg-zinc-700 p-3 rounded-xl text-left transition">
                  Alterar email
                </button>

                <button 
                onClick={() => setEditandoPerfil("senha")}
                className="w-full bg-zinc-800 hover:bg-zinc-700 p-3 rounded-xl text-left transition">
                  Alterar senha
                </button>

                <button 
                onClick={() => setEditandoPerfil("foto")}
                className="w-full bg-zinc-800 hover:bg-zinc-700 p-3 rounded-xl text-left transition">
                  Alterar foto de perfil
                </button>

                {editandoPerfil === "nome" && (
                <div className="space-y-2">
                  <input
                    className="w-full bg-zinc-950 p-3 rounded-xl"
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

              {editandoPerfil === "email" && (
                <div className="space-y-2">
                  <input
                    className="w-full bg-zinc-950 p-3 rounded-xl"
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

              {editandoPerfil === "senha" && (
                <div className="space-y-2">
                  <input
                    type="password"
                    className="w-full bg-zinc-950 p-3 rounded-xl"
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

              {editandoPerfil === "foto" && (
                <input
                  type="file"
                  accept="image/*"
                  className="w-full bg-zinc-950 p-3 rounded-xl"
                  onChange={(e) => salvarFoto(e.target.files?.[0] || null)}
                />
              )}

                <button
                  onClick={() => {
                    localStorage.removeItem("usuario");
                    window.location.href = "/login";
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 p-3 rounded-xl font-bold transition"
                >
                  Sair da conta
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-zinc-900 p-6 rounded-2xl">
          <p className="text-zinc-400">Profit</p>
          <h2
            className={
              (total?.profit || 0) >= 0
                ? "text-3xl font-bold text-green-500"
                : "text-3xl font-bold text-red-500"
            }
          >
            R$ {moeda(total?.profit || 0)}
          </h2>
        </div>

        <div className="bg-zinc-900 p-6 rounded-2xl">
          <p className="text-zinc-400">ROI</p>
          <h2 className="text-3xl font-bold text-blue-500">
            {moeda(total?.roi || 0)}%
          </h2>
        </div>

        <div className="bg-zinc-900 p-6 rounded-2xl">
          <p className="text-zinc-400">ABI</p>
          <h2 className="text-3xl font-bold">
            R$ {moeda(total && total.volume > 0 ? total.investido / total.volume : 0)}
          </h2>
        </div>

        <div className="bg-zinc-900 p-6 rounded-2xl">
          <p className="text-zinc-400">Volume</p>
          <h2 className="text-3xl font-bold">{total?.volume || 0}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <ResumoTabela titulo="ROI / APP" linhas={porApp} />
        <ResumoTabela titulo="ABI's" linhas={porABI} />
        <ResumoTabela titulo="ROI / modalidade" linhas={porEstilo} />
        <ResumoTabela titulo="ROI / avg field" linhas={porAverage} />
        <ResumoTabela titulo="ROI / dia da semana" linhas={porDiaSemana} />
        <ResumoTabela titulo="ROI / estrutura" linhas={porEstrutura} />
        <ResumoTabela titulo="ROI / sub estruturas" linhas={porSubestrutura} />
      </div>

      <button
        onClick={() => setGraficosAbertos(!graficosAbertos)}
        className="w-full mt-8 bg-orange-500 hover:bg-orange-600 text-black p-4 rounded-xl font-bold text-lg"
      >
        {graficosAbertos ? "Ocultar gráficos" : "Ver gráficos"}
      </button>

      {graficosAbertos && (
        <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-6">Gráficos</h2>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <GraficoLinha titulo="Profit acumulado - Total" pontos={gerarCurvaProfit()} />

            {porApp.map((app) => (
              <GraficoLinha
                key={app.nome}
                titulo={`Profit acumulado - ${app.nome}`}
                pontos={gerarCurvaProfit(
                  (registro) => registro.torneio.app === app.nome
                )}
              />
            ))}

            {porEstilo.map((estilo) => (
              <GraficoLinha
                key={estilo.nome}
                titulo={`Profit acumulado - ${estilo.nome}`}
                pontos={gerarCurvaProfit(
                  (registro) => detectarEstilo(registro) === estilo.nome
                )}
              />
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => (window.location.href = "/historico")}
        className="w-full mt-8 bg-blue-600 hover:bg-blue-700 p-4 rounded-xl font-bold"
      >
        Voltar para histórico
      </button>
    </div>
  );
}