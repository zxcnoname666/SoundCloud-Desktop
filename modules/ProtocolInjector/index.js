module.exports = () => {
    if(process.platform == 'darwin'){
        require('./mac')();
        return;
    }
    
    if(process.platform == 'linux'){
        require('./linux')();
        return;
    }

    if(process.platform.startsWith('win')){
        require('./win')();
        return;
    }
    
    console.log('Protocol Injector not supported on your os: ' + process.platform);
};