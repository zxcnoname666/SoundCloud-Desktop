<p>
<a href="https://soundcloud.com" alt="soundcloud">
<img src="https://raw.githubusercontent.com/zxcnoname666/SoundCloud-Desktop/main/icons/appLogo.png" width="200px" align="right" style="border-radius: 50%;" />
</a>

# SoundCloud Desktop

<p align="center">
<a href="https://soundcloud.com" alt="soundcloud">
<img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=500&pause=1000&color=F76000&center=true&vCenter=true&repeat=false&width=435&height=25&lines=SoundCloud+Desktop">
</a>
</p>
<p align="center">
Неофициальное приложение SoundCloud для Windows, Linux и macOS
</p>

# Выбор языка

### [EN](https://github.com/zxcnoname666/SoundCloud-Desktop/blob/main/README.md) RU

# ✨ Особенности

- **🌙 Темная тема** - Современный темный интерфейс
- **🌍 Обход геоблокировок** - Доступ к заблокированным трекам из любого региона
- **🚫 Блокировка рекламы** - Встроенная блокировка рекламы для чистого опыта
- **⚡ Быстрое и легкое** - Оптимизированный TypeScript код с bundling
- **🔒 Поддержка прокси** - Встроенная поддержка прокси для неограниченного доступа
- **🔗 Поддержка протокола** - Открывайте ссылки SoundCloud напрямую через протокол `sc://`
- **🖥️ Кроссплатформенность** - Доступно для Windows, Linux и macOS

# Протокол приложения

Вы можете открыть страницу в приложении напрямую из браузера, используя
протокол `sc://`.

> Вам нужно заменить `https://soundcloud.com/...` на `sc://...`, например:
> `https://soundcloud.com/discover` => `sc://discover`

Также вы можете навигировать в приложении используя URL-панель (как в браузерах)

# 📥 Скачивание и установка

## Windows

1. Перейдите на [страницу последнего релиза](https://github.com/zxcnoname666/SoundCloud-Desktop/releases/latest)
2. Скачайте `SoundCloudInstaller.exe`
3. Запустите установщик и следуйте инструкциям

## Linux

### Вариант 1: Flatpak (Рекомендуется)

```bash
# Сборка и установка локально
cd flatpak
./generate-sources.sh
flatpak-builder --user --install --force-clean build-dir com.github.zxcnoname666.SoundCloudDesktop.json

# Запуск приложения
flatpak run com.github.zxcnoname666.SoundCloudDesktop
```

Смотрите [flatpak/README.md](flatpak/README.md) для подробных инструкций.

### Вариант 2: AppImage

1. Перейдите на [страницу последнего релиза](https://github.com/zxcnoname666/SoundCloud-Desktop/releases/latest)
2. Скачайте `soundcloud-*.AppImage`
3. Сделайте файл исполняемым: `chmod +x soundcloud-*.AppImage`
4. Запустите AppImage

## macOS

1. Перейдите на [страницу последнего релиза](https://github.com/zxcnoname666/SoundCloud-Desktop/releases/latest)
2. Скачайте `soundcloud-*.dmg`
3. Откройте DMG и перетащите приложение в папку Программы

# ⚙️ Конфигурация

## Настройки языка

Вы можете настроить язык приложения через файл `config.json5` в директории приложения.

## 🔒 Настройка прокси

Настройте прокси для обхода геоограничений:

**Расположения конфигов (по приоритету):**

1. **Папка пользователя**: `%APPDATA%/soundcloud/config.proxy.json5` (Windows) или
   `~/.config/soundcloud/config.proxy.json5` (Linux/macOS)
2. **Папка приложения**: `config.proxy.json5` в директории приложения

**Формат конфигурации:**

```json5
{
   "proxy": [
      "https://your-worker.workers.dev",
      "http://proxy.example.com:8080"
   ]
}
```

**Cloudflare Worker Proxy (Рекомендуется):**

1. Используйте готовый код Worker'а из `_proxy/cloudflare-proxy.js`
2. Разверните его в Cloudflare Workers (доступен бесплатный тариф)
3. Добавьте URL вашего Worker'а в конфигурацию прокси
4. См. `_proxy/README.md` для подробных инструкций по настройке

**Альтернативные форматы прокси:**

- `http://host:port`, `https://host:port`

# 🔨 Разработка и сборка

## Требования

- **Node.js** 18+
- **pnpm** 8+
- **Rust** (для нативных модулей)

## Настройка

```bash
# Установите pnpm
npm install -g pnpm

# Установите зависимости
pnpm install

# Режим разработки
pnpm dev

# Сборка для продакшена
pnpm build
```

# Кредиты

Названия и изображения принадлежат [SoundCloud](https://soundcloud.com)

Это приложение было создано из личной необходимости.

<p align="center">
<a href="javascript:void(0)">
<img src="https://count.getloli.com/get/@soundcloud-desktop" width="200px" />
</a>
</p>
<p align="center">
<a href="javascript:void(0)">
<img src="https://img.shields.io/github/downloads/zxcnoname666/SoundCloud-Desktop/total?color=fd4313&style=plastic" />
<img src="https://img.shields.io/github/v/release/zxcnoname666/SoundCloud-Desktop.svg?color=#fd4313&style=plastic" />
</a>
</p>