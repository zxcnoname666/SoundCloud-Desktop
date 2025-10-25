# SoundCloud Desktop Proxy

Система проксирования для SoundCloud Desktop, использующая различные платформы (Cloudflare Workers / Deno Deploy /
Node.js) для обхода блокировок.

## Выбор платформы

### Cloudflare Workers

**Статус:** ⚠️ Заблокирован в России

Cloudflare Workers заблокирован на территории РФ, поэтому **не рекомендуется** для пользователей из России.

### Deno Deploy ✅ Рекомендуется

**Статус:** ✅ Работает в России

[Deno Deploy](https://deno.com/deploy) - альтернативная edge-платформа, которая пока работает на территории РФ.

**Преимущества:**

- 🌍 Доступен в России
- 🆓 Бесплатный тариф с щедрыми лимитами
- ⚡ Быстрое развертывание
- 🔄 Автоматическое масштабирование
- 📦 Нативная поддержка TypeScript и современного JavaScript

### Node.js Server (для самостоятельного хостинга)

**Статус:** ✅ Полный контроль

Собственный Node.js HTTP сервер для развертывания на своем VPS/сервере.

**Преимущества:**

- 🔒 Полный контроль над сервером
- 💰 Бесплатно (при наличии своего сервера)
- 🌐 Можно разместить в любой стране
- ⚙️ Настраиваемый порт и конфигурация

## Принцип работы

1. **Клиент (SoundCloud Desktop)** отправляет запрос на прокси-сервер
2. **Целевой URL** кодируется в base64 и передается в заголовке `X-Proxy-Target-URL`
3. **Worker** получает запрос, декодирует base64 и извлекает целевой URL
4. **Проксирование** - Worker делает запрос к целевому серверу и возвращает ответ
5. **Обработка редиректов** - Worker корректно обрабатывает редиректы, обновляя Location header

### Зачем base64?

**Защита от DPI (Deep Packet Inspection)** - в России провайдеры анализируют содержимое HTTP-заголовков для блокировки
запросов к определенным доменам. Base64-кодирование URL скрывает целевой домен от анализа трафика, делая блокировку
более сложной.

## Структура файлов

- `cloudflare-proxy.js` - Cloudflare Worker для проксирования запросов
- `deno-proxy.js` - Deno Deploy worker для проксирования запросов
- `README.md` - Данная документация

## Настройка прокси

### Вариант 1: Deno Deploy (рекомендуется для РФ)

1. Зарегистрируйтесь на [Deno Deploy](https://deno.com/deploy)
2. Создайте новый проект
3. В настройках проекта выберите "Deploy from file"
4. Загрузите файл `deno-proxy.js` или скопируйте его содержимое в онлайн-редактор
5. Опубликуйте проект
6. Скопируйте URL вашего Deno Deploy проекта (например: `https://your-project.deno.dev`)

### Вариант 2: Cloudflare Worker (не работает в РФ)

1. Создайте новый Worker в Cloudflare Dashboard
2. Скопируйте содержимое `cloudflare-proxy.js` в редактор Worker
3. Опубликуйте Worker
4. Скопируйте URL вашего Worker (например: `https://your-worker.your-subdomain.workers.dev`)

### Настройка SoundCloud Desktop

В конфигурационном файле приложения добавьте ваш прокси:

```json5
{
  "proxy": [
    "https://your-project.deno.dev"
    // для Deno Deploy
    // или
    // "https://your-worker.your-subdomain.workers.dev"  // для Cloudflare
  ]
}
```

## Технические детали

### Формат запросов

```
GET https://proxy.example.com/
Headers:
  X-Proxy-Target-URL: aHR0cHM6Ly9zb3VuZGNsb3VkLmNvbS9hcGkvdHJhY2tz
  (base64 кодированный URL: https://soundcloud.com/api/tracks)
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

- Платформо-специфичные заголовки (`cf-*` для Cloudflare, `x-deno-*` для Deno)
- Прокси заголовки (`x-forwarded-*`, `x-real-ip`)
- Заголовки безопасности (`content-security-policy`, `x-frame-options`)

## Примеры использования

### Базовый запрос

```javascript
const targetUrl = 'https://soundcloud.com/api/tracks';
const encodedUrl = btoa(targetUrl); // base64 encode

fetch('https://your-worker.workers.dev/', {
    method: 'GET',
    headers: {
        'X-Proxy-Target-URL': encodedUrl
    }
})
```

### POST запрос с данными

```javascript
const targetUrl = 'https://soundcloud.com/api/upload';
const encodedUrl = btoa(targetUrl); // base64 encode

fetch('https://your-worker.workers.dev/', {
    method: 'POST',
    headers: {
        'X-Proxy-Target-URL': encodedUrl,
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

Worker возвращает HTTP 400 при невалидном base64:

```
HTTP/1.1 400 Bad Request
Invalid base64 encoded URL
```

Worker возвращает HTTP 500 при ошибках проксирования:

```
HTTP/1.1 500 Internal Server Error
Proxy Error: [описание ошибки]
```

## Преимущества архитектуры

1. **Обход DPI** - base64 кодирование скрывает целевые URL от глубокой инспекции пакетов
2. **Простота конфигурации** - не нужно кодировать URL в пути
3. **Лучшая обработка редиректов** - корректные Location headers
4. **Совместимость** - работает с любыми HTTP методами и телами запросов
5. **Безопасность** - целевой URL скрыт от URL-строки и HTTP-логов
6. **Производительность** - меньше парсинга и обработки URL

## Ограничения

### Cloudflare Workers

- Заблокирован в России
- Лимит на время выполнения (CPU time)
- Максимальный размер запроса/ответа ограничен платформой
- Некоторые заголовки могут быть изменены/удалены

### Deno Deploy

- Бесплатный тариф: 100,000 запросов/день, 100 ГБ исходящего трафика/месяц
- Лимит на время выполнения: 50ms CPU time на запрос
- Максимальный размер запроса: 100 МБ
- Пока работает в России, но может быть заблокирован в будущем
