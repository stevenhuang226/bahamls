//var
var tabInfo = {};
// message listener
async function messageListener(message,sender,sendResponse){
    if (message.type === 'tabActive') {
        let tabId = sender.tab.id
        console.log(tabId, 'loaded');
        return new Promise( async (resolve,reject) => {
            let deviceId = await getDeviceId(tabId);
            tabInfo[tabId] = {};
            Object.assign(tabInfo[tabId], {deviceId: deviceId});
            console.log(tabInfo);
            resolve();
        })
        .then( async () => {
            setTimeout( () => {
                browser.tabs.sendMessage(tabId, {type: 'getEpiscode'})
            },2000)
        });
    }
    if (message.type === 'episcodeInfo') {
        waitCreatNewTab(tabId,await getM3u8Alert(tabId),message.episcodeInfo);
        localStorage.setItem([message.animeName],JSON.stringify(message.episcodeInfo));
    }
}
browser.runtime.onMessage.addListener(messageListener);

async function getDeviceId(tabId) {
    return new Promise((resolve,reject) => {
        browser.webRequest.onBeforeRequest.addListener(onBeforeListener,{urls:['https://ani.gamer.com.tw/ajax/getdeviceid.php?id=*'], tabId: tabId} ,['blocking']);
        async function onBeforeListener(details) {
            const responseBody = browser.webRequest.filterResponseData(details.requestId);
            let decoder = new TextDecoder('utf-8');
            let responseText = '';
            responseBody.ondata = event => {
                responseText += decoder.decode(event.data, {stream: true});
            }
            responseBody.onstop = async event => {
                const deviceId = await (JSON.parse(responseText)).deviceid
                console.log('get deviceId = ',deviceId); // test
                responseBody.ondata = null;
                responseBody.disconnect();
                browser.webRequest.onBeforeRequest.removeListener(onBeforeListener);
                resolve(deviceId);
            }
        }
    })
    .then( deviceId => {
        return deviceId;
    })
}
async function waitCreatNewTab(tabId,fileName,episcodeInfo) {
    async function listener(details) {
        
    }
}
async function getM3u8Alert(tabId) {
    return new Promise( (resolve,reject) => {
        browser.webRequest.onBeforeRequest.addListener(listener,{urls:['https://bahamut.akamaized.net*chunklist_b400000.m3u8'],tabId: tabId},['blocking'])
        async function listener(details) {
            const responseBody = browser.webRequest.filterResponseData(details.requestId);
            let decoder = new TextDecoder('utf-8');
            let responseText = '';
            responseBody.ondata = event => {
                responseText += decoder.decode(event.data, {stream: true});
            }
            responseBody.onstop = async event => {
                filteTextStart = responseText.indexOf('media',-400);
                let m3u8FileAlert = responseText.substring(filteTextStart,responseText.indexOf('m3u8',filteTextStart)+4);
                responseBody.ondata = null;
                responseBody.disconnect();
                browser.webRequest.onBeforeRequest.removeListener(listener);
                resolve(m3u8FileAlert);
            }
        }
        
    })
    .then(fileName => {
        return fileName;
    })
}
// TODO 計算下一集的網址，然後發送已經看過廣告的東西 => 由document.getclassname獲取，並且分析內容
// TODO 攔截m3u8檔案 => 網址不像ad的m3u8就直接截取內容
// TODO 檢測m3u8檔案倒數幾行，設定監聽器，如果倒數幾個檔案被觸發，就在背景打開分頁，開始播放廣告
// TODO 偵測播放時間，在指定時間播放（可能可以由m3u8檔案已經要結束的狀況）=> 延伸：偵測m3u8檔案長度，然後在偵測到m3u8檔案最後幾個東西已經傳送完畢的時候，發送看過廣告的GET
