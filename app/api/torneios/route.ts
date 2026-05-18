import fs from "fs";
import path from "path";

type AppNome = "suprema" | "ppp";

function parsearTorneio(nomeArquivo: string, app: AppNome, dia: string) {
  const nomeSemExtensao = nomeArquivo.replace(/\.png$/i, "");
  const partes = nomeSemExtensao.split("_");

  const horario = partes[2] || "0000";
  const nome = partes[3] || "torneio";

  const buyinParte = partes.find((p) => p.startsWith("bi"));
  const gtdParte = partes.find((p) => p.startsWith("gtd"));

  const buyin = buyinParte
    ? Number(buyinParte.replace("bi", ""))
    : 0;

    const garantidoTexto = gtdParte
    ? gtdParte.replace("gtd", "")
    : "";

    let garantido = 0;

    if (garantidoTexto.toLowerCase().includes("k")) {
    garantido =
        Number(garantidoTexto.toLowerCase().replace("k", "")) * 1000;
    } else {
    garantido = Number(garantidoTexto);
    }

  const estrutura =
    partes.find((p) =>
      [
        "regular-vanilla",
        "turbo-vanilla",
        "hyper-vanilla",

        "regular-pko",
        "turbo-pko",

        "regular-mystery-ko",
        "regular-mysteryko",
        "regular-mysterypko",

        "turbo-mystery-ko",
        "turbo-mysteryko",
        "turbo-mysterypko",

        "mystery-ko",
        "mysteryko",
        "mystery-pko",
        "mysterypko",
      ].includes(p.toLowerCase())
    ) || "";

  return {
    id: nomeSemExtensao,
    nome: nome.replaceAll("-", " ").toUpperCase(),
    buyin,
    garantidoTexto,
    garantido,
    estrutura,
    app: app === "ppp" ? "PPP" : "Suprema",
    imagem: `/tournaments/${app}/${dia}/${nomeArquivo}`,
    horario,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const app = searchParams.get("app") as AppNome | null;
  const dia = searchParams.get("dia");

  if (!app || !dia) {
    return Response.json([]);
  }

  const pasta = path.join(
    process.cwd(),
    "public",
    "tournaments",
    app,
    dia
  );

  if (!fs.existsSync(pasta)) {
    return Response.json([]);
  }

  const arquivos = fs
    .readdirSync(pasta)
    .filter((arquivo) => arquivo.toLowerCase().endsWith(".png"));

  const torneios = arquivos.map((arquivo) =>
    parsearTorneio(arquivo, app, dia)
  );

  torneios.sort((a, b) => a.horario.localeCompare(b.horario));

    return Response.json(torneios);
}