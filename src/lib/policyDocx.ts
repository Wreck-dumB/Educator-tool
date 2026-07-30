import { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle } from "docx";
import type { Policy } from "@/lib/types/domain";

// Builds an editable Word document for a policy, mirroring the layout of the
// printable /policies/[id] page (same disclaimer + approval signature block)
// so both exports read as the same document.
export async function buildPolicyDocx(policy: Policy): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      text: policy.category.toUpperCase(),
      spacing: { after: 100 },
    }),
    new Paragraph({
      text: policy.title,
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({
      text: `Drafted ${new Date(policy.created_at).toLocaleDateString()}`,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "This is a starting draft. It must be reviewed, customised, and formally approved by your approved provider or nominated supervisor before adoption as a service policy.",
          italics: true,
        }),
      ],
      spacing: { after: 300 },
    }),
  ];

  if (policy.purpose) {
    children.push(
      new Paragraph({ text: "Purpose", heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: policy.purpose, spacing: { after: 200 } }),
    );
  }

  if (policy.scope) {
    children.push(
      new Paragraph({ text: "Scope", heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: policy.scope, spacing: { after: 200 } }),
    );
  }

  if (policy.procedure_steps.length > 0) {
    children.push(new Paragraph({ text: "Procedure", heading: HeadingLevel.HEADING_1 }));
    policy.procedure_steps.forEach((step) => {
      if (step.type === "heading") {
        children.push(
          new Paragraph({ text: step.text, heading: step.level > 0 ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_2 }),
        );
      } else if (step.type === "list_item") {
        children.push(new Paragraph({ text: step.text, bullet: { level: step.level } }));
      } else {
        children.push(new Paragraph({ text: step.text, spacing: { after: 100 } }));
      }
    });
  }

  if (policy.related_legislation.length > 0) {
    children.push(new Paragraph({ text: "Related legislation / areas", heading: HeadingLevel.HEADING_1 }));
    policy.related_legislation.forEach((item) => {
      children.push(new Paragraph({ text: item, bullet: { level: 0 } }));
    });
  }

  if (policy.suggested_additions.length > 0) {
    children.push(
      new Paragraph({ text: "Worth considering — not yet reflected in this draft", heading: HeadingLevel.HEADING_1 }),
    );
    policy.suggested_additions.forEach((item) => {
      children.push(new Paragraph({ text: item, bullet: { level: 0 } }));
    });
  }

  children.push(
    new Paragraph({
      text: policy.reviewed_at ? `Reviewed ${new Date(policy.reviewed_at).toLocaleDateString()}` : "Unreviewed draft",
      spacing: { before: 400, after: 300 },
    }),
    new Paragraph({ text: "Approval", heading: HeadingLevel.HEADING_1 }),
    ...signatureLine("Approved by (name)"),
    ...signatureLine("Position / role"),
    ...signatureLine("Signature"),
    ...signatureLine("Date / next review date"),
  );

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

function signatureLine(label: string): Paragraph[] {
  return [
    new Paragraph({
      spacing: { before: 300, after: 60 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999" } },
      children: [new TextRun({ text: " " })],
    }),
    new Paragraph({
      children: [new TextRun({ text: label, size: 18, color: "888888" })],
      spacing: { after: 200 },
    }),
  ];
}
