"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Tesseract from "tesseract.js";
import { supabase } from "../../lib/supabase";


type Torneio = {
  id: string;
  nome: string;
  buyin: number;
  app: "Suprema" | "PPP";
  imagem: string;
  garantido?: string;
  estrutura?: string;
  categoria?: "normal" | "principais" | "satelites";
  alvo?: string;
};

type PrintResultado = {
  id: number;
  url: string;
  valor: number;
};

type Registro = {
  id: number;
  torneio: Torneio;
  contas: number;
  rebuys: number;
  addons: number;
  ganho: string;
  garantido: string;
  investimento: number;
  aberto: boolean;
  printsResultado: PrintResultado[];
  addonValor: number;
  ganhosPorConta: string[];
  isSatelite?: boolean;
  torneioAlvo?: Torneio | null;
  vagasPorConta?: boolean[];
};

export default function RegistrarPage() {
  const [usuario, setUsuario] = useState("");

  useEffect(() => {
    const nome = localStorage.getItem("usuario") || "Usuário";
    setUsuario(nome);
  }, []);

  const [appSelecionado, setAppSelecionado] = useState<"Suprema" | "PPP">("PPP");
  const [menuAberto, setMenuAberto] = useState(false);
  const [torneioSelecionado, setTorneioSelecionado] = useState<Torneio | null>(null);
  const [modoSelecao, setModoSelecao] = useState<"torneio" | "satelite">("torneio");
  const [torneiosPrincipais, setTorneiosPrincipais] = useState<Torneio[]>([]);
  const [torneioAlvoSatelite, setTorneioAlvoSatelite] = useState<Torneio | null>(null);
  const [satelites, setSatelites] = useState<Torneio[]>([]);
  const [contas, setContas] = useState(1);
  const [rebuys, setRebuys] = useState(0);
  const [addons, setAddons] = useState(0);
  const [garantido, setGarantido] = useState("");
  const [addonValor, setAddonValor] = useState(0);
  const [dataRegistro, setDataRegistro] = useState(
  new Date().toISOString().split("T")[0]
);

  const [registros, setRegistros] = useState<Registro[]>([]);
  const [dragAtivo, setDragAtivo] = useState<number | null>(null);
  const [grindEditandoId, setGrindEditandoId] = useState<number | null>(null);

 const [torneios, setTorneios] = useState<Torneio[]>([]);

 function obterDiaSemana(data: string) {
  const dias = [
    "domingo",
    "segunda",
    "terca",
    "quarta",
    "quinta",
    "sexta",
    "sabado",
  ];

  const [ano, mes, dia] = data.split("-").map(Number);
  const dataLocal = new Date(ano, mes - 1, dia);

  return dias[dataLocal.getDay()];
}

useEffect(() => {
  async function carregarTorneios() {
    const dia = obterDiaSemana(dataRegistro);

    const responseNormal = await fetch(
      `/api/torneios?app=${appSelecionado.toLowerCase()}&dia=${dia}`
    );

    const dataNormal = await responseNormal.json();

    const responsePrincipais = await fetch(
      `/api/torneios?app=${appSelecionado.toLowerCase()}&dia=${dia}&categoria=principais`
    );

    const dataPrincipais = await responsePrincipais.json();

    const responseSatelites = await fetch(
      `/api/torneios?app=${appSelecionado.toLowerCase()}&dia=${dia}&categoria=satelites`
    );

    const dataSatelites = await responseSatelites.json();

    setTorneios(dataNormal);
    setTorneiosPrincipais(dataPrincipais);
    setSatelites(dataSatelites);
  }

  carregarTorneios();
}, [appSelecionado, dataRegistro]);

useEffect(() => {
  async function carregarGrindEditando() {
    const grindEditandoId = localStorage.getItem("grindEditandoId");

    if (!grindEditandoId) return;

    const { data, error } = await supabase
      .from("tournament_entries")
      .select("*")
      .eq("id", grindEditandoId)
      .single();

    if (error || !data) {
      console.error("Erro ao carregar grind para edição:", error);
      alert("Erro ao carregar grind para edição.");
      localStorage.removeItem("grindEditandoId");
      return;
    }

    setRegistros(data.registros || []);
    setGrindEditandoId(data.id);

    if (data.data) {
      setDataRegistro(new Date(data.data).toISOString().split("T")[0]);
    }

    localStorage.removeItem("grindEditandoId");
  }

  carregarGrindEditando();
}, []);

  const investimento = torneioSelecionado
    ? torneioSelecionado.buyin * (contas + rebuys) + addons * addonValor
    : 0;


    
  function moeda(valor: number) {
    return valor.toFixed(2).replace(".", ",");
  }

  function usarDataHoje() {
  setDataRegistro(new Date().toISOString().split("T")[0]);
}

  function numero(valor: string | number) {
    if (typeof valor === "number") return valor;

    const convertido = Number(String(valor).replace(",", "."));

    return Number.isFinite(convertido) ? convertido : 0;
  }

  function registrarTorneio() {
    if (!torneioSelecionado) return;

    const novoRegistro: Registro = {
      id: Date.now(),
      torneio: torneioSelecionado,
      contas,
      rebuys,
      addons,
      addonValor,
      ganho: "",
      garantido,
      investimento,
      aberto: false,
      printsResultado: [],
      ganhosPorConta: Array(contas + rebuys).fill(""),
      isSatelite: modoSelecao === "satelite",
      torneioAlvo: torneioAlvoSatelite,
      vagasPorConta: Array(contas + rebuys).fill(false),
    };

    setRegistros([novoRegistro, ...registros]);

    setContas(1);
    setRebuys(0);
    setAddons(0);
    setAddonValor(0);
    setGarantido("");
    setTorneioSelecionado(null);
  }

  function alternarAberto(id: number) {
    setRegistros((atual) =>
      atual.map((registro) =>
        registro.id === id ? { ...registro, aberto: !registro.aberto } : registro
      )
    );
  }

  function excluirRegistro(id: number) {
    setRegistros((atual) => atual.filter((registro) => registro.id !== id));
  }

  function alterarQuantidade(
    id: number,
    campo: "contas" | "rebuys" | "addons",
    delta: number
  ) {
    setRegistros((atual) =>
      atual.map((registro) => {
        if (registro.id !== id) return registro;

        const novoValor = Math.max(0, registro[campo] + delta);

        let ganhosPorConta = registro.ganhosPorConta || [];

        const totalEntradas = campo === "contas"
        ? novoValor + registro.rebuys
        : campo === "rebuys"
        ? registro.contas + novoValor
        : registro.contas + registro.rebuys;

        if (totalEntradas > ganhosPorConta.length) {
          ganhosPorConta = [
            ...ganhosPorConta,
            ...Array(totalEntradas - ganhosPorConta.length).fill(""),
          ];
        }

        if (totalEntradas < ganhosPorConta.length) {
          ganhosPorConta = ganhosPorConta.slice(0, totalEntradas);
        }

        const atualizado = {
          ...registro,
          [campo]: novoValor,
          ganhosPorConta,
        };

        const novoInvestimento =
          atualizado.torneio.buyin * (atualizado.contas + atualizado.rebuys) +
          atualizado.addons * atualizado.addonValor;

        const novoGanho = ganhosPorConta.reduce(
          (acc, valor) => acc + numero(valor),
          0
        );

        return {
          ...atualizado,
          investimento: novoInvestimento,
          ganho: novoGanho.toFixed(2),
        };
      })
    );
  }

  function atualizarGanhoConta(
  registroId: number,
  indexConta: number,
  valor: string
) {
  setRegistros((atual) =>
    atual.map((registro) => {
      if (registro.id !== registroId) return registro;

      const ganhosPorConta = [...(registro.ganhosPorConta || [])];

      ganhosPorConta[indexConta] = valor;

      const somaGanhos = ganhosPorConta.reduce(
        (acc, item) => acc + numero(item),
        0
      );

      return {
        ...registro,
        ganhosPorConta,
        ganho: somaGanhos.toFixed(2),
      };
    })
  );
}

  function atualizarAddonValor(id: number, valor: number) {
    setRegistros((atual) =>
      atual.map((registro) => {
        if (registro.id !== id) return registro;

        const addonValorAtualizado = Math.max(0, valor);

        const investimentoAtualizado =
          registro.torneio.buyin * (registro.contas + registro.rebuys) +
          registro.addons * addonValorAtualizado;

        return {
          ...registro,
          addonValor: addonValorAtualizado,
          investimento: investimentoAtualizado,
        };
      })
    );
  }

  function atualizarValor(
    id: number,
    campo: "ganho" | "garantido",
    valor: string
  ) {
    setRegistros((atual) =>
      atual.map((registro) =>
        registro.id === id ? { ...registro, [campo]: valor } : registro
      )
    );
  }

  function removerPrintResultado(registroId: number, printId: number) {
    setRegistros((atual) =>
      atual.map((registro) => {
        if (registro.id !== registroId) return registro;

        const novosPrints = registro.printsResultado.filter(
          (print) => print.id !== printId
        );

        const somaTotal = novosPrints.reduce(
          (acc, print) => acc + print.valor,
          0
        );

        return {
          ...registro,
          printsResultado: novosPrints,
          ganho: somaTotal > 0 ? somaTotal.toFixed(2) : "",
        };
      })
    );
  }

  function converterImagemParaBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}

  async function adicionarPrintResultado(id: number, file: File | null) {
    if (!file) return;

    const registroAtual = registros.find((r) => r.id === id);
    if (!registroAtual) return;

    const imagemOriginal = await createImageBitmap(file);

    async function lerRecorte(
      cropX: number,
      cropY: number,
      cropW: number,
      cropH: number
    ) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) return "";

      const escala = 4;

      canvas.width = cropW * escala;
      canvas.height = cropH * escala;

      ctx.drawImage(
        imagemOriginal,
        cropX,
        cropY,
        cropW,
        cropH,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const brilho = (r + g + b) / 3;

        if (brilho > 140) {
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
        } else {
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
        }
      }

      ctx.putImageData(imageData, 0, 0);

      const resultado = await Tesseract.recognize(canvas, "eng", {
        logger: (m: any) => console.log(m),
        tessedit_char_whitelist:
          "0123456789.,ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzPrêmiosPremiosBountyKO:",
        tessedit_pageseg_mode: "6",
      } as any);

      return resultado.data.text;
    }

    function extrairMelhorDecimalPPP(texto: string) {
      const textoLimpo = texto.replace(",", ".").replace(/[^\d.\s]/g, " ");

      const matches = textoLimpo.match(/\d{1,4}(?:\.\d{1,2})?/g);

      if (!matches) return 0;

      const numeros = matches
        .map((v) => Number(v))
        .filter((v) => Number.isFinite(v) && v > 0 && v < 10000);

      if (numeros.length === 0) return 0;

      return numeros[0];
    }

    function extrairValorSuprema(texto: string) {
      const textoLimpo = texto.replace(/\s+/g, " ").trim();

      console.log("OCR SUPREMA LIMPO:", textoLimpo);

      function pegarValorDepoisDoLabel(label: string) {
        const regex = new RegExp(
          `${label}[^0-9]*([0-9]+(?:[.,][0-9]+)?)`,
          "i"
        );

        const match = textoLimpo.match(regex);

        if (!match) return 0;

        return Number(match[1].replace(",", "."));
      }

      const premios =
        pegarValorDepoisDoLabel("Prêmios") ||
        pegarValorDepoisDoLabel("Premios") ||
        pegarValorDepoisDoLabel("Pr.mios");

      const bounty = pegarValorDepoisDoLabel("Bounty");

      const total = premios + bounty;

      if (total > 0) return total;

      const matchValorDecimal = textoLimpo.match(
        /([0-9]{1,4})\s*[.,]\s*([0-9]{1,2})/
      );

      if (matchValorDecimal) {
        return Number(`${matchValorDecimal[1]}.${matchValorDecimal[2]}`);
      }

      return 0;
    }

    let total = 0;

    if (registroAtual.torneio.app === "PPP") {
      const textoPPP = await lerRecorte(
        imagemOriginal.width * 0.35,
        imagemOriginal.height * 0.7,
        imagemOriginal.width * 0.35,
        imagemOriginal.height * 0.18
      );

      console.log("OCR PPP:", textoPPP);

      total = extrairMelhorDecimalPPP(textoPPP);

      if (total === 0) {
        const textoSupremaFallback = await lerRecorte(
          imagemOriginal.width * 0.18,
          imagemOriginal.height * 0.55,
          imagemOriginal.width * 0.78,
          imagemOriginal.height * 0.32
        );

        console.log("OCR SUPREMA FALLBACK:", textoSupremaFallback);

        total = extrairValorSuprema(textoSupremaFallback);
      }
    }

    if (registroAtual.torneio.app === "Suprema") {
      const textoSuprema = await lerRecorte(
        imagemOriginal.width * 0.18,
        imagemOriginal.height * 0.55,
        imagemOriginal.width * 0.78,
        imagemOriginal.height * 0.32
      );

      console.log("OCR SUPREMA:", textoSuprema);

      total = extrairValorSuprema(textoSuprema);
    }

    console.log("TOTAL EXTRAÍDO:", total);

    const url = await converterImagemParaBase64(file);
    const printId = Date.now() + Math.floor(Math.random() * 1000);

    setRegistros((atual) =>
      atual.map((registro) => {
        if (registro.id !== id) return registro;

        const printsAntigos = registro.printsResultado || [];

        const novosPrints = [
          ...printsAntigos,
          {
            id: Date.now() + Math.random(),
            url,
            valor: total,
          },
        ];

        const ganhosPorConta = [
          ...(registro.ganhosPorConta || Array(registro.contas).fill("")),
        ];

        const primeiraContaVazia = ganhosPorConta.findIndex(
          (valor) => numero(valor) === 0
        );

        if (total > 0 && primeiraContaVazia !== -1) {
          ganhosPorConta[primeiraContaVazia] = total.toFixed(2);
        }

        const somaGanhos = ganhosPorConta.reduce(
          (acc, valor) => acc + numero(valor),
          0
        );

        return {
          ...registro,
          printsResultado: novosPrints,
          ganhosPorConta,
          ganho: somaGanhos.toFixed(2),
        };
      })
    );
  }

