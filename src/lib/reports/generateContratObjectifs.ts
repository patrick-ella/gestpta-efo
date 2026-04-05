import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, ShadingType, BorderStyle, HeadingLevel,
} from "docx";
import { format } from "date-fns";

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

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const margins = { top: 60, bottom: 60, left: 80, right: 80 };

function headerCell(text: string, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders,
    margins,
    shading: { fill: "1F4E79", type: ShadingType.CLEAR },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, color: "FFFFFF", font: "Arial", size: 18 })],
    })],
  });
}

function dataCell(text: string, width: number, opts?: { bold?: boolean; center?: boolean; color?: string }): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders,
    margins,
    children: [new Paragraph({
      alignment: opts?.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({
        text, font: "Arial", size: 20,
        bold: opts?.bold, color: opts?.color,
      })],
    })],
  });
}

export async function generateContratObjectifs(
  agent: AgentInfo,
  assignations: Assignation[],
  exercice: number
): Promise<Uint8Array> {
  const totalPoids = assignations.reduce((s, a) => s + a.poids_objectif, 0);

  const colWidths = [700, 3200, 1000, 1200, 2826];

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell("N°", colWidths[0]),
      headerCell("INTITULÉ DE L'OBJECTIF", colWidths[1]),
      headerCell("POIDS (%)", colWidths[2]),
      headerCell("DATE LIMITE", colWidths[3]),
      headerCell("CRITÈRES DE RÉUSSITE / LIVRABLES", colWidths[4]),
    ],
  });

  const dataRows = assignations.map((a, idx) =>
    new TableRow({
      children: [
        dataCell(String(idx + 1).padStart(2, "0"), colWidths[0], { center: true }),
        dataCell(a.sous_tache_libelle, colWidths[1]),
        dataCell(`${a.poids_objectif}%`, colWidths[2], { bold: true, center: true }),
        dataCell(
          a.date_limite ? format(new Date(a.date_limite), "dd/MM/yyyy") : "—",
          colWidths[3], { center: true }
        ),
        new TableCell({
          width: { size: colWidths[4], type: WidthType.DXA },
          borders, margins,
          children: a.extrants.length > 0
            ? a.extrants.map(e => new Paragraph({ children: [new TextRun({ text: `• ${e.libelle}`, font: "Arial", size: 20 })] }))
            : [new Paragraph({ children: [new TextRun({ text: "—", font: "Arial", size: 20 })] })],
        }),
      ],
    })
  );

  const totalRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: 2, width: { size: colWidths[0] + colWidths[1], type: WidthType.DXA },
        borders, margins,
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "TOTAL", bold: true, font: "Arial", size: 20 })] })],
      }),
      dataCell(`${totalPoids}%`, colWidths[2], {
        bold: true, center: true,
        color: totalPoids === 100 ? "22C55E" : "EF4444",
      }),
      dataCell("", colWidths[3]),
      dataCell("", colWidths[4]),
    ],
  });

  const p = (text: string, opts?: { bold?: boolean; italic?: boolean; size?: number; spacing?: number }) =>
    new Paragraph({
      spacing: { before: opts?.spacing ?? 100 },
      children: [new TextRun({ text, font: "Arial", size: opts?.size ?? 20, bold: opts?.bold, italics: opts?.italic })],
    });

  const labelValue = (label: string, value: string) =>
    new Paragraph({
      spacing: { before: 60 },
      children: [
        new TextRun({ text: label, font: "Arial", size: 20, bold: true }),
        new TextRun({ text: value, font: "Arial", size: 20 }),
      ],
    });

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1800, right: 1440 },
        },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: `CONTRAT D'OBJECTIFS — EXERCICE ${exercice}`, font: "Arial", size: 28, bold: true, color: "1F4E79" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [new TextRun({ text: "CAMEROON CIVIL AVIATION AUTHORITY — ÉCOLE DE FORMATION (EFO)", font: "Arial", size: 18, color: "666666" })],
        }),
        labelValue("DIRECTION / SOUS-DIRECTION : ", agent.direction ?? "............."),
        labelValue("SERVICE / BUREAU : ", agent.service ?? "............."),
        labelValue("NOMS ET PRÉNOMS DE L'AGENT : ", agent.nom_complet),
        labelValue("MATRICULE : ", agent.matricule ?? "............."),
        labelValue("POSTE DE TRAVAIL : ", agent.poste_travail ?? "............."),
        labelValue("DATE : ", String(exercice)),
        new Paragraph({ spacing: { before: 300 } }),
        new Table({
          width: { size: 8926, type: WidthType.DXA },
          columnWidths: colWidths,
          rows: [headerRow, ...dataRows, totalRow],
        }),
        p(""),
        new Paragraph({
          spacing: { before: 200 },
          children: [
            new TextRun({ text: "NB : ", bold: true, font: "Arial", size: 18 }),
            new TextRun({ text: "1- Les objectifs doivent émaner du Plan de travail individuel annuel (PTI) découlant du PTA. Chaque objectif doit être SMART.", font: "Arial", size: 18, italics: true }),
          ],
        }),
        new Paragraph({
          children: [new TextRun({ text: "2- La somme des poids des objectifs doit être égale à 100.", bold: true, font: "Arial", size: 18, italics: true })],
        }),
        new Paragraph({ spacing: { before: 600 } }),
        new Table({
          width: { size: 8926, type: WidthType.DXA },
          columnWidths: [2975, 2975, 2976],
          rows: [new TableRow({
            children: [
              new TableCell({ width: { size: 2975, type: WidthType.DXA }, borders: { top: cellBorder, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } }, children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Signature de l'Agent", bold: true, font: "Arial", size: 18 })] }),
                new Paragraph({ spacing: { before: 600 } }),
              ] }),
              new TableCell({ width: { size: 2975, type: WidthType.DXA }, borders: { top: cellBorder, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } }, children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Signature du Supérieur (N+1)", bold: true, font: "Arial", size: 18 })] }),
                new Paragraph({ spacing: { before: 600 } }),
              ] }),
              new TableCell({ width: { size: 2976, type: WidthType.DXA }, borders: { top: cellBorder, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } }, children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Signature du DAG", bold: true, font: "Arial", size: 18 })] }),
                new Paragraph({ spacing: { before: 600 } }),
              ] }),
            ],
          })],
        }),
      ],
    }],
  });

  return Packer.toBuffer(doc) as unknown as Promise<Uint8Array>;
}
