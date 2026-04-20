import jsPDF from "jspdf";
import logoSrc from "@/assets/logo-efo.png";

let cachedLogoBase64: string | null = null;

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

export async function addReportHeader(
  doc: jsPDF,
  titre: string,
  sousTitre: string,
  orientation: "landscape" | "portrait" = "landscape"
) {
  const pageW = orientation === "landscape" ? 297 : 210;
  const centerX = pageW / 2;
  const logo = await loadLogoBase64();

  // Logo on left
  const logoW = 28;
  const logoH = 20;
  const logoX = 15;
  const logoY = 8;

  if (logo) {
    doc.addImage(logo, "PNG", logoX, logoY, logoW, logoH);
  }

  // Text next to logo
  const textX = logoX + logoW + 4;
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
