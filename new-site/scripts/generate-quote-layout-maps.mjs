/**
 * Original, number-free schematics based on the private November 2026 quote review.
 * No source screenshots, customer details, amounts, dates, logos or vehicle details are copied.
 * Run: node scripts/generate-quote-layout-maps.mjs (from new-site/).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const layouts = {
  sgfleet: {
    name: 'SG Fleet',
    sections: [
      { name: 'Lease details', rows: [
        { label: 'Vehicle on-road cost (incl. GST)', field: 'driveaway' },
        { label: 'PPSR fee', field: 'docFee' },
        { label: 'Residual value (incl. GST)', field: 'residual' },
        { label: 'Monthly lease rental', field: 'payment' },
        { label: 'Payable as [payment count]', field: 'defer' },
      ] },
      { name: 'Package details', rows: [
        { label: 'Lease rental', field: 'payment' },
        { label: 'Package management fee', field: 'running' },
        { label: 'Fuel or charging, tyres, servicing and insurance', field: 'running' },
      ] },
      { name: 'FBT details on a later page', rows: [
        { label: 'FBT Base Value', field: 'baseValue' },
      ] },
    ],
  },
  smartleasing: {
    name: 'Smart Leasing',
    sections: [
      { name: 'Vehicle and finance', rows: [
        { label: 'FBT base value', field: 'baseValue' },
        { label: 'Months deferred', field: 'defer' },
        { label: 'Residual', field: 'residual' },
        { label: 'Residual incl GST', field: 'residual' },
        { label: 'Lease per month', field: 'payment' },
        { label: 'Lease incl GST per month', field: 'payment' },
      ] },
      { name: 'Running Cost Budgets (exc GST)', rows: [
        { label: 'Insurance, registration and servicing', field: 'running' },
        { label: 'Management fees', field: 'running' },
      ] },
    ],
  },
  maxxia: {
    name: 'Maxxia',
    sections: [
      { name: 'Vehicle details', rows: [
        { label: 'Vehicle FBT Base Value', field: 'baseValue' },
        { label: 'Car price (based on on roads)', field: 'driveaway' },
      ] },
      { name: 'Finance details', rows: [
        { label: "Financier's Establishment Fee", field: 'docFee' },
        { label: 'Total residual value', field: 'residual' },
        { label: 'Financed payments', field: 'payment' },
        { label: 'First year Comprehensive Insurance', field: 'insurance' },
      ] },
      { name: 'Running costs', rows: [
        { label: 'Insurance renewal', field: 'insurance' },
        { label: 'Incidentals', field: 'running' },
      ] },
    ],
  },
  paywise: {
    name: 'Paywise',
    sections: [
      { name: 'Vehicle details', rows: [
        { label: 'FBT value', field: 'baseValue' },
        { label: 'Residual value (inc. GST)', field: 'residual' },
      ] },
      { name: 'Package Inclusions (ex. GST) – Fortnightly', rows: [
        { label: 'Lease Payment', field: 'payment' },
        { label: 'Lease Management', field: 'fees' },
        { label: 'Salary Packaging', field: 'fees' },
        { label: 'Other running-cost budgets', field: 'running' },
      ] },
    ],
  },
  smartsalary: {
    name: 'Smartsalary / Smart Drive',
    sections: [
      { name: 'Vehicle details', rows: [
        { label: 'FBT Base Value', field: 'baseValue' },
        { label: 'Residual (inc. GST)', field: 'residual' },
      ] },
      { name: 'Motor Vehicle Deductions (inc GST)', rows: [
        { label: 'Lease Payment (Fixed)', field: 'payment' },
        { label: 'Running-cost budgets', field: 'running' },
        { label: 'Less: Employer Claimed ITC', field: 'running' },
      ] },
    ],
  },
};

const outRoot = resolve('../docs/assets/images/quote-guide');
const esc = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const assertSafeText = (s) => {
  if (/[0-9@$]|https?:\/\//i.test(s)) throw new Error(`Quote schematic has a number or identifying string: ${s}`);
};

function layoutSvg(layout, field = null) {
  const rows = field
    ? layout.sections.flatMap((section) => section.rows.filter((row) => row.field === field).map((row) => ({ section: section.name, row })))
    : layout.sections.flatMap((section) => [{ section: section.name }, ...section.rows.map((row) => ({ row }))]);
  const width = 720;
  const height = 110 + rows.reduce((sum, item) => sum + (item.row ? 52 : 42), 0) + 50;
  let y = 100;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(layout.name)} schematic quote layout">`,
    `<rect width="${width}" height="${height}" fill="#ffffff"/>`,
    `<rect width="${width}" height="78" fill="#0f2c4c"/>`,
    `<text x="26" y="37" fill="#ffffff" font-family="Arial,sans-serif" font-size="24" font-weight="700">${esc(layout.name)}</text>`,
    `<text x="26" y="61" fill="#d8e8f9" font-family="Arial,sans-serif" font-size="14">Schematic quote layout · labels only</text>`,
  ];
  for (const item of rows) {
    if (item.section) {
      parts.push(`<rect x="20" y="${y - 17}" width="680" height="32" rx="5" fill="#e9f1fb"/>`);
      parts.push(`<text x="32" y="${y + 5}" fill="#174a80" font-family="Arial,sans-serif" font-size="17" font-weight="700">${esc(item.section)}</text>`);
      y += 42;
    }
    if (item.row) {
      const on = field === item.row.field;
      parts.push(`<rect x="20" y="${y - 21}" width="680" height="44" rx="6" fill="${on ? '#e4f3ff' : '#f7f9fc'}" stroke="${on ? '#0b5cab' : '#dce3ec'}" stroke-width="${on ? '2' : '1'}"/>`);
      parts.push(`<text x="34" y="${y + 5}" fill="#192d42" font-family="Arial,sans-serif" font-size="17">${esc(item.row.label)}</text>`);
      parts.push(`<rect x="592" y="${y - 9}" width="86" height="18" rx="4" fill="#e2e8f0"/>`);
      y += 52;
    }
  }
  parts.push(`<text x="26" y="${height - 15}" fill="#64748b" font-family="Arial,sans-serif" font-size="12">Original illustration based on a reviewed layout. Your quote may differ.</text>`);
  parts.push('</svg>');
  return parts.join('\n');
}

for (const [id, layout] of Object.entries(layouts)) {
  assertSafeText(layout.name);
  for (const section of layout.sections) {
    assertSafeText(section.name);
    for (const row of section.rows) assertSafeText(row.label);
  }
  const dir = resolve(outRoot, id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'layout.svg'), layoutSvg(layout));
  const fields = new Set(layout.sections.flatMap((section) => section.rows.map((row) => row.field)));
  for (const field of fields) writeFileSync(resolve(dir, `${field}.svg`), layoutSvg(layout, field));
}

console.log(`Generated number-free quote schematics for ${Object.keys(layouts).length} providers.`);
