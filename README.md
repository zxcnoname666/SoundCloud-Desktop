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
The unofficial SoundCloud desktop app for Windows
</p>

# Select language
### EN [RU](https://github.com/zxcnoname666/SoundCloud-Desktop/blob/main/README-RU.md)

# Features
- Dark theme
- Bypass the blocking of most tracks
- AdBlock

# App Protocol
You can open the page in the application directly from the browser using the `sc://` protocol.
> You need to replace `https://soundcloud.com/...` to `sc://...` like `https://soundcloud.com/discover` => `sc://discover`

You can also navigate in app by using url-navbar (like in browsers)

# Install
1. Go to [latest release page](https://github.com/zxcnoname666/SoundCloud-Desktop/releases/latest)
2. Download `SoundCloud_Setup_x.x.x.exe`
3. If desired, check the sig hash via programs like gpgex4
4. Run `SoundCloud_Setup_x.x.x.exe`

# Configs
> You can use your own proxy when connecting to SoundCloud

> Recommended location: Switzerland

Modify the `config.js` file.

`proxy` - an array with links to connect to a proxy (like `socks://1.1.1.1:1337`, `http://1.1.1.1:80` or `scheme://user:password@ip:port`)

> Security Recommendation: Better use `user:password` access or only allow connections to the following servers: `.soundcloud.com .sndcdn.com soundcloud-upload.s3.amazonaws.com js.datadome.co api-js.datadome.co`

# Build
1. `npm i` - Install required dependencies
2. `npm i electron-builder -g` - Install electron builder
3. `npm run build` - Compile app

# Credits
Names and images own by [SoundCloud](https://soundcloud.com)

This app was created out of personal necessity.

<p align="center">
<a href="javascript:void(0)">
<img src="https://profile-counter.glitch.me/scda/count.svg" width="200px" />
</a>