/**
 * Service Worker para o PWA do Plano de Treino
 * Controla o cache de recursos para funcionamento offline.
 */

// --- CONFIGURAÇÃO DO CACHE ---
const CACHE_NAME = 'plano-treino-cache-v1';
const urlsToCache = [
  '/treino_higor/',
  '/treino_higor/index.html',
  '/treino_higor/manifest.json'
  // Adicione aqui outros arquivos estáticos se houver (ex: /treino_higor/style.css)
];

// --- CICLO DE VIDA DO SERVICE WORKER ---

/**
 * Evento 'install': Acionado na primeira vez que o SW é registrado.
 * Abre o cache e armazena os recursos essenciais.
 */
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cache aberto. Adicionando arquivos essenciais ao cache...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] Arquivos essenciais cacheados com sucesso.');
        return self.skipWaiting(); // Força o novo SW a se tornar ativo.
      })
  );
});

/**
 * Evento 'activate': Acionado quando o novo SW é ativado.
 * Limpa caches antigos para liberar espaço.
 */
self.addEventListener('activate', event => {
  console.log('[Service Worker] Ativando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          // Filtra caches que começam com 'plano-treino-cache-' mas não são o cache atual.
          return cacheName.startsWith('plano-treino-cache-') && cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log(`[Service Worker] Apagando cache antigo: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('[Service Worker] Novo service worker ativado e controlando a página.');
      return self.clients.claim(); // Assume o controle da página imediatamente.
    })
  );
});

/**
 * Evento 'fetch': Acionado para cada requisição da página.
 * Estratégia: Cache-first, caindo para a rede se o recurso não estiver em cache.
 */
self.addEventListener('fetch', event => {
  // Ignora requisições que não são GET.
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignora requisições para scripts de fora (CDNs) para sempre buscar a versão mais recente.
  if (event.request.url.includes('cdn.tailwindcss.com') || event.request.url.includes('cdn.jsdelivr.net')) {
      return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Se a resposta estiver no cache, retorna a resposta cacheada.
        if (cachedResponse) {
          return cachedResponse;
        }

        // Se não estiver no cache, busca na rede.
        return fetch(event.request).then(
          networkResponse => {
            // Clona a resposta da rede para poder guardá-la no cache e enviá-la ao navegador.
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return networkResponse;
          }
        );
      })
  );
});