function atualizarVagaSatelite(
  registroId: number,
  indexConta: number,
  ganhou: boolean
) {
  setRegistros((atual) =>
    atual.map((registro) => {
      if (registro.id !== registroId) return registro;

      const vagasPorConta = [
        ...(registro.vagasPorConta || Array(registro.contas + registro.rebuys).fill(false)),
      ];

      vagasPorConta[indexConta] = ganhou;

      const valorVaga = numero(registro.torneioAlvo?.buyin || 0);

      const ganhosPorConta = vagasPorConta.map((vaga) =>
        vaga ? String(valorVaga) : ""
      );

      const somaGanhos = ganhosPorConta.reduce(
        (acc, valor) => acc + numero(valor),
        0
      );

      return {
        ...registro,
        vagasPorConta,
        ganhosPorConta,
        ganho: somaGanhos.toFixed(2),
      };
    })
  );
}

async function finalizarGrind() {
  if (registros.length === 0) return;

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    alert("Usuário não autenticado. Faça login novamente.");
    window.location.href = "/login";
    return;
  }

  const grindDoDia = {
    user_id: userData.user.id,
    player_name: usuario,
    data: new Date(`${dataRegistro}T12:00:00`).toISOString(),
    torneios: totalTorneios,
    abi: totalABI,
    investido: totalInvestido,
    ganhos: totalGanho,
    profit: totalProfit,
    roi: totalInvestido > 0 ? (totalProfit / totalInvestido) * 100 : 0,
    average_players: averagePlayers,
    itm: percentualITM,
    registros,
  };

  if (grindEditandoId) {
    const { error } = await supabase
      .from("tournament_entries")
      .update(grindDoDia)
      .eq("id", grindEditandoId);

    if (error) {
      console.error("Erro ao atualizar grind:", error);
      alert("Erro ao atualizar grind no Supabase.");
      return;
    }
  } else {
    const { error } = await supabase
      .from("tournament_entries")
      .insert([grindDoDia]);

    if (error) {
      console.error("Erro completo ao salvar grind:", JSON.stringify(error, null, 2));

      alert(
        `Erro ao salvar grind:
        
    Mensagem: ${error.message}
    Código: ${error.code}
    Detalhes: ${error.details || "sem detalhes"}
    Hint: ${error.hint || "sem hint"}`
      );

      return;
    }
  }

  setRegistros([]);
  setGrindEditandoId(null);
  window.location.href = "/historico";
}

  const totalInvestido = registros.reduce((acc, r) => acc + r.investimento, 0);

  const totalGanho = registros.reduce((acc, r) => acc + numero(r.ganho), 0);

  const totalProfit = totalGanho - totalInvestido;

  const totalTorneios = registros.reduce(
  (acc, r) => acc + r.contas + r.rebuys,
  0
  );

  const totalABI = totalTorneios > 0 ? totalInvestido / totalTorneios : 0;
  const totalITM = registros.reduce((acc, registro) => {
  const ganhos = registro.ganhosPorConta || [];

  return acc + ganhos.filter((valor) => numero(valor) > 0).length;
}, 0);

