import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Task } from '@/types';

// Export to Excel
export function exportToExcel(data: Task[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(
    data.map((task, idx) => ({
      '#': idx + 1,
      'Title': task.title,
      'Status': task.task_statuses?.name_en || task.task_statuses?.name || '',
      'Assignee': task.employees?.full_name || '',
      'Department': task.departments?.name_en || task.departments?.name || '',
      'Group': task.task_groups?.name_en || task.task_groups?.name || '',
      'Priority': task.priority,
      'Progress (%)': task.progress_percentage,
      'Start Date': task.start_date || '',
      'End Date': task.end_date || '',
      'Description': task.description || '',
      'Solution': task.solution || '',
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// Export to PDF
export function exportToPDF(data: Task[], title: string) {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

  autoTable(doc, {
    startY: 38,
    head: [['#', 'Title', 'Status', 'Assignee', 'Priority', 'Progress', 'Start', 'End']],
    body: data.map((task, idx) => [
      idx + 1,
      task.title,
      task.task_statuses?.name_en || task.task_statuses?.name || '',
      task.employees?.full_name || '',
      task.priority,
      `${task.progress_percentage}%`,
      task.start_date || '',
      task.end_date || '',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// Export to Word
export function exportToWord(data: Task[], title: string) {
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><title>${title}</title>
    <style>
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
      th { background-color: #3B82F6; color: white; }
      h1 { color: #1F2937; }
    </style></head><body>
    <h1>${title}</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
    <table>
      <tr><th>#</th><th>Title</th><th>Status</th><th>Assignee</th><th>Priority</th><th>Progress</th><th>Start</th><th>End</th></tr>
  `;

  data.forEach((task, idx) => {
    html += `<tr>
      <td>${idx + 1}</td>
      <td>${task.title}</td>
      <td>${task.task_statuses?.name_en || ''}</td>
      <td>${task.employees?.full_name || ''}</td>
      <td>${task.priority}</td>
      <td>${task.progress_percentage}%</td>
      <td>${task.start_date || ''}</td>
      <td>${task.end_date || ''}</td>
    </tr>`;
  });

  html += '</table></body></html>';

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  saveAs(blob, `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.doc`);
}

// Export to Image (PNG)
export async function exportToImage(data: Task[]) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = 1200;
  canvas.height = 600 + data.length * 30;

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Title
  ctx.fillStyle = '#1F2937';
  ctx.font = 'bold 24px Arial';
  ctx.fillText('Tasks Report', 30, 40);
  ctx.font = '12px Arial';
  ctx.fillStyle = '#6B7280';
  ctx.fillText(`Generated: ${new Date().toLocaleString()}`, 30, 60);

  // Table header
  ctx.fillStyle = '#3B82F6';
  ctx.fillRect(20, 80, canvas.width - 40, 30);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 11px Arial';
  ctx.fillText('#', 30, 100);
  ctx.fillText('Title', 60, 100);
  ctx.fillText('Status', 360, 100);
  ctx.fillText('Assignee', 500, 100);
  ctx.fillText('Progress', 650, 100);
  ctx.fillText('Start Date', 780, 100);
  ctx.fillText('End Date', 920, 100);

  // Table rows
  data.forEach((task, idx) => {
    const y = 120 + idx * 25;
    ctx.fillStyle = idx % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
    ctx.fillRect(20, y, canvas.width - 40, 25);
    ctx.fillStyle = '#374151';
    ctx.font = '10px Arial';
    ctx.fillText(String(idx + 1), 30, y + 16);
    ctx.fillText(task.title.substring(0, 40), 60, y + 16);
    ctx.fillText(task.task_statuses?.name_en || '', 360, y + 16);
    ctx.fillText(task.employees?.full_name || '', 500, y + 16);
    ctx.fillText(`${task.progress_percentage}%`, 650, y + 16);
    ctx.fillText(task.start_date || '', 780, y + 16);
    ctx.fillText(task.end_date || '', 920, y + 16);
  });

  canvas.toBlob((blob) => {
    if (blob) saveAs(blob, `tasks_report_${new Date().toISOString().split('T')[0]}.png`);
  });
}

// Import from Excel
export async function importFromExcel(file: File): Promise<Record<string, unknown>[] | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);
      resolve(json as Record<string, unknown>[]);
    };
    reader.readAsArrayBuffer(file);
  });
}