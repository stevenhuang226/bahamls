// report when page loaded
setTimeout(function(){
    browser.runtime.sendMessage({type: 'tabActive'});
    browserMessageListener();
},500);

// background message listener
async function browserMessageListener() {
    async function listener(message,sender) {
        if (message.type == 'getEpiscode') {
            console.log('get message type = getEpiscode');
            browser.runtime.sendMessage({type: 'episcodeInfo', animeNmae: await getAnimeName(), episcodeInfo: await(getEpiscode())});
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
            await Object.assign(episcodeObj,{[parseInt(index)]:element});
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