const percentualITM =
  totalTorneios > 0 ? (totalITM / totalTorneios) * 100 : 0;

const registrosComGarantido = registros.filter(
  (registro) => numero(registro.garantido) > 0 && registro.torneio.buyin > 0
);

const averagePlayers =
  registrosComGarantido.length > 0
    ? registrosComGarantido.reduce(
        (acc, registro) =>
          acc + numero(registro.garantido) / registro.torneio.buyin,
        0
      ) / registrosComGarantido.length
    : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 pb-32">
      <h1 className="text-5xl font-bold">
        Registrar Torneios - {usuario}
      </h1>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* ESQUERDA */}
        <div>
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => {
                setAppSelecionado("Suprema");
                setTorneioSelecionado(null);
              }}
              className={`px-6 py-3 rounded-xl font-bold ${
                appSelecionado === "Suprema"
                  ? "bg-yellow-500 text-black"
                  : "bg-zinc-800"
              }`}
            >
              Suprema
            </button>

            <button
              onClick={() => {
                setAppSelecionado("PPP");
                setTorneioSelecionado(null);
              }}
              className={`px-6 py-3 rounded-xl font-bold ${
                appSelecionado === "PPP" ? "bg-blue-600" : "bg-zinc-800"
              }`}
            >
              PPP
            </button>
          </div>

          <div className="max-w-xl mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <label className="text-zinc-400 text-sm">
              Data do registro
            </label>

            <div className="flex gap-3 mt-2">
              <input
                type="date"
                value={dataRegistro}
                onChange={(e) => setDataRegistro(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-white outline-none"
              />

              <button
                onClick={usarDataHoje}
                className="bg-blue-600 hover:bg-blue-700 px-5 rounded-xl font-bold"
              >
                Hoje
              </button>
            </div>
          </div>

          <div className="flex gap-3 mb-4">
            <button
              onClick={() => {
                setModoSelecao("torneio");
                setTorneioSelecionado(null);
                setTorneioAlvoSatelite(null);
              }}
              className={`px-5 py-3 rounded-xl font-bold ${
                modoSelecao === "torneio" ? "bg-green-600" : "bg-zinc-800"
              }`}
            >
              Torneios
            </button>

            <button
              onClick={() => {
                setModoSelecao("satelite");
                setTorneioSelecionado(null);
                setTorneioAlvoSatelite(null);
              }}
              className={`px-5 py-3 rounded-xl font-bold ${
                modoSelecao === "satelite" ? "bg-purple-600" : "bg-zinc-800"
              }`}
            >
              Satélites
            </button>
          </div>

          <div className="max-w-xl mb-6 relative">
            <button
              onClick={() => setMenuAberto(!menuAberto)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-left flex justify-between"
            >
              <span>
                {torneioSelecionado
                  ? torneioSelecionado.nome
                  : modoSelecao === "satelite"
                  ? torneioAlvoSatelite
                    ? "Selecionar satélite"
                    : "Selecionar torneio principal"
                  : "Selecionar torneio"}
              </span>

              <span>▼</span>
            </button>

            {menuAberto && (
              <div className="absolute z-50 mt-2 w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 max-h-[520px] overflow-y-auto shadow-2xl">
                <div
                  className={
                    appSelecionado === "Suprema"
                      ? "grid grid-cols-2 gap-3"
                      : "space-y-3"
                  }
                >
                  {(
                    modoSelecao === "torneio"
                      ? torneios
                      : torneioAlvoSatelite
                      ? satelites.filter(
                          (sat) => sat.alvo === torneioAlvoSatelite.alvo
                        )
                      : torneiosPrincipais
                  ).map((torneio) => (
                    <button
                      key={torneio.id}
                      onClick={() => {
                        if (modoSelecao === "satelite" && !torneioAlvoSatelite) {
                          setTorneioAlvoSatelite(torneio);
                          return;
                        }

                        setTorneioSelecionado(torneio);
                        setGarantido(String(torneio.garantido || ""));
                        setAddonValor(torneio.buyin || 0);
                        setMenuAberto(false);
                      }}
                      className={
                        appSelecionado === "Suprema"
                          ? "w-full rounded-xl overflow-hidden border border-zinc-800 hover:border-yellow-500 bg-black p-2"
                          : "w-full rounded-xl overflow-hidden border border-zinc-800 hover:border-blue-500 bg-zinc-900"
                      }
                    >
                      <Image
                        src={torneio.imagem}
                        alt={torneio.nome}
                        width={600}
                        height={130}
                        className={
                          appSelecionado === "Suprema"
                            ? "w-full h-auto object-contain mx-auto"
                            : "w-full h-auto object-contain"
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {torneioSelecionado && (
            <div className="max-w-xl space-y-4">
              <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                <Image
                  src={torneioSelecionado.imagem}
                  alt={torneioSelecionado.nome}
                  width={600}
                  height={130}
                  className="w-full h-auto object-contain rounded-lg"
                />
              </div>

              {(["contas", "rebuys", "addons"] as const).map((campo) => {
                const valor =
                  campo === "contas"
                    ? contas
                    : campo === "rebuys"
                    ? rebuys
                    : addons;

                function alterar(delta: number) {
                  const novoValor = Math.max(0, valor + delta);

                  if (campo === "contas") setContas(novoValor);
                  if (campo === "rebuys") setRebuys(novoValor);
                  if (campo === "addons") setAddons(novoValor);
                }

                return (
                  <div
                    key={campo}
                    className="flex items-center justify-between bg-zinc-900 p-4 rounded-xl"
                  >
                    <span className="text-zinc-400">
                      {campo === "contas" ? "Número de contas" : campo}
                    </span>

                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => alterar(-1)}
                        disabled={valor <= 0}
                        className="bg-zinc-800 disabled:opacity-30 w-10 h-10 rounded-lg text-lg font-bold"
                      >
                        -
                      </button>

                      <span className="font-bold text-lg w-8 text-center">
                        {valor}
                      </span>

                      <button
                        onClick={() => alterar(1)}
                        className="bg-blue-600 hover:bg-blue-700 w-10 h-10 rounded-lg text-lg font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}

              <div>
                <label className="text-zinc-400 text-sm">Valor do addon</label>

                <input
                  type="text"
                  className="w-full mt-1 p-4 rounded-xl bg-zinc-900"
                  value={addonValor}
                  min={0}
                  onChange={(e) =>
                    setAddonValor(Math.max(0, Number(e.target.value)))
                  }
                  placeholder="Ex: 25"
                />
              </div>

              <div>
                <label className="text-zinc-400 text-sm">Garantido</label>

                <input
                  type="text"
                  className="w-full mt-1 p-4 rounded-xl bg-zinc-900"
                  value={garantido}
                  onChange={(e) => setGarantido(e.target.value)}
                />
              </div>

              <div className="bg-zinc-900 p-5 rounded-2xl">
                <p className="text-zinc-400">Resumo do investimento</p>

                <h2 className="text-3xl font-bold text-green-400">
                  R$ {investimento}
                </h2>
              </div>

              <button
                onClick={registrarTorneio}
                className="w-full bg-green-600 hover:bg-green-700 p-4 rounded-xl"
              >
                Registrar Torneio
              </button>
            </div>
          )}
        </div>

        {/* DIREITA */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Torneios registrados</h2>

            <span className="text-zinc-400 text-sm">
              {new Date().toLocaleDateString("pt-BR")}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
            <div className="bg-zinc-950 p-3 rounded-xl">
              <p className="text-zinc-500 text-sm">Torneios</p>
              <p className="text-lg font-bold">{totalTorneios}</p>
            </div>

            <div className="bg-zinc-950 p-3 rounded-xl">
              <p className="text-zinc-500 text-sm">ABI</p>
              <p className="text-lg font-bold">R$ {moeda(totalABI)}</p>
            </div>

            <div className="bg-zinc-950 p-3 rounded-xl">
              <p className="text-zinc-500 text-sm">Investido</p>
              <p className="text-lg font-bold text-red-400">  R$ {moeda(totalInvestido)}</p>
            </div>

            <div className="bg-zinc-950 p-3 rounded-xl">
              <p className="text-zinc-500 text-sm">Ganhos</p>
              <p className="text-lg font-bold text-green-400">
                R$ {moeda(totalGanho)}
              </p>
            </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
            
            <div className="bg-zinc-950 p-3 rounded-xl">
            <p className="text-zinc-500 text-sm">Average Players</p>
            <p className="text-lg font-bold">
              {averagePlayers.toFixed(1)}
            </p>
          </div>

          <div className="bg-zinc-950 p-3 rounded-xl">
            <p className="text-zinc-500 text-sm">ITM</p>
            <p className="text-lg font-bold text-blue-400">
              {moeda(percentualITM)}%
            </p>
          </div>

            <div className="bg-zinc-950 p-3 rounded-xl">
              <p className="text-zinc-500 text-sm">Profit</p>

              <p
                className={`text-lg font-bold ${
                  totalProfit >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                R$ {moeda(totalProfit)}
              </p>
            </div>
          </div>

          <div className="space-y-4 max-h-[720px] overflow-y-auto pr-2">
            {registros.length === 0 && (
              <p className="text-zinc-500">Nenhum torneio registrado ainda.</p>
            )}

            {registros.map((registro) => {
              const ganhoNumerico = numero(registro.ganho);
              const profit = ganhoNumerico - registro.investimento;

              return (
                <div
                  key={registro.id}
                  className="relative bg-zinc-950 rounded-2xl p-4 border border-zinc-800"
                >
                  <button
                    onClick={() => excluirRegistro(registro.id)}
                    className="absolute top-3 right-3 bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded-lg font-bold z-10"
                  >
                    ×
                  </button>

                  <button
                    onClick={() => alternarAberto(registro.id)}
                    className="w-full flex justify-center mb-4 pr-10"
                  >
                    <Image
                      src={registro.torneio.imagem}
                      alt={registro.torneio.nome}
                      width={600}
                      height={130}
                      className="h-auto rounded-lg"
                      style={{
                        width: "auto",
                        maxWidth: "100%",
                      }}
                    />
                  </button>

                  {registro.aberto && (
                    <div className="mt-4 space-y-4 border-t border-zinc-800 pt-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-zinc-900 p-3 rounded-xl">
                          <p className="text-zinc-500 text-sm">Investido</p>
                          <p className="font-bold text-red-400">
                            R$ {moeda(registro.investimento)}
                          </p>
                        </div>

                        <div className="bg-zinc-900 p-3 rounded-xl">
                          <p className="text-zinc-500 text-sm">Valor ganho</p>
                          <p className="font-bold text-green-400">
                            R$ {moeda(ganhoNumerico)}
                          </p>
                        </div>

                        <div className="bg-zinc-900 p-3 rounded-xl">
                          <p className="text-zinc-500 text-sm">Profit</p>
                          <p
                            className={`font-bold ${
                              profit >= 0 ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            R$ {moeda(profit)}
                          </p>
                        </div>
                      </div>

                      <div className="text-xs text-zinc-400 grid grid-cols-2 gap-1">
                        <p>Garantido: R$ {registro.garantido || 0}</p>
                        <p>Contas: {registro.contas}</p>
                        <p>Rebuys: {registro.rebuys}</p>
                        <p>Addons: {registro.addons}</p>
                      </div>

                      {(["contas", "rebuys", "addons"] as const).map((campo) => (
                        <div
                          key={campo}
                          className="flex items-center justify-between bg-zinc-900 p-3 rounded-xl"
                        >
                          <span className="capitalize text-zinc-400">
                            {campo === "contas" ? "Número de contas" : campo}
                          </span>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() =>
                                alterarQuantidade(registro.id, campo, -1)
                              }
                              disabled={registro[campo] <= 0}
                              className="bg-zinc-800 disabled:opacity-30 w-8 h-8 rounded-lg"
                            >
                              -
                            </button>

                            <span className="font-bold w-8 text-center">
                              {registro[campo]}
                            </span>

                            <button
                              onClick={() =>
                                alterarQuantidade(registro.id, campo, 1)
                              }
                              className="bg-blue-600 w-8 h-8 rounded-lg"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}

                      <div className="bg-zinc-900 p-3 rounded-xl">
                        <label className="text-zinc-400 text-sm">
                          Valor unitário do addon
                        </label>

                        <input
                          type="number"
                          className="w-full mt-2 p-3 rounded-xl bg-zinc-950"
                          value={registro.addonValor}
                          min={0}
                          onChange={(e) =>
                            atualizarAddonValor(registro.id, Number(e.target.value))
                          }
                        />
                      </div>

                      <div>
                        <label className="text-zinc-500 text-sm">
                          Editar garantido
                        </label>

                        <input
                          type="number"
                          className="w-full mt-1 p-3 rounded-xl bg-zinc-900"
                          value={registro.garantido}
                          onChange={(e) =>
                            atualizarValor(registro.id, "garantido", e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-3">
                        {registro.isSatelite ? (
                          <div className="space-y-3">
                            <label className="text-zinc-500 text-sm">
                              Vaga ganha?
                            </label>

                            {(registro.vagasPorConta || Array(registro.contas + registro.rebuys).fill(false)).map(
                              (ganhou, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between bg-zinc-900 p-3 rounded-xl"
                                >
                                  <div>
                                    <p className="text-zinc-300 font-bold">
                                      {index < registro.contas
                                        ? `Conta ${index + 1}`
                                        : `Rebuy ${index - registro.contas + 1}`}
                                    </p>

                                    <p className="text-zinc-500 text-xs">
                                      Alvo: {registro.torneioAlvo?.nome || "Torneio principal"}
                                    </p>
                                  </div>

                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => atualizarVagaSatelite(registro.id, index, true)}
                                      className={`px-4 py-2 rounded-xl font-bold ${
                                        ganhou
                                          ? "bg-green-600 text-white"
                                          : "bg-zinc-800 hover:bg-green-700"
                                      }`}
                                    >
                                      ✅ Ganhou
                                    </button>

                                    <button
                                      onClick={() => atualizarVagaSatelite(registro.id, index, false)}
                                      className={`px-4 py-2 rounded-xl font-bold ${
                                        !ganhou
                                          ? "bg-red-600 text-white"
                                          : "bg-zinc-800 hover:bg-red-700"
                                      }`}
                                    >
                                      ❌ Não
                                    </button>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <>
                            {/* mantém aqui seu bloco atual de valores ganhos por conta + anexar print */}
                          </>
                        )}

                        {(registro.ganhosPorConta || Array(registro.contas).fill("")).map(
                          (valor, index) => (
                            <div key={index}>
                              <label className="text-zinc-500 text-xs">
                                {index < registro.contas
                              ? `Valor ganho conta ${index + 1}`
                              : `Valor ganho rebuy ${index - registro.contas + 1}`}
                              </label>

                              <input
                                type="number"
                                className="w-full mt-1 p-3 rounded-xl bg-zinc-900"
                                value={valor}
                                onChange={(e) =>
                                  atualizarGanhoConta(
                                    registro.id,
                                    index,
                                    e.target.value
                                  )
                                }
                                placeholder="Ex: 67.50"
                              />
                            </div>
                          )
                        )}
                      </div>

                      <div>
                        <label className="text-zinc-500 text-sm">
                          Anexar print do resultado
                        </label>

                        <label
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragAtivo(registro.id);
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragAtivo(null);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragAtivo(null);

                            const files = Array.from(e.dataTransfer.files || []);

                            files.forEach((file) => {
                              adicionarPrintResultado(registro.id, file);
                            });
                          }}
                          className={`
                            mt-2
                            flex
                            flex-col
                            items-center
                            justify-center
                            w-full
                            h-40
                            border-2
                            border-dashed
                            rounded-2xl
                            cursor-pointer
                            transition-all
                            duration-200
                            ${
                              dragAtivo === registro.id
                                ? `
                                  border-blue-400
                                  bg-blue-500/10
                                  shadow-[0_0_25px_rgba(59,130,246,0.45)]
                                  scale-[1.01]
                                `
                                : `
                                  border-zinc-700
                                  bg-zinc-900
                                  hover:border-blue-500
                                  hover:bg-zinc-800
                                `
                            }
                          `}
                        >
                          <div className="text-center">
                            <p className="text-zinc-300 font-medium">
                              Clique ou arraste o print aqui
                            </p>

                            <p className="text-zinc-500 text-sm mt-1">
                              PNG, JPG ou WEBP
                            </p>
                          </div>

                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);

                              files.forEach((file) => {
                                adicionarPrintResultado(registro.id, file);
                              });

                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>

                      {registro.printsResultado.length > 0 && (
                        <div className="bg-zinc-900 p-3 rounded-xl">
                          <p className="text-zinc-500 text-sm mb-3">
                            Prints anexados
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {registro.printsResultado.map((print) => (
                              <div
                                key={print.id}
                                className="relative bg-zinc-950 rounded-xl p-3 border border-zinc-800"
                              >
                                <button
                                  onClick={() =>
                                    removerPrintResultado(registro.id, print.id)
                                  }
                                  className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white w-7 h-7 rounded-lg font-bold z-10"
                                >
                                  ×
                                </button>

                                <img
                                  src={print.url}
                                  alt="Print do resultado"
                                  className="rounded-xl max-h-80 object-contain mx-auto"
                                />

                                <p className="text-center text-green-400 font-bold mt-2">
                                  R$ {moeda(print.valor)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-4 z-50">
        <button
          onClick={() => window.location.href = "/historico"}
          className="bg-zinc-700 hover:bg-zinc-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg transition"
        >
          Voltar
        </button>

        <button
          onClick={finalizarGrind}
          className="bg-green-600 hover:bg-green-700 text-white px-10 py-4 rounded-2xl font-bold shadow-lg transition"
        >
          Finalizar Registro
        </button>
      </div>
    </div>
  );
}
