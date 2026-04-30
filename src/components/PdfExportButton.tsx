import { useState } from 'react';

interface PdfExportButtonProps { className?: string; }

export function PdfExportButton({ className = '' }: PdfExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
        document.fonts.ready,
      ]);

      const root = document.getElementById('report-root') as HTMLElement | null;
      if (!root) throw new Error('report-root not found');

      // 导出模式（配合 index.css 里的 .exporting 规则）
      root.classList.add('exporting');

      // 规范颜色，去除 oklch/var()/p3 源
      const normalizeColors = (host: HTMLElement) => {
        const nodes = host.querySelectorAll('*');
        let n = 0;
        nodes.forEach((el) => {
          const cs = getComputedStyle(el as Element);
          const htmlEl = el as HTMLElement;

          const props = [
            'color', 'backgroundColor',
            'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
            'outlineColor', 'caretColor', 'fill', 'stroke',
          ];

          props.forEach((p) => {
            const v = (cs as CSSStyleDeclaration)[p] as string | undefined;
            if (!v) return;
            if (/oklch|oklab|display-p3|var\(/i.test(v)) {
              // 强制浏览器返回 rgb/rgba
              (htmlEl.style as CSSStyleDeclaration).setProperty(p, v, 'important');
              const rgb = (getComputedStyle(htmlEl) as CSSStyleDeclaration)[p] as string | undefined;
              if (rgb && /^rgba?\(/i.test(rgb)) {
                (htmlEl.style as CSSStyleDeclaration).setProperty(p, rgb, 'important');
                n++;
              }
            }
          });

          // 影子/滤镜可能带不受支持的颜色
          if (/oklch|oklab|display-p3|var\(/i.test(cs.boxShadow)) { htmlEl.style.boxShadow = 'none'; n++; }
          if (/oklch|oklab|display-p3|var\(/i.test(cs.textShadow)) { htmlEl.style.textShadow = 'none'; n++; }
          if (/oklch|oklab|display-p3|var\(/i.test(cs.filter))     { htmlEl.style.filter = 'none'; n++; }

          // SVG fill/stroke
          if (el instanceof SVGElement) {
            const fill = cs.fill, stroke = cs.stroke;
            if (fill && /oklch|oklab|var\(/i.test(fill)) {
              const f = getComputedStyle(el).fill;
              if (/^rgba?\(/i.test(f)) {
                el.setAttribute('fill', f);
                n++;
              }
            }
            if (stroke && /oklch|oklab|var\(/i.test(stroke)) {
              const s = getComputedStyle(el).stroke;
              if (/^rgba?\(/i.test(s)) {
                el.setAttribute('stroke', s);
                n++;
              }
            }
          }
        });
        console.log(`Normalized colors on ${n} elements`);
      };

      normalizeColors(root);

      // 确保 <img> 可截
      root.querySelectorAll('img').forEach((img) => {
        (img as HTMLImageElement).crossOrigin = 'anonymous';
      });

      // 等待布局稳定
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise(r => setTimeout(r, 150));

      // 截图
      const canvas = await html2canvas(root, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        scale: 2,
        windowWidth: root.scrollWidth,
        windowHeight: root.scrollHeight,
        logging: false,
      });

      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;

      // 分页切片，重叠 10pt 避免边框被切
      const overlap = 10;
      for (let y = 0; y < imgH; y += pageH - overlap) {
        const sy = Math.floor((y / imgH) * canvas.height);
        const sH = Math.min(
          Math.floor(((pageH - (y > 0 ? overlap : 0)) / imgH) * canvas.height),
          canvas.height - sy
        );

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sH;
        const ctx = pageCanvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context failed');

        ctx.drawImage(canvas, 0, sy, canvas.width, sH, 0, 0, canvas.width, sH);

        if (y > 0) pdf.addPage();
        pdf.addImage(
          pageCanvas.toDataURL('image/png'),
          'PNG',
          0,
          0,
          imgW,
          (sH * imgW) / canvas.width
        );
      }

      const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      pdf.save(`bridge-stay-roi-${ts}.pdf`);
    } catch (e: unknown) {
      console.error('PDF Export Error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      alert(`Failed to generate PDF: ${errorMessage}`);
    } finally {
      const root = document.getElementById('report-root');
      if (root) root.classList.remove('exporting');
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={`no-export inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isExporting ? (
        <>
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Exporting...
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export PDF
        </>
      )}
    </button>
  );
}
