// Cohort — gera uma imagem (canvas) com o resultado do usuário, no
// formato de post/stories (1080x1350), pra compartilhar nas redes.
// Usa apenas fontes do sistema no canvas (sem esperar webfont carregar),
// pra não arriscar desenhar em cima de um fallback antes da fonte custom
// terminar de carregar.

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  for (const word of words) {
    const testLine = line + word + " ";
    if (ctx.measureText(testLine).width > maxWidth && line !== "") {
      ctx.fillText(line, x, currentY);
      line = word + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
  return currentY;
}

export async function buildResultCard({ appName, title, statValue, statLabel, footer }) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#12211b");
  grad.addColorStop(1, "#1e3227");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // textura de pontinhos, ecoando o fundo do app
  ctx.fillStyle = "rgba(243,241,232,0.06)";
  for (let y = 30; y < canvas.height; y += 46) {
    for (let x = 30; x < canvas.width; x += 46) {
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.textAlign = "center";

  ctx.fillStyle = "#F2C94C";
  ctx.font = "bold 46px sans-serif";
  ctx.fillText(appName, canvas.width / 2, 130);

  ctx.fillStyle = "#f3f1e8";
  ctx.font = "500 42px sans-serif";
  wrapText(ctx, title, canvas.width / 2, 250, 860, 52);

  ctx.fillStyle = "#F2C94C";
  ctx.font = "bold 200px sans-serif";
  ctx.fillText(statValue, canvas.width / 2, canvas.height / 2 + 70);

  ctx.fillStyle = "#a7b3a9";
  ctx.font = "500 38px sans-serif";
  ctx.fillText(statLabel, canvas.width / 2, canvas.height / 2 + 150);

  if (footer) {
    ctx.fillStyle = "#a7b3a9";
    ctx.font = "400 30px sans-serif";
    ctx.fillText(footer, canvas.width / 2, canvas.height - 80);
  }

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export async function shareOrDownloadImage(blob, filename) {
  try {
    const file = new File([blob], filename, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] });
      return "shared";
    }
  } catch {
    // usuário cancelou o compartilhamento ou o navegador recusou - cai
    // pro download normal abaixo em vez de travar a ação.
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return "downloaded";
}
