export async function exportSvgContainerToPng(container: HTMLElement, filename: string): Promise<void> {
  const svg = container.querySelector('svg');
  if (!svg) {
    throw new Error('Aucun élément SVG trouvé dans le conteneur');
  }

  const serializer = new XMLSerializer();
  const clonedSvg = svg.cloneNode(true) as SVGSVGElement;

  // Forcer un fond blanc
  const width = (svg as any).clientWidth || parseInt(clonedSvg.getAttribute('width') || '0') || 1000;
  const height = (svg as any).clientHeight || parseInt(clonedSvg.getAttribute('height') || '0') || 600;

  // S'assurer que largeur/hauteur existent
  clonedSvg.setAttribute('width', String(width));
  clonedSvg.setAttribute('height', String(height));

  const svgString = serializer.serializeToString(clonedSvg);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const DOMURL = window.URL || (window as any).webkitURL;
  const url = DOMURL.createObjectURL(svgBlob);

  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context non disponible');
        // fond blanc
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0);
        DOMURL.revokeObjectURL(url);
        const png = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = filename.endsWith('.png') ? filename : filename + '.png';
        link.href = png;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        resolve();
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = (e) => reject(new Error('Erreur lors du chargement de l\'image SVG'));
    img.src = url;
  });
}

