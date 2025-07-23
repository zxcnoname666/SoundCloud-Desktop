<p>
<a href="https://soundcloud.com" alt="soundcloud">
<img src="https://raw.githubusercontent.com/fydne/SoundCloud-Desktop/main/icons/appLogo.png" width="200px" align="right" style="border-radius: 50%;" />
</a>

# SoundCloud Desktop

<p align="center">
<a href="https://soundcloud.com" alt="soundcloud">
<img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=500&pause=1000&color=F76000&center=true&vCenter=true&repeat=false&width=435&height=25&lines=SoundCloud+Desktop">
</a>
</p>
<p align="center">
Неофициальное приложение SoundCloud для Windows
</p>

# Выберите язык

### [EN](https://github.com/zxcnoname666/SoundCloud-Desktop) RU

# Особенности

- Темная тема
- Обход блокировок по геоблоку для большинства треков
- Блокировка рекламы

# Протокол приложения

Вы можете открыть страницу в приложении сразу из браузера, использовав протокол
`sc://`

> Для этого надо заменить `https://soundcloud.com/...` на `sc://...`. По
> принципу: `https://soundcloud.com/discover` => `sc://discover`

В приложении вы также можете перемещаться по вводу ссылки (как в браузере)

# Установка

1. Перейдите в
   [последние релизы](https://github.com/zxcnoname666/SoundCloud-Desktop/releases/latest)
2. Скачайте `SoundCloudInstaller.exe`
3. При желании, проверьте сигнатуру через программы по типу gpgex4
4. Запустите `SoundCloudInstaller.exe`

# Конфиги

> Вы можете настроить язык приложения через конфиг в файле `config.js` в рутовой
> директории

# Прокси

> Вы можете использовать свой собственный прокси при подключении к SoundCloud

> Рекомендованная локация: Швейцария

Для этого измените файл `config.proxy.js` в рутовой директории.

`proxy` - это массив строк/объектов-коннектов для подключения к прокси (например
`socks://1.1.1.1:1337`, `http://1.1.1.1:80` или
`scheme://user:password@ip:port`)

> Рекомендация безопасности: Лучше используйте доступ по `user:password` или
> разрешите подключения только для следующих доменов:
> `.soundcloud.com .sndcdn.com soundcloud-upload.s3.amazonaws.com js.datadome.co api-js.datadome.co .captcha-delivery.com .soundcloud.cloud`

# Сборка

1. Установите nodejs: [ссылка](https://nodejs.org/en/download)
2. Установите rustlang: [ссылка](https://rust-lang.org/tools/install)
3. Соберите приложение: `npm run build`

# Кредиты

Названия и изображения принадлежат [SoundCloud](https://soundcloud.com)

Данное приложение было создано для личного пользования.

<p align="center">
<a href="javascript:void(0)">
<img src="https://profile-counter.glitch.me/scda/count.svg" width="200px" />
</a>
<p align="center">
<a href="javascript:void(0)">
<img src="https://img.shields.io/github/downloads/zxcnoname666/SoundCloud-Desktop/total?color=fd4313&style=plastic" />
<img src="https://img.shields.io/github/v/release/zxcnoname666/SoundCloud-Desktop.svg?color=#fd4313&style=plastic" />
</a>
</p>
