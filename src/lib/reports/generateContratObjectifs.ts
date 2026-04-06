import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { addReportHeader, addPageFooters } from "./pdfHeader";

interface AgentInfo {
  nom_complet: string;
  matricule?: string | null;
  direction?: string | null;
  service?: string | null;
  poste_travail?: string | null;
}

interface Assignation {
  sous_tache_libelle: string;
  sous_tache_code: string;
  poids_objectif: number;
  date_limite?: string | null;
  extrants: { libelle: string }[];
}

export async function generateContratObjectifs(
  agent: AgentInfo,
  assignations: Assignation[],
  exercice: number
): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const marginL = 15;
  const marginR = 15;
  const contentW = pageW - marginL - marginR;

  // Header
  let y = await addReportHeader(
    doc,
    `CONTRAT D'OBJECTIFS — EXERCICE ${exercice}`,
    "Plan de Travail Individuel (PTI)",
    "portrait"
  );

  // Agent identification block
  y += 4;
  const labelX = marginL;
  const valueX = marginL + 55;

  const fields: [string, string][] = [
    ["Direction / Sous-Direction :", agent.direction ?? "............."],
    ["Service / Bureau :", agent.service ?? "............."],
    ["Noms et Prénoms :", agent.nom_complet],
    ["Matricule :", agent.matricule ?? "............."],
    ["Poste de Travail :", agent.poste_travail ?? "............."],
    ["Exercice :", String(exercice)],
  ];

  doc.setFontSize(9);
  for (const [label, value] of fields) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(31, 78, 121);
    doc.text(label, labelX, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(value, valueX, y);
    y += 6;
  }

  y += 4;

  // Objectives table
  const totalPoids = assignations.reduce((s, a) => s + a.poids_objectif, 0);

  const tableBody = assignations.map((a, idx) => [
    String(idx + 1).padStart(2, "0"),
    a.sous_tache_libelle,
    `${a.poids_objectif}%`,
    a.date_limite ? format(new Date(a.date_limite), "dd/MM/yyyy") : "—",
    a.extrants.length > 0
      ? a.extrants.map((e) => `• ${e.libelle}`).join("\n")
      : "—",
  ]);

  // Add total row
  tableBody.push([
    { content: "TOTAL", colSpan: 2, styles: { halign: "right" as const, fontStyle: "bold" as const } } as any,
    {
      content: `${totalPoids}%`,
      styles: {
        fontStyle: "bold" as const,
        halign: "center" as const,
        textColor: totalPoids === 100 ? [34, 197, 94] : [239, 68, 68],
      },
    } as any,
    "",
    "",
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: marginL, right: marginR },
    head: [["N°", "INTITULÉ DE L'OBJECTIF", "POIDS (%)", "DATE LIMITE", "CRITÈRES DE RÉUSSITE / LIVRABLES"]],
    body: tableBody,
    headStyles: {
      fillColor: [31, 78, 121],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [40, 40, 40],
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: contentW * 0.38 },
      2: { cellWidth: 18, halign: "center", fontStyle: "bold" },
      3: { cellWidth: 22, halign: "center" },
      4: { cellWidth: "auto" },
    },
    theme: "grid",
    styles: {
      lineColor: [150, 150, 150],
      lineWidth: 0.2,
    },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // NB notes
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 40, 40);
  doc.text("NB :", marginL, y);
  doc.setFont("helvetica", "italic");
  doc.text(
    "1- Les objectifs doivent émaner du Plan de travail individuel annuel (PTI) découlant du PTA. Chaque objectif doit être SMART.",
    marginL + 8,
    y
  );
  y += 4;
  doc.setFont("helvetica", "bolditalic");
  doc.text(
    "2- La somme des poids des objectifs doit être égale à 100.",
    marginL + 8,
    y
  );

  // Signature block
  y += 16;

  // Check if signature block fits, otherwise add new page
  if (y + 30 > 280) {
    doc.addPage();
    y = 30;
  }

  // Separator line above signatures
  doc.setDrawColor(31, 78, 121);
  doc.setLineWidth(0.3);
  doc.line(marginL, y, pageW - marginR, y);
  y += 6;

  const colW = contentW / 3;
  const sigLabels = [
    "Signature de l'Agent",
    "Signature du Supérieur (N+1)",
    "Signature du DAG",
  ];

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 78, 121);

  sigLabels.forEach((label, i) => {
    const x = marginL + colW * i + colW / 2;
    doc.text(label, x, y, { align: "center" });

    // Signature line
    const lineY = y + 20;
    const lineStart = marginL + colW * i + 8;
    const lineEnd = marginL + colW * (i + 1) - 8;
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.2);
    doc.line(lineStart, lineY, lineEnd, lineY);
  });

  // Footer
  addPageFooters(doc, "portrait");

  // Save
  doc.save(`Contrat_Objectifs_${agent.matricule ?? "agent"}_${exercice}.pdf`);
}
