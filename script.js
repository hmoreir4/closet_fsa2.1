(() => {
  const products = {
    camisetas: [
      ['Camiseta FSA Branca','R$ 79,90','assets/camiseta-branca.jpg','assets/camiseta-branca.png'],
      ['Camiseta FSA Azul','R$ 79,90','assets/camiseta-azul.jpg','assets/camiseta-azul.png']
    ],
    moletons: [
      ['Moletom FSA Branco','R$ 149,90','assets/moletom-branco.jpg','assets/moletom-branco.png'],
      ['Moletom FSA Amarelo','R$ 149,90','assets/moletom-amarelo.jpg','assets/moletom-amarelo.png'],
      ['Moletom FSA Preto','R$ 159,90','assets/moletom-preto.jpg','assets/moletom-preto.png']
    ],
    jaquetas: [
      ['Jaqueta Varsity FSA','R$ 199,90','assets/jaqueta-varsity.jpg','assets/jaqueta-varsity.png']
    ]
  };

  const $ = id => document.getElementById(id);
  const input = $('photoInput');
  const photo = $('userPhoto');
  const overlay = $('clothingOverlay');
  const viewer = $('viewer');
  const message = $('viewerMessage');
  const status = $('photoStatus');
  const catalog = $('catalog');
  const nameEl = $('selectedName');
  const priceEl = $('selectedPrice');

  let current = null;
  let category = 'camisetas';
  let scale = 1;
  let rotation = 0;
  let x = 0.5;
  let y = 0.48;
  let dragging = false;
  let dx = 0;
  let dy = 0;
  let objectUrl = null;

  function setStatus(text, type = '') {
    status.textContent = text;
    status.className = 'status' + (type ? ' ' + type : '');
  }

  function updateOverlay() {
    if (!current) return;
    overlay.style.left = `${x * 100}%`;
    overlay.style.top = `${y * 100}%`;
    overlay.style.width = `${260 * scale}px`;
    overlay.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
  }

  function showOverlay() {
    if (!current) return;
    overlay.style.display = 'block';
    overlay.style.visibility = 'visible';
    overlay.style.opacity = '1';
    updateOverlay();
  }

  function renderCatalog() {
    catalog.innerHTML = products[category].map((p, i) => `
      <button class="product" type="button" data-index="${i}">
        <img src="${p[2]}" alt="${p[0]}" loading="lazy">
        <span class="pname">${p[0]}</span>
        <span class="price">${p[1]}</span>
      </button>
    `).join('');

    catalog.querySelectorAll('.product').forEach((el, i) => {
      el.addEventListener('click', () => selectProduct(i));
    });
  }

  function selectProduct(i) {
    current = products[category][i];
    scale = 1;
    rotation = 0;
    x = 0.5;
    y = 0.48;

    nameEl.textContent = current[0];
    priceEl.textContent = current[1];
    catalog.querySelectorAll('.product').forEach((el, n) => el.classList.toggle('active', n === i));

    // Keep the viewer layer mounted and force a fresh load.
    overlay.style.display = 'block';
    overlay.style.visibility = 'hidden';
    overlay.style.opacity = '0';
    overlay.removeAttribute('src');

    const src = new URL(current[3], document.baseURI).href;
    const reveal = () => {
      showOverlay();
      if (photo.src) message.style.display = 'none';
    };
    overlay.onload = reveal;
    overlay.onerror = () => {
      overlay.style.display = 'none';
      setStatus('Não foi possível carregar a peça.', 'error');
      console.error('Erro ao carregar peça:', src);
    };
    overlay.src = src;

    // If the image is cached, onload may already have happened.
    if (overlay.complete && overlay.naturalWidth > 0) reveal();
  }

  function loadPhoto(file) {
    if (!file) return;
    const ext = (file.name || '').split('.').pop().toLowerCase();
    const accepted = ['jpg','jpeg','png','webp','heic','heif'];
    if ((file.type && !file.type.startsWith('image/')) && !accepted.includes(ext)) {
      setStatus('Escolha uma imagem válida.', 'error');
      return;
    }

    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);

    photo.onload = () => {
      photo.style.display = 'block';
      message.style.display = 'none';
      setStatus('Foto carregada ✓', 'success');
      if (current) showOverlay();
    };
    photo.onerror = () => setStatus('Este formato não pôde ser aberto pelo navegador.', 'error');
    photo.src = objectUrl;
  }

  input.addEventListener('click', () => { input.value = ''; });
  input.addEventListener('change', e => loadPhoto(e.target.files[0]));

  document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
    category = tab.dataset.category;
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b === tab));
    renderCatalog();
  }));

  $('plusBtn').onclick = () => { if (current) { scale = Math.min(2.2, scale + 0.1); updateOverlay(); } };
  $('minusBtn').onclick = () => { if (current) { scale = Math.max(0.45, scale - 0.1); updateOverlay(); } };
  $('rotateBtn').onclick = () => { if (current) { rotation = (rotation + 15) % 360; updateOverlay(); } };
  $('resetBtn').onclick = () => {
    if (!current) return;
    scale = 1; rotation = 0; x = 0.5; y = 0.48; updateOverlay();
  };

  $('clearBtn').onclick = () => {
    photo.removeAttribute('src');
    photo.style.display = 'none';
    overlay.removeAttribute('src');
    overlay.style.display = 'none';
    message.style.display = 'flex';
    setStatus('Nenhuma foto selecionada');
    current = null;
    nameEl.textContent = 'Nenhuma';
    priceEl.textContent = '—';
    catalog.querySelectorAll('.product').forEach(e => e.classList.remove('active'));
    input.value = '';
    if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
  };

  overlay.addEventListener('pointerdown', e => {
    if (!current) return;
    dragging = true;
    overlay.setPointerCapture(e.pointerId);
    const r = viewer.getBoundingClientRect();
    dx = e.clientX - (r.left + x * r.width);
    dy = e.clientY - (r.top + y * r.height);
  });

  overlay.addEventListener('pointermove', e => {
    if (!dragging) return;
    const r = viewer.getBoundingClientRect();
    x = Math.max(0.05, Math.min(0.95, (e.clientX - r.left - dx) / r.width));
    y = Math.max(0.05, Math.min(0.95, (e.clientY - r.top - dy) / r.height));
    updateOverlay();
  });
  overlay.addEventListener('pointerup', () => dragging = false);
  overlay.addEventListener('pointercancel', () => dragging = false);

  renderCatalog();
})();
