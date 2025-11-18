/**
 * Export Utilities
 *
 * Provides functions to export data in various formats (CSV, JSON, etc.)
 */

import { logger } from './logger';

/**
 * Export data as JSON file
 */
export function exportJSON<T>(data: T, filename = 'export.json'): void {
  try {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, filename);

    logger.info(`[Export] JSON exported: ${filename}`);
  } catch (error) {
    logger.error('[Export] JSON export failed:', error);
    throw new Error('Failed to export JSON');
  }
}

/**
 * Export data as CSV file
 */
export function exportCSV<T extends Record<string, unknown>>(
  data: T[],
  filename = 'export.csv',
  columns?: { key: keyof T; label: string }[]
): void {
  try {
    if (data.length === 0) {
      throw new Error('No data to export');
    }

    // Determine columns
    const cols = columns || Object.keys(data[0] ?? {}).map((key) => ({ key: key as keyof T, label: key }));

    // Create header row
    const header = cols.map((col) => escapeCsvValue(col.label)).join(',');

    // Create data rows
    const rows = data.map((row) => {
      return cols
        .map((col) => {
          const value = row[col.key];
          return escapeCsvValue(String(value ?? ''));
        })
        .join(',');
    });

    // Combine header and rows
    const csv = [header, ...rows].join('\n');

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, filename);

    logger.info(`[Export] CSV exported: ${filename} (${data.length} rows)`);
  } catch (error) {
    logger.error('[Export] CSV export failed:', error);
    throw new Error('Failed to export CSV');
  }
}

/**
 * Escape CSV value (handle commas, quotes, newlines)
 */
function escapeCsvValue(value: string): string {
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Export data as XML file
 */
export function exportXML(data: unknown, filename = 'export.xml', rootElement = 'root'): void {
  try {
    const xml = jsonToXml(data, rootElement);
    const blob = new Blob([xml], { type: 'application/xml' });
    downloadBlob(blob, filename);

    logger.info(`[Export] XML exported: ${filename}`);
  } catch (error) {
    logger.error('[Export] XML export failed:', error);
    throw new Error('Failed to export XML');
  }
}

/**
 * Convert JSON to XML
 */
function jsonToXml(data: unknown, rootElement: string): string {
  const buildXml = (obj: unknown, indent = 0): string => {
    const spacing = '  '.repeat(indent);

    if (Array.isArray(obj)) {
      return obj.map((item) => buildXml(item, indent)).join('\n');
    }

    if (typeof obj === 'object' && obj !== null) {
      return Object.entries(obj)
        .map(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            return `${spacing}<${key}>\n${buildXml(value, indent + 1)}\n${spacing}</${key}>`;
          }
          return `${spacing}<${key}>${escapeXml(String(value))}</${key}>`;
        })
        .join('\n');
    }

    return `${spacing}${escapeXml(String(obj))}`;
  };

  const content = buildXml(data, 1);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootElement}>\n${content}\n</${rootElement}>`;
}

/**
 * Escape XML special characters
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Download blob as file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy data to clipboard as JSON
 */
export async function copyToClipboard(data: unknown): Promise<void> {
  try {
    const json = JSON.stringify(data, null, 2);
    await navigator.clipboard.writeText(json);
    logger.info('[Export] Copied to clipboard');
  } catch (error) {
    logger.error('[Export] Copy to clipboard failed:', error);
    throw new Error('Failed to copy to clipboard');
  }
}

/**
 * Export data as text file
 */
export function exportText(text: string, filename = 'export.txt'): void {
  try {
    const blob = new Blob([text], { type: 'text/plain' });
    downloadBlob(blob, filename);

    logger.info(`[Export] Text exported: ${filename}`);
  } catch (error) {
    logger.error('[Export] Text export failed:', error);
    throw new Error('Failed to export text');
  }
}

/**
 * Print data (open print dialog)
 */
export function printData(html: string): void {
  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    throw new Error('Failed to open print window');
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        ${html}
        <script>
          window.onload = () => {
            window.print();
            setTimeout(() => window.close(), 100);
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
}

/**
 * Convert buildings data to CSV format
 */
export function exportBuildingsCSV(
  buildings: Array<{
    id: string;
    properties: {
      name: string | null;
      address: string | null;
      city: string | null;
      country: string | null;
      height: number | null;
      floorCount: number | null;
      modelUrl?: string | null;
    };
    geometry: {
      coordinates: [number, number];
    };
  }>,
  filename = 'buildings.csv'
): void {
  const data = buildings.map((b) => ({
    ID: b.id,
    Name: b.properties.name || '',
    Address: b.properties.address || '',
    City: b.properties.city || '',
    Country: b.properties.country || '',
    Height: b.properties.height || '',
    'Floor Count': b.properties.floorCount || '',
    Longitude: b.geometry.coordinates[0],
    Latitude: b.geometry.coordinates[1],
    '3D Model': b.properties.modelUrl ? 'Yes' : 'No',
  }));

  exportCSV(data, filename);
}
