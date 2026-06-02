// Trigger a browser download from in-memory data.
function trigger(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const escapeCSV = (v) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function downloadCSV(filename, header, rows) {
  const lines = [header.map(escapeCSV).join(",")];
  rows.forEach((r) => lines.push(r.map(escapeCSV).join(",")));
  trigger(new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" }), filename);
}

export function downloadText(filename, text, mime = "text/plain;charset=utf-8") {
  trigger(new Blob([text], { type: mime }), filename);
}
