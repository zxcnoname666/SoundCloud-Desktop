const electron = require('electron');

const menu = [{
    label: '&SoundCloud',
    icon: electron.nativeImage.createFromPath(__dirname + '/../icons/soundcloud.ico').resize({width:16}),
    enabled: false
},{
    label: '&Quit',
    click: () => electron.app.exit(0),
}];

module.exports = async (win) => {
    const tray = new electron.Tray(__dirname + "/../icons/soundcloud.ico")
    tray.setToolTip('SoundCloud');
    tray.setIgnoreDoubleClickEvents(true);
    tray.on('click', () => win.show());
    setTimeout(() => tray.setContextMenu(electron.Menu.buildFromTemplate(menu)), 1000);
};