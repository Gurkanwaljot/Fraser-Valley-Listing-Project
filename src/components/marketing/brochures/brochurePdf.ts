import { jsPDF } from 'jspdf';
import { domToCanvas } from 'modern-screenshot';
import { RASTER_SCALE } from './brochureTypes';

interface ExportOptions {
  nodes: HTMLElement[];
  widthPt: number;
  heightPt: number;
  filename: string;
  scale?: number;
  onProgress?: (page: number, total: number) => void;
}

export async function exportBrochurePdf(opts: ExportOptions): Promise<void> {
  const { nodes, widthPt, heightPt, filename, scale = RASTER_SCALE, onProgress } = opts;
  if (nodes.length === 0) throw new Error('No pages to export');

  if (typeof document !== 'undefined' && document.fonts && 'ready' in document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // continue with fallback fonts
    }
  }

  const orientation = widthPt > heightPt ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ unit: 'pt', format: [widthPt, heightPt], orientation, compress: true });

  try {
    for (let i = 0; i < nodes.length; i += 1) {
      onProgress?.(i + 1, nodes.length);
      const node = nodes[i];
      const width = node.offsetWidth;
      const height = node.offsetHeight;
      if (!width || !height) throw new Error(`Page ${i + 1} is not ready to render`);

      const canvas = await domToCanvas(node, {
        scale,
        width,
        height,
        backgroundColor: '#FFFFFF',
        style: { position: 'static', left: '0', top: '0', margin: '0', transform: 'none' },
        fetch: { requestInit: { mode: 'cors' } },
      });

      const jpeg = canvas.toDataURL('image/jpeg', 1.0);
      if (i > 0) pdf.addPage([widthPt, heightPt], orientation);
      pdf.addImage(jpeg, 'JPEG', 0, 0, widthPt, heightPt);

      // Release the large canvas before rendering the next page.
      canvas.width = 0;
      canvas.height = 0;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    pdf.save(filename);
  } catch (err) {
    throw err instanceof Error ? err : new Error('PDF export failed');
  }
}
