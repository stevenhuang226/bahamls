// report when page loaded
setTimeout( () => {
    browser.runtime.sendMessage({type: 'tabActive'}); // TODO 可能要交由其他東西來做，可能會刪除
},500)
browserMessageListener();
// background message listener
async function browserMessageListener() {
    async function listener(message,sender) {
        if (message.type == 'getEpiscode') {
            console.log('get message type = getEpiscode');
            return new Promise ( async (resovle) => {
                let animeName = await getAnimeName();
                let episcodeInfo = await getEpiscode();
                resovle ([episcodeInfo,animeName]);
            })
            .then( ([episcodeInfo,animeName]) => {
                browser.runtime.sendMessage({type: 'episcodeInfo', episcodeInfo: episcodeInfo, animeName: animeName});
            });
        }
        if (message.type == 'adEnd') {
            sendVideoCastEnd(message.url);
            setTimeout( () => {
                browser.runtime.sendMessage({type: 'needReload'});
            },1000)
        }
    }/* */ 
    browser.runtime.onMessage.addListener(listener);
}
// get episcode info
async function getEpiscode() {  //ok
    let episcodeHTML = document.getElementsByClassName('season')[0].innerHTML;
    let episcodeList = [];
    let posit = episcodeHTML.indexOf('href="?sn=',0);
    return new Promise( async(resolve,reject) => {
        keepWhile = true;
        while ( posit != -1) {
            episcodeList.push(
                episcodeHTML.substring(posit+10,posit+10+episcodeHTML.substring(posit+10,posit+20).indexOf('"'))
            );
            posit = episcodeHTML.indexOf('href="?sn=',posit+20);
        }
        resolve();
    })
    .then( () => {
        let playing = episcodeHTML.indexOf('playing');
        let playingEpiscode;
        if (playing != -1) {
            playingEpiscode = episcodeHTML.substring(episcodeHTML.indexOf('>',playing+10)+1,episcodeHTML.indexOf('<',playing+12));
        }
        return playingEpiscode;
    })
    .then( async (playing) => {
        let episcodeObj = {};
        episcodeList.forEach(async (element,index) => {
            await Object.assign(episcodeObj,{[parseInt(index+1)]:element});
        })
        await Object.assign(episcodeObj,{'playingEpiscodeNum':parseInt(playing)});
        await Object.assign(episcodeObj,{'playingEpiscodeSn':episcodeList[playing-1]})
        await Object.assign(episcodeObj,{'max':episcodeList.length});
        return episcodeObj;
    })
}
async function getAnimeName() {     //ok
    animeNameOrigin = document.getElementsByClassName('anime_name')[0].innerText;
    return(animeNameOrigin.substring(0,animeNameOrigin.indexOf('[')));
}
async function sendVideoCastEnd(url) {
    let requestObject = new Request(
        url,{
            method: 'GET',
            mode: 'cors'
        }
    )
    fetch(requestObject)
    .then( response => {
        console.log(response);
    })
    .catch( error => {
        console.log('sendVideoCastEnd error: ',error);
    })
}
async function clickVideoCastButton() {
    const videoCastButton = document.getElementById('adult');
    if (videoCastButton) {
        console.log('click the video cast button');
        videoCastButton.click();
    }
    else {
        console.log('click video cast button error',videoCastButton);
        browser.runtime.sendMessage({type: 'debug', debug: 'click video cast button error'})
    }
}