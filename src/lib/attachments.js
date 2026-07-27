export const ATTACHMENT_ACCEPT = "image/*,audio/*,application/pdf";
export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024; // 15MB - a Gemini limita ~20MB por requisição inteira

function isSupportedType(mimeType) {
  return mimeType.startsWith("image/") || mimeType.startsWith("audio/") || mimeType === "application/pdf";
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Converte uma FileList em anexos prontos pra UI e pra API. Retorna
 * também os arquivos rejeitados (tipo não suportado ou grande demais)
 * pra quem chamar poder mostrar um aviso.
 */
export async function filesToAttachments(fileList) {
  const files = Array.from(fileList || []);
  const accepted = [];
  const rejected = [];

  for (const file of files) {
    if (!isSupportedType(file.type)) {
      rejected.push({ name: file.name, reason: "unsupported" });
      continue;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      rejected.push({ name: file.name, reason: "too_large" });
      continue;
    }
    const data = await fileToBase64(file);
    accepted.push({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      mediaType: file.type,
      size: file.size,
      data,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    });
  }

  return { accepted, rejected };
}

export function attachmentsToBlocks(attachments) {
  return attachments.map((a) => ({
    type: "file",
    source: { type: "base64", media_type: a.mediaType, data: a.data },
  }));
}

export function revokeAttachmentPreviews(attachments) {
  attachments.forEach((a) => {
    if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
  });
}
