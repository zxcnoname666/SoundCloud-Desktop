export default {
  packagerConfig: {
    name: 'SoundCloud',
    executableName: 'soundcloud',
    asar: {
      unpack: '{bins/**/*,*.node}',
    },
    icon: 'icons/appLogo',
    appBundleId: 'com.soundcloud.desktop',
    appCategoryType: 'public.app-category.music',
    osxUniversal: {
      mergeASARs: true,
      x64ArchFiles: '**/bins/*.node',
    },
    ignore: ['^\\/\\.debug($|\\/)', '^\\/_ignore($|\\/)', '^\\/_proxy($|\\/)'],
  },
  rebuildConfig: {
    onlyModules: [],
  },
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux', 'win32'],
      config: {},
    },
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
      config: {
        name: 'SoundCloud',
        setupIcon: 'icons/appLogo.ico',
      },
    },
    {
      name: '@electron-forge/maker-deb',
      platforms: ['linux'],
      config: {
        options: {
          name: 'soundcloud',
          productName: 'SoundCloud',
          icon: 'icons/appLogo.png',
          categories: ['Audio', 'Music'],
          section: 'sound',
          priority: 'optional',
          depends: [
            'gconf2',
            'gconf-service',
            'libnotify4',
            'libappindicator1',
            'libxtst6',
            'libnss3',
          ],
        },
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      platforms: ['linux'],
      config: {
        options: {
          name: 'soundcloud',
          productName: 'SoundCloud',
          icon: 'icons/appLogo.png',
          categories: ['Audio', 'Music'],
          requires: ['libXScrnSaver', 'libappindicator', 'libnotify'],
        },
      },
    },
    {
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
      config: {
        name: 'SoundCloud',
        icon: 'icons/appLogo.png',
      },
    },
    {
      name: '@reforged/maker-appimage',
      platforms: ['linux'],
      config: {
        options: {
          name: 'soundcloud',
          productName: 'SoundCloud',
          genericName: 'Music Player',
          description: 'SoundCloud Desktop App',
          categories: ['Audio', 'Music'],
          icon: 'icons/appLogo.png',
        },
      },
    },
  ],
};
