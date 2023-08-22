//var
var tabInfo = {};
// tab listener
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (/^https:\/\/ani\.gamer\.com\.tw\/animeVideo\.php\?sn=.*/.test(changeInfo.url) && changeInfo.status == 'loading') {
        tabInfo[tabId] = tabInfo[tabId] ?? {};
        waitCreatNewTab(tabId);
        getAdStartS(tabId);
    }
})

browser.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    if (tabId in tabInfo) {
        delete tabInfo[tabId];
    }
}) /* */
// message listener
async function messageListener(message,sender,sendResponse){
    let tabId = sender.tab.id;
    if (message.type === 'tabActive') {
        return new Promise(resolve => {
            tabInfo[tabId] = tabInfo[tabId] ?? {};
            resolve();
        })
        .then( () => {
            setTimeout( () => {
                browser.tabs.sendMessage(tabId, {type:'getEpiscode'});
            },2000);
        });
    }
    if (message.type == 'episcodeInfo') {
        await Object.assign(tabInfo[tabId], {tabEpiscodeInfo: message.episcodeInfo});
        await Object.assign(tabInfo[tabId], {tabAnimeName: message.animeName});
        /*
        getAdStartS(tabId);
        /* */
        /*localStorage.setItem([message.animeName],JSON.stringify(message.episcodeInfo)); /* */
    }
    if (message.type == 'needReload') {
        browser.tabs.reload(tabId);
    }
    if (message.type == 'debug') {
        console.log(tabId, message.debug)
    }
}
browser.runtime.onMessage.addListener(messageListener);
async function getAdStartS(tabId) {
    return new Promise( (resolve,reject) => {
        browser.webRequest.onCompleted.addListener( details => {
            let getUrl = details.url;
            let codeSInfo = getUrl.substring(getUrl.indexOf('php?s=')+6, getUrl.indexOf('&sn=')-1);
            resolve ([codeSInfo,details.url]);
        },{urls:[
            'https://ani.gamer.com.tw/ajax/videoCastcishu.php?s=*&sn=*'
        ], tabId: tabId},);
    })
    .then(　([codeSInfo,videoCastUrl]) => {
        Object.assign(tabInfo[tabId],{'adSCode': codeSInfo});
        Object.assign(tabInfo[tabId], {'videoCastUrl': videoCastUrl});
    })
}
async function waitCreatNewTab(tabId) {    
    return new Promise( (resolve) => {
        async function listener(details) {
            const responseBody = browser.webRequest.filterResponseData(details.requestId);
            let decoder = new TextDecoder('utf-8');
            let encoder = new TextEncoder();
            let responseText = '';
            responseBody.ondata = event => {
                responseText += decoder.decode(event.data, {stream: true});
            };
            responseBody.onstop = async event => {
                if (responseText.includes('IV=') && responseText.length > 800) {
                    let filteTextStart = responseText.indexOf('media',responseText.length-700);
                    const m3u8FileAlert = responseText.substring(filteTextStart,responseText.indexOf('ts',filteTextStart)+2);
                    responseBody.write(encoder.encode(responseText));
                    responseBody.disconnect();
                    browser.webRequest.onBeforeRequest.removeListener(listener);
                    resolve(m3u8FileAlert);
                }
                else {
                    responseBody.write(encoder.encode(responseText));
                    responseBody.disconnect();
                }
            };
            return {};
        }
        browser.webRequest.onBeforeRequest.addListener(listener,{urls:['https://bahamut.akamaized.net/*chunklist_b*.m3u8'], tabId: tabId},['blocking']);
        browser.tabs.onUpdated.addListener(async (tab_id,changeInfo,tab) => {
            if (tab_id == tabId && changeInfo.status == 'loading') {
                browser.webRequest.onBeforeRequest.removeListener(listener);
            }
        })
        // 獲取警告觸發檔案名
    })
    .then(fileName => {
        let alertUrl = 'https://bahamut.akamaized.net/*/'+fileName;
        function createTabListener(details) {
            createTab();
            browser.webRequest.onCompleted.removeListener(createTabListener);
        }
        function createTab() {
            let tabEpiscodeInfo = tabInfo[tabId].tabEpiscodeInfo;
            let newSnCode;
            if (tabEpiscodeInfo.playingEpiscodeNum != tabEpiscodeInfo.max) {
                newSnCode = tabEpiscodeInfo[tabEpiscodeInfo.playingEpiscodeNum+1];
                browser.tabs.create({
                    url:'https://ani.gamer.com.tw/animeVideo.php?sn='+newSnCode,
                    active: false,
                })
                .then( async createdTab => {
                    setTimeout( () => {
                        browser.tabs.executeScript(createdTab.id,{
                            code: `const the_button = document.getElementById("adult");
                                if (the_button) {
                                    the_button.click();
                                }
                                else {
                                    console.log("click button error");
                                }
                            `
                        });
                    },15000);
                    setTimeout( () => {
                        browser.tabs.sendMessage(createdTab.id,{type: 'adEnd',url: (String(tabInfo[createdTab.id].videoCastUrl) + '&ad=end')})
                    },72000);
                });
            }
        }
        // 設定監聽器監聽警告檔案名
        browser.webRequest.onCompleted.addListener(createTabListener,{urls:[alertUrl],tabId:tabId});
        browser.tabs.onUpdated.addListener(async (tab_id,changeInfo,tab) => {
            if (tab_id == tabId && changeInfo.status == 'loading') {
                browser.webRequest.onCompleted.removeListener(createTabListener);
            }
        })
    })
}