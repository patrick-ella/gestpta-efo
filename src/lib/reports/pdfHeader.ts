import jsPDF from "jspdf";
import logoSrc from "@/assets/logo-efo.png";

let cachedLogoBase64: string | null = null;
let cachedLogoDims: { width: number; height: number } | null = null;

async function loadLogoBase64(): Promise<string | null> {
  if (cachedLogoBase64) return cachedLogoBase64;
  try {
    const res = await fetch(logoSrc);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        cachedLogoBase64 = reader.result as string;
        resolve(cachedLogoBase64);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Reads the natural pixel dimensions of an image (base64 or URL).
 * Falls back to a reasonable default (200x80) if the image cannot load.
 */
export function getImageNaturalDimensions(
  imgData: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || 200,
        height: img.naturalHeight || 80,
      });
    };
    img.onerror = () => {
      console.warn("[PDF] Logo failed to load — using default ratio 200x80");
      resolve({ width: 200, height: 80 });
    };
    img.src = imgData;
  });
}

/** Cached natural dimensions of the EFO logo. */
export async function getLogoDimensions(): Promise<{ width: number; height: number }> {
  if (cachedLogoDims) return cachedLogoDims;
  const data = await loadLogoBase64();
  if (!data) {
    cachedLogoDims = { width: 200, height: 80 };
    return cachedLogoDims;
  }
  cachedLogoDims = await getImageNaturalDimensions(data);
  return cachedLogoDims;
}

/**
 * Compute height (mm) preserving the logo's natural aspect ratio
 * for a target width (mm).
 */
export async function computeLogoHeight(targetWidthMm: number): Promise<number> {
  const { width, height } = await getLogoDimensions();
  return targetWidthMm * (height / width);
}

export async function addReportHeader(
  doc: jsPDF,
  titre: string,
  sousTitre: string,
  orientation: "landscape" | "portrait" = "landscape"
) {
  const pageW = orientation === "landscape" ? 297 : 210;
  const centerX = pageW / 2;
  const logo = await loadLogoBase64();

  // Logo on left — height computed from natural aspect ratio
  const logoW = 28;
  const logoX = 15;
  const logoY = 8;
  const logoH = await computeLogoHeight(logoW);

  if (logo) {
    doc.addImage(logo, "PNG", logoX, logoY, logoW, logoH);
  }

  // Text next to logo — gap of 8mm to avoid overlap
  const textX = logoX + logoW + 8;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 78, 121);
  doc.text("ÉCOLE DE FORMATION DE LA CCAA (EFO)", textX, 15);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text("CAMEROON CIVIL AVIATION AUTHORITY (CCAA)", textX, 21);

  // Separator line
  doc.setDrawColor(46, 117, 182);
  doc.setLineWidth(0.4);
  doc.line(15, 30, pageW - 15, 30);

  // Report title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 78, 121);
  doc.text(titre, centerX, 38, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(sousTitre, centerX, 44, { align: "center" });

  return 50; // yPos after header
}

export function addPageFooters(doc: jsPDF, orientation: "landscape" | "portrait" = "landscape") {
  const pageW = orientation === "landscape" ? 297 : 210;
  const pageH = orientation === "landscape" ? 210 : 297;
  const totalPages = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const footerY = pageH - 10;

    // Top border line
    doc.setDrawColor(174, 214, 241);
    doc.setLineWidth(0.3);
    doc.line(15, footerY - 4, pageW - 15, footerY - 4);

    // Left: app name
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(31, 78, 121);
    doc.text("GPerf-EFO", 15, footerY);

    // Center: page number
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Page ${i} / ${totalPages}`, pageW / 2, footerY, { align: "center" });

    // Right: confidentiality
    doc.setFont("helvetica", "italic");
    doc.text("EFO / CCAA — Confidentiel", pageW - 15, footerY, { align: "right" });
  }
}
