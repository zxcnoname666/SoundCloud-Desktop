# SoundCloud Desktop Proxy

Система проксирования для SoundCloud Desktop, использующая Cloudflare Workers для обхода блокировок.

## Принцип работы

1. **Клиент (SoundCloud Desktop)** отправляет запрос на прокси-сервер
2. **Целевой URL** передается в заголовке `X-Proxy-Target-URL`
3. **Cloudflare Worker** получает запрос, извлекает целевой URL из заголовка
4. **Проксирование** - Worker делает запрос к целевому серверу и возвращает ответ
5. **Обработка редиректов** - Worker корректно обрабатывает редиректы, обновляя Location header

## Структура файлов

- `cloudflare-proxy.js` - Cloudflare Worker для проксирования запросов
- `README.md` - Данная документация

## Настройка прокси

### 1. Развертывание Cloudflare Worker

1. Создайте новый Worker в Cloudflare Dashboard
2. Скопируйте содержимое `cloudflare-proxy.js` в редактор Worker
3. Опубликуйте Worker
4. Скопируйте URL вашего Worker (например: `https://your-worker.your-subdomain.workers.dev`)

### 2. Настройка SoundCloud Desktop

В конфигурационном файле приложения добавьте ваш прокси:

```json5
{
  "proxy": [
    "https://your-worker.your-subdomain.workers.dev"
  ]
}
```

## Технические детали

### Формат запросов

```
GET https://proxy.example.com/
Headers:
  X-Proxy-Target-URL: https://soundcloud.com/api/tracks
  [остальные заголовки копируются как есть]
```

### Обработка редиректов

Worker автоматически обрабатывает все типы редиректов:

- **Абсолютные URL** (`https://example.com/path`) - возвращаются как есть
- **Относительные пути** (`/path`) - преобразуются в абсолютные URL
- **Протокол-относительные** (`//example.com/path`) - дополняются протоколом

**Важно:** Location header в ответах редиректов теперь содержит прямую ссылку на целевой ресурс, а не обратно на прокси.

### CORS поддержка

Worker автоматически добавляет необходимые CORS заголовки:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: *
```

### Очистка заголовков

Worker автоматически удаляет потенциально проблемные заголовки:

- Cloudflare-специфичные заголовки (`cf-*`)
- Прокси заголовки (`x-forwarded-*`, `x-real-ip`)
- Заголовки безопасности (`content-security-policy`, `x-frame-options`)

## Примеры использования

### Базовый запрос

```javascript
fetch('https://your-worker.workers.dev/', {
    method: 'GET',
    headers: {
        'X-Proxy-Target-URL': 'https://soundcloud.com/api/tracks'
    }
})
```

### POST запрос с данными

```javascript
fetch('https://your-worker.workers.dev/', {
    method: 'POST',
    headers: {
        'X-Proxy-Target-URL': 'https://soundcloud.com/api/upload',
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({data: 'example'})
})
```

### Обработка ошибок

Worker возвращает HTTP 400 если отсутствует заголовок `X-Proxy-Target-URL`:

```
HTTP/1.1 400 Bad Request
Missing X-Proxy-Target-URL header
```

Worker возвращает HTTP 500 при ошибках проксирования:

```
HTTP/1.1 500 Internal Server Error
Proxy Error: [описание ошибки]
```

## Преимущества архитектуры

1. **Простота конфигурации** - не нужно кодировать URL в пути
2. **Лучшая обработка редиректов** - корректные Location headers
3. **Совместимость** - работает с любыми HTTP методами и телами запросов
4. **Безопасность** - целевой URL скрыт от URL-строки
5. **Производительность** - меньше парсинга и обработки URL

## Ограничения

- Cloudflare Workers имеют лимит на время выполнения (CPU time)
- Максимальный размер запроса/ответа ограничен Cloudflare
- Некоторые заголовки могут быть изменены/удалены Cloudflare
