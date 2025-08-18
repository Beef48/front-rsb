export async function printSvgFromContainer(container: HTMLElement, title = 'Graphique'): Promise<void> {
  const svg = container.querySelector('svg');
  if (!svg) {
    throw new Error('Aucun SVG détecté à imprimer');
  }

  const serializer = new XMLSerializer();
  const cloned = svg.cloneNode(true) as SVGSVGElement;
  const width = (svg as any).clientWidth || parseInt(cloned.getAttribute('width') || '0') || 1200;
  const height = (svg as any).clientHeight || parseInt(cloned.getAttribute('height') || '0') || 600;
  cloned.setAttribute('width', String(width));
  cloned.setAttribute('height', String(height));

  const svgString = serializer.serializeToString(cloned);

  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) {
    alert('Le navigateur a bloqué la fenêtre d\'impression. Autorisez les popups pour ce site.');
    return;
  }

  win.document.open();
  win.document.write(`<!DOCTYPE html>
  <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <title>${title}</title>
      <style>
        @page { margin: 10mm; size: A4 landscape; }
        html, body { height:auto; }
        body { margin:0; padding:0; background:#fff; overflow:hidden; }
        .wrap { width:100%; page-break-inside: avoid; break-inside: avoid; }
        .wrap svg { width:100% !important; height:auto !important; display:block; }
      </style>
    </head>
    <body>
      <div class="wrap">${svgString}</div>
      <script>window.onload = function(){ window.focus(); window.print(); setTimeout(function(){ window.close(); }, 100); }<\/script>
    </body>
  </html>`);
  win.document.close();
}

export async function printSvgInlineFromContainer(
  container: HTMLElement,
  title = 'Graphique',
  extraHtml?: string
): Promise<void> {
  const svg = container.querySelector('svg');
  if (!svg) throw new Error('Aucun SVG détecté à imprimer');

  const serializer = new XMLSerializer();
  const cloned = svg.cloneNode(true) as SVGSVGElement;
  const width = (svg as any).clientWidth || parseInt(cloned.getAttribute('width') || '0') || 1200;
  const height = (svg as any).clientHeight || parseInt(cloned.getAttribute('height') || '0') || 600;
  cloned.setAttribute('width', String(width));
  cloned.setAttribute('height', String(height));
  const svgString = serializer.serializeToString(cloned);

  const now = new Date();
  const dateStr = now.toLocaleString();
  const html = `<!DOCTYPE html>
  <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <title>${title}</title>
      <style>
        @page { margin: 10mm; size: A4 landscape; }
        html, body { height:auto; }
        body { margin:0; padding:0; background:#fff; overflow:hidden; }
        .wrap { width:100%; page-break-inside: avoid; break-inside: avoid; }
        .wrap svg { width:100% !important; height:auto !important; display:block; }
        .header { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; color:#111; }
        .title { font-size:16px; font-weight:600; }
        .date { font-size:12px; color:#374151; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="header">
          <div class="title">${title}</div>
          <div class="date">${dateStr}</div>
        </div>
        ${extraHtml ? `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#111;margin:6px 0;">${extraHtml}</div>` : ''}
        ${svgString}
      </div>
      <script>
        window.onload = function(){
          window.focus();
          setTimeout(function(){ window.print(); }, 0);
        }
      <\/script>
    </body>
  </html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const remove = () => {
    try { document.body.removeChild(iframe); } catch {}
    window.removeEventListener('afterprint', remove);
  };
  window.addEventListener('afterprint', remove, { once: true });

  const doc = iframe.contentDocument || (iframe as any).document;
  doc.open();
  doc.write(html);
  doc.close();
}

export async function printSvgAsPngInlineFromContainer(
  container: HTMLElement,
  title = 'Graphique',
  extraHtml?: string
): Promise<void> {
  const svg = container.querySelector('svg');
  if (!svg) throw new Error('Aucun SVG détecté à imprimer');

  const serializer = new XMLSerializer();
  const cloned = svg.cloneNode(true) as SVGSVGElement;
  const width = (svg as any).clientWidth || parseInt(cloned.getAttribute('width') || '0') || 1200;
  const height = (svg as any).clientHeight || parseInt(cloned.getAttribute('height') || '0') || 600;
  cloned.setAttribute('width', String(width));
  cloned.setAttribute('height', String(height));
  const svgString = serializer.serializeToString(cloned);

  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = (window.URL || (window as any).webkitURL).createObjectURL(svgBlob);

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Contexte canvas non disponible');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0);
        const png = canvas.toDataURL('image/png');
        resolve(png);
      } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error('Erreur de conversion SVG -> PNG'));
    img.src = url;
  });

  const now = new Date();
  const dateStr = now.toLocaleString();
  const { getPrintScale } = await import('./printSettings');
  const scale = getPrintScale();
  const html = `<!DOCTYPE html>
  <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <title>${title}</title>
      <style>
        @page { margin: 10mm; size: A4 landscape; }
        html, body { height:auto; }
        body { margin:0; padding:0; background:#fff; overflow:hidden; }
        .wrap { width:100%; page-break-inside: avoid; break-inside: avoid; }
        /* Zone imprimable max (A4 paysage avec marges 10mm) ~ 277mm x 190mm */
        .img { display:block; margin: 0 auto; page-break-inside: avoid; break-inside: avoid; width:auto; height:auto; max-width: calc(277mm * ${scale}/100); max-height: calc(180mm * ${scale}/100); object-fit: contain; }
        .header { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; color:#111; }
        .title { font-size:16px; font-weight:600; }
        .date { font-size:12px; color:#374151; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="header">
          <div class="title">${title}</div>
          <div class="date">${dateStr}</div>
        </div>
        ${extraHtml ? `<div style=\"font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#111;margin:6px 0;\">${extraHtml}</div>` : ''}
        <img class="img" src="${dataUrl}" alt="${title}" />
      </div>
      <script>
        window.onload = function(){
          window.focus();
          setTimeout(function(){ window.print(); }, 0);
        }
      <\/script>
    </body>
  </html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const remove = () => {
    try { document.body.removeChild(iframe); } catch {}
    window.removeEventListener('afterprint', remove);
  };
  window.addEventListener('afterprint', remove, { once: true });

  const doc = iframe.contentDocument || (iframe as any).document;
  doc.open();
  doc.write(html);
  doc.close();
}

