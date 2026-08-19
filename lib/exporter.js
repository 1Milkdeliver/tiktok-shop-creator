// TikTok Shop Creator Scraper — 专为 TikTok Shop 卖家打造
'use strict';

const fs = require('fs');
const path = require('path');

// default keyword list used when user doesn't provide one
const DEFAULT_KEYWORDS = [
  'beauty','makeup','skincare','cosmetics','haircare','nails','lashes','perfume','spa','tanning',
  'fashion','outfit','clothing','shoes','boots','sneakers','handbag','jewelry','accessories','sunglasses',
  'lingerie','thrift','haul','pet','dog','cat','puppy','kitten','pet supplies','dog mom','cat mom',
  'aquarium','bird','home','kitchen','decor','cleaning','organization','furniture','bedding','garden',
  'diy','renovation','tech','gadget','phone','iphone','tablet','laptop','smart home','camera','gaming',
  'gamer','unboxing','review','mom','baby','kids','parenting','toddler','newborn','fitness','workout',
  'gym','health','wellness','yoga','weight loss','food','cooking','recipe','baking','snacks','coffee',
  'tea','car','auto','truck','motorcycle','sports','outdoor','camping','hiking','fishing','cycling',
  'lifestyle','vlog','travel','book','reading','art','craft','budget','deal','coupon','shopping',
  'target','walmart','amazon','belleza','moda','mascotas','cocina','maquillaje','cuidado','hogar',
  'tecnologia','ropa','skincare routine','self care','grwm','get ready with me','amazon finds',
  'tiktok made me buy','meal prep','cleaning hacks','organization hacks','home finds','clothing haul',
  'makeup tutorial','tech review','gadget review','phone case','cute','aesthetic','viral','fyp',
  'product review'
];

// escape a single CSV cell
function csvCell(v) {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function toCsv(rows, headers) {
  const lines = [headers.map(csvCell).join(',')];
  for (const r of rows) {
    lines.push(headers.map(h => csvCell(r[h])).join(','));
  }
  return lines.join('\r\n');
}

async function exportCsv(filePath, rows, headers) {
  fs.writeFileSync(filePath, '\uFEFF' + toCsv(rows, headers), 'utf8');
}

async function exportXlsx(filePath, rows, headers) {
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('达人数据');
  ws.addRow(headers);
  // style header
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  for (const r of rows) {
    ws.addRow(headers.map(h => r[h] === null || r[h] === undefined ? '' : r[h]));
  }
  // column widths
  headers.forEach((h, i) => { ws.getColumn(i + 1).width = 20; });
  await wb.xlsx.writeFile(filePath);
}

// merge list rows with detail rows (detail wins for overlapping keys)
function mergeRows(listRows, detailRows) {
  if (!detailRows || !detailRows.length) return listRows;
  const detailByOid = new Map();
  for (const d of detailRows) detailByOid.set(String(d.creator_oecuid), d);
  return listRows.map(r => {
    const d = detailByOid.get(String(r.creator_oecuid));
    return d ? { ...r, ...d } : r;
  });
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

module.exports = { exportCsv, exportXlsx, mergeRows, ensureDir, DEFAULT_KEYWORDS };
