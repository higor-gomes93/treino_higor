
/**
 * Service Worker para o PWA do Plano Alimentar
 * Este arquivo controla o cache de recursos para permitir o funcionamento offline
 * e acelerar o carregamento de visitas subsequentes.
 */

// --- CONFIGURAÇÃO DO CACHE ---

// Nome do cache. Altere este valor para forçar a atualização de todos os ficheiros.
const CACHE_NAME = 'plano-alimentar-cache-v4'; 

// Lista de ficheiros essenciais para o funcionamento offline.
// Os caminhos são absolutos para funcionar corretamente em subdiretórios (ex: GitHub Pages).
const urlsToCache = [
  '/treino_higor/',
  '/treino_higor/index.html',
  '/treino_higor/manifest.json'
];


// --- CICLO DE VIDA DO SERVICE WORKER ---

/**
 * Evento 'install':
 * É acionado quando o service worker é registado pela primeira vez.
 * Ele abre o cache e armazena todos os recursos da lista 'urlsToCache'.
 */
self.addEventListener('install', event => {
  console.log('[Service Worker] A instalar...');
  // O 'waitUntil' garante que o service worker não será instalado até que o código dentro dele seja executado com sucesso.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cache aberto. A adicionar ficheiros ao cache...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] Todos os ficheiros essenciais foram cacheados com sucesso.');
        // Força o novo service worker a tornar-se ativo imediatamente.
        return self.skipWaiting();
      })
  );
});


/**
 * Evento 'activate':
 * É acionado quando o novo service worker é ativado.
 * A principal função aqui é limpar caches antigos para libertar espaço.
 */
self.addEventListener('activate', event => {
  console.log('[Service Worker] A ativar...');
  event.waitUntil(
    // Pega todas as chaves (nomes) de cache existentes.
    caches.keys().then(cacheNames => {
      return Promise.all(
        // Filtra os caches que não são o cache atual e apaga-os.
        cacheNames.filter(cacheName => {
          return cacheName.startsWith('plano-alimentar-cache-') && cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log(`[Service Worker] A apagar cache antigo: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
        // Assume o controlo da página imediatamente, sem precisar de recarregar.
        console.log('[Service Worker] Novo service worker ativado e a controlar a página.');
        return self.clients.claim();
    })
  );
});


/**
 * Evento 'fetch':
 * É acionado sempre que a página faz uma requisição de rede.
 * Estratégia "Cache first, falling back to network": tenta responder com o recurso do cache. 
 * Se não encontrar, busca na rede e atualiza o cache.
 */
self.addEventListener('fetch', event => {
  // Ignora requisições que não são GET (ex: POST, etc).
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Se a resposta estiver no cache, retorna a resposta cacheada.
        if (cachedResponse) {
          // Enquanto retorna a resposta do cache, verifica em segundo plano se há uma versão mais nova na rede.
          fetch(event.request).then(networkResponse => {
              if (networkResponse) {
                  caches.open(CACHE_NAME).then(cache => {
                      cache.put(event.request, networkResponse);
                  });
              }
          });
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
