"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

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

export default function HistoricoPage() {
  const [historico, setHistorico] = useState<Grind[]>([]);
  const [usuario, setUsuario] = useState("");
  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth();
  const [fotoPerfil, setFotoPerfil] = useState("");
  const [menuPerfilAberto, setMenuPerfilAberto] = useState(false);
  const [editandoPerfil, setEditandoPerfil] = useState<null | "nome" | "email" | "senha" | "foto">(null);
const [novoNome, setNovoNome] = useState("");
const [novoEmail, setNovoEmail] = useState("");
const [novaSenha, setNovaSenha] = useState("");

  const [anosAbertos, setAnosAbertos] = useState<number[]>([anoAtual]);
  const [mesesAbertos, setMesesAbertos] = useState<string[]>([
    `${anoAtual}-${mesAtual}`,
  ]);

useEffect(() => {
  async function carregarHistorico() {
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
      .order("data", { ascending: false });

    if (error) {
      console.error("Erro ao carregar histórico:", error);
      alert("Erro ao carregar histórico do Supabase.");
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

  carregarHistorico();
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

  function novoRegistro() {
    localStorage.removeItem("grindEditando");
    window.location.href = "/registrar";
  }

function editarDia(grind: Grind) {
  localStorage.setItem("grindEditandoId", String(grind.id));
  window.location.href = "/registrar";
}

async function excluirGrind(id: number) {
  const confirmar = confirm("Tem certeza que deseja excluir esse histórico?");
  if (!confirmar) return;

  const { error } = await supabase
    .from("tournament_entries")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao excluir grind:", error);
    alert("Erro ao excluir grind.");
    return;
  }

  setHistorico((atual) => atual.filter((grind) => grind.id !== id));
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

  function numero(valor: any) {
    const convertido = Number(String(valor || 0).replace(",", "."));
    return Number.isFinite(convertido) ? convertido : 0;
  }

  function calcularResumo(grinds: Grind[]): Resumo {
    const torneios = grinds.reduce((acc, grind) => acc + numero(grind.torneios), 0);
    const investido = grinds.reduce((acc, grind) => acc + numero(grind.investido), 0);
    const ganhos = grinds.reduce((acc, grind) => acc + numero(grind.ganhos), 0);
    const profit = ganhos - investido;

    const abi = torneios > 0 ? investido / torneios : 0;
    const roi = investido > 0 ? (profit / investido) * 100 : 0;

    let totalITM = 0;
    let totalEntradas = 0;
    let somaAveragePlayers = 0;
    let totalRegistrosComGarantido = 0;

    grinds.forEach((grind) => {
      grind.registros?.forEach((registro) => {
        const entradas = numero(registro.contas) + numero(registro.rebuys);
        totalEntradas += entradas;

        const ganhosPorConta = registro.ganhosPorConta || [];
        totalITM += ganhosPorConta.filter((valor: string) => numero(valor) > 0).length;

        if (numero(registro.garantido) > 0 && registro.torneio?.buyin > 0) {
          somaAveragePlayers += numero(registro.garantido) / registro.torneio.buyin;
          totalRegistrosComGarantido += 1;
        }
      });
    });

    const itm = totalEntradas > 0 ? (totalITM / totalEntradas) * 100 : 0;

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
     <div className="flex items-center justify-between mb-6 relative">
        <h1 className="text-4xl font-bold">
            Histórico de Grinds - {usuario}
        </h1>

        <div className="relative">
            <button
            onClick={() =>
                setMenuPerfilAberto(!menuPerfilAberto)
            }
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

                <h2 className="text-2xl font-bold mt-3">
                    {usuario}
                </h2>
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

                <button
                onClick={() => setEditandoPerfil("email")}
                className="w-full bg-zinc-800 hover:bg-zinc-700 p-3 rounded-xl text-left transition"
                >
                Alterar email
                </button>

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

                <button
                onClick={() => setEditandoPerfil("foto")}
                className="w-full bg-zinc-800 hover:bg-zinc-700 p-3 rounded-xl text-left transition"
                >
                Alterar foto de perfil
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

      <div className="space-y-6">
        {anos.map((ano) => {
          const grindsDoAno = Object.values(historicoPorAno[ano]).flat();
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
                <h2 className="text-3xl font-bold">{ano}</h2>
                <span className="text-zinc-400 text-xl">
                  {anoAberto ? "▲" : "▼"}
                </span>
              </button>

              <div className="grid grid-cols-8 gap-3 text-center mb-5">
                <div className="bg-zinc-950 p-3 rounded-xl">
                  <p className="text-zinc-500 text-sm">Torneios</p>
                  <p className="font-bold">{resumoAno.torneios}</p>
                </div>

                <div className="bg-zinc-950 p-3 rounded-xl">
                  <p className="text-zinc-500 text-sm">ABI</p>
                  <p className="font-bold">R$ {moeda(resumoAno.abi)}</p>
                </div>

                <div className="bg-zinc-950 p-3 rounded-xl">
                  <p className="text-zinc-500 text-sm">Average Players</p>
                  <p className="font-bold">{resumoAno.averagePlayers.toFixed(1)}</p>
                </div>

                <div className="bg-zinc-950 p-3 rounded-xl">
                  <p className="text-zinc-500 text-sm">Investido</p>
                  <p className="font-bold text-red-400">
                    R$ {moeda(resumoAno.investido)}
                  </p>
                </div>

                <div className="bg-zinc-950 p-3 rounded-xl">
                  <p className="text-zinc-500 text-sm">Ganhos</p>
                  <p className="font-bold text-green-400">
                    R$ {moeda(resumoAno.ganhos)}
                  </p>
                </div>

                <div className="bg-zinc-950 p-3 rounded-xl">
                  <p className="text-zinc-500 text-sm">ITM</p>
                  <p className="font-bold text-blue-400">
                    {moeda(resumoAno.itm)}%
                  </p>
                </div>

                <div className="bg-zinc-950 p-3 rounded-xl">
                  <p className="text-zinc-500 text-sm">Profit</p>
                  <p
                    className={
                      resumoAno.profit >= 0
                        ? "font-bold text-green-400"
                        : "font-bold text-red-400"
                    }
                  >
                    R$ {moeda(resumoAno.profit)}
                  </p>
                </div>

                <div className="bg-zinc-950 p-3 rounded-xl">
                  <p className="text-zinc-500 text-sm">ROI</p>
                  <p
                    className={
                      resumoAno.roi >= 0
                        ? "font-bold text-green-400"
                        : "font-bold text-red-400"
                    }
                  >
                    {moeda(resumoAno.roi)}%
                  </p>
                </div>
              </div>

              {anoAberto && (
                <div className="space-y-5">
                  {Object.keys(historicoPorAno[ano])
                    .map(Number)
                    .sort((a, b) => b - a)
                    .map((mes) => {
                      const chaveMes = `${ano}-${mes}`;
                      const mesAberto = mesesAbertos.includes(chaveMes);
                      const grindsDoMes = historicoPorAno[ano][mes];
                      const resumoMes = calcularResumo(grindsDoMes);

                      return (
                        <div
                          key={chaveMes}
                          className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4"
                        >
                          <button
                            onClick={() => alternarMes(chaveMes)}
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
                            <div className="bg-zinc-900 p-3 rounded-xl">
                                <p className="text-zinc-500 text-sm">Torneios</p>
                                <p className="font-bold">{resumoMes.torneios}</p>
                            </div>

                            <div className="bg-zinc-900 p-3 rounded-xl">
                                <p className="text-zinc-500 text-sm">ABI</p>
                                <p className="font-bold">
                                R$ {moeda(resumoMes.abi)}
                                </p>
                            </div>

                            <div className="bg-zinc-900 p-3 rounded-xl">
                                <p className="text-zinc-500 text-sm">
                                Average Players
                                </p>

                                <p className="font-bold">
                                {resumoMes.averagePlayers.toFixed(1)}
                                </p>
                            </div>

                            <div className="bg-zinc-900 p-3 rounded-xl">
                                <p className="text-zinc-500 text-sm">Investido</p>

                                <p className="font-bold text-red-400">
                                R$ {moeda(resumoMes.investido)}
                                </p>
                            </div>

                            <div className="bg-zinc-900 p-3 rounded-xl">
                                <p className="text-zinc-500 text-sm">Ganhos</p>

                                <p className="font-bold text-green-400">
                                R$ {moeda(resumoMes.ganhos)}
                                </p>
                            </div>

                            <div className="bg-zinc-900 p-3 rounded-xl">
                                <p className="text-zinc-500 text-sm">ITM</p>

                                <p className="font-bold text-blue-400">
                                {moeda(resumoMes.itm)}%
                                </p>
                            </div>

                            <div className="bg-zinc-900 p-3 rounded-xl">
                                <p className="text-zinc-500 text-sm">Profit</p>

                                <p
                                className={
                                    resumoMes.profit >= 0
                                    ? "font-bold text-green-400"
                                    : "font-bold text-red-400"
                                }
                                >
                                R$ {moeda(resumoMes.profit)}
                                </p>
                            </div>

                            <div className="bg-zinc-900 p-3 rounded-xl">
                                <p className="text-zinc-500 text-sm">ROI</p>

                                <p
                                className={
                                    resumoMes.roi >= 0
                                    ? "font-bold text-green-400"
                                    : "font-bold text-red-400"
                                }
                                >
                                {moeda(resumoMes.roi)}%
                                </p>
                            </div>
                        </div>

                          {mesAberto && (
                            <div className="space-y-3 mt-5">
                              <div className="grid grid-cols-[1fr_0.7fr_0.8fr_1fr_0.9fr_0.9fr_0.7fr_0.9fr_0.8fr_48px] gap-3 text-zinc-400 text-sm px-3">
                                <p>Data</p>
                                <p>Torneios</p>
                                <p>ABI</p>
                                <p>Average</p>
                                <p>Investido</p>
                                <p>Ganhos</p>
                                <p>ITM</p>
                                <p>Profit</p>
                                <p>ROI</p>
                                <p></p>
                              </div>

                              {grindsDoMes.map((grind) => (
                                <div
                                  key={grind.id}
                                  className="grid grid-cols-[1fr_48px] gap-2 items-center"
                                >
                                  <button
                                    onClick={() => editarDia(grind)}
                                    className="w-full grid grid-cols-[1fr_0.7fr_0.8fr_1fr_0.9fr_0.9fr_0.7fr_0.9fr_0.8fr] gap-3 bg-zinc-900 hover:bg-zinc-800 p-4 rounded-xl text-left transition"
                                  >
                                    <p>{formatarData(grind.data)}</p>
                                    <p>{grind.torneios}</p>
                                    <p>R$ {moeda(grind.abi)}</p>
                                    <p>{Number(grind.averagePlayers || 0).toFixed(1)}</p>

                                    <p className="text-red-400">
                                      R$ {moeda(grind.investido)}
                                    </p>

                                    <p className="text-green-400">
                                      R$ {moeda(grind.ganhos)}
                                    </p>

                                    <p className="text-blue-400">
                                      {moeda(Number(grind.itm || 0))}%
                                    </p>

                                    <p
                                      className={
                                        grind.profit >= 0
                                          ? "text-green-400"
                                          : "text-red-400"
                                      }
                                    >
                                      R$ {moeda(grind.profit)}
                                    </p>

                                    <p
                                      className={
                                        grind.roi >= 0
                                          ? "text-green-400"
                                          : "text-red-400"
                                      }
                                    >
                                      {moeda(grind.roi)}%
                                    </p>
                                  </button>

                                  <button
                                    onClick={() => excluirGrind(grind.id)}
                                    className="bg-red-600 hover:bg-red-700 text-white w-12 h-12 rounded-xl font-bold text-xl transition"
                                    title="Excluir histórico"
                                  >
                                    ×
                                  </button>
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

        {historico.length === 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-zinc-500">
              Nenhum grind finalizado ainda.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
                onClick={novoRegistro}
                className="w-full bg-blue-600 hover:bg-blue-700 p-4 rounded-xl font-bold"
            >
                Inserir novo registro
            </button>

            <button
                onClick={() => (window.location.href = "/dashboard")}
                className="w-full bg-green-600 hover:bg-green-700 p-4 rounded-xl font-bold"
            >
                Ver Dashboard
            </button>

            <button
                onClick={() => {
                    window.location.href = "/banca";
                }}
                className="bg-red-600 hover:bg-red-700 px-5 py-3 rounded-xl font-bold"
                >
                Atualizar Banca
                </button>
        </div>
      </div>
    </div>
  );
}