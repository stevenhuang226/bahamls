//var
var tabInfo = {};
// tab listener
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (/^https:\/\/ani\.gamer\.com\.tw\/animeVideo\.php\?sn=.*/.test(changeInfo.url) && changeInfo.status == 'loading') {
        console.log('tab actived');
        tabInfo[tabId] = tabInfo[tabId] ?? {};
        console.log(tabInfo[tabId]);
        DeviceIdRequestHeader(tabId);
        getDeviceId(tabId);
    }
})
// message listener
async function messageListener(message,sender,sendResponse){
    let tabId = sender.tab.id;
    if (message.type === 'tabActive') {
        return new Promise(resolve => {
            tabInfo[tabId] = tabInfo[tabId] ?? {};
            console.log(tabId,'loaded');
            resolve();
        })
        .then( () => {
            setTimeout( () => {
                browser.tabs.sendMessage(tabId, {type:'getEpiscode'});
            },2000);
            setTimeout( () => {
                waitCreatNewTab(tabId);
            },3500);
        });
    }
    if (message.type == 'episcodeInfo') {
        await Object.assign(tabInfo[tabId], {tabEpiscodeInfo: message.episcodeInfo});
        await Object.assign(tabInfo[tabId], {tabAnimeName: message.animeName});
        getAdStartS(tabId);
        /*localStorage.setItem([message.animeName],JSON.stringify(message.episcodeInfo)); /* */
    }
}
browser.runtime.onMessage.addListener(messageListener);

async function getDeviceId(tabId) { //ok
    return new Promise((resolve) => {
        console.log('deviceId攔截器開始工作'); //test
        async function listener(details) {
            console.log('deviceId 攔截被觸發'); //test
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
                browser.webRequest.onBeforeRequest.removeListener(listener);
                resolve(deviceId);
            }
        }
        browser.webRequest.onBeforeRequest.addListener(listener,{urls:['https://ani.gamer.com.tw/ajax/getdeviceid.php?id=*'], tabId: tabId} ,['blocking']);
    })
    .then( deviceId => {
        Object.assign(tabInfo[tabId], {'deviceId': deviceId});
    })
}
async function DeviceIdRequestHeader(tabId) {
    async function listener(details) {
        let checkAdCodeStrStart;
        let checkAdCodeStrEnd;
        return new Promise((result) => {
            let headerArr = details.requestHeaders;
            let header = headerArr.reduce((obj,header) => {
                obj[header.name] = header.value
                return obj
            });
            result(header);
        })
        .then( async header => {
            let originCookie = await header.Cookie;
            checkAdCodeStrStart = await originCookie.indexOf('ckBahaAd=')+9;
            let codeReplaceList = ('0123456789abcdefghijklmnopqrst'.toUpperCase()).split('');
            let checkAdCode;
            let newCodeList = [];

            if (originCookie.length - checkAdCodeStrStart > 20) {
                checkAdCodeStrEnd = originCookie.indexOf('--;',checkAdCodeStrStart)+2;
                checkAdCode = originCookie.substring(checkAdCodeStrStart,checkAdCodeStrEnd);
            }
            else {
                checkAdCodeStrEnd = originCookie.indexOf('--"',checkAdCodeStrStart)+2;
                checkAdCode = originCookie.substring(checkAdCodeStrStart,checkAdCodeStrEnd);
            }
            checkAdCode = originCookie.substring(checkAdCodeStrStart,checkAdCodeStrEnd);
            let code = await (checkAdCode.replace(/-/g,'').split('')).reverse();
            code.forEach( (element,index) => { // TODO need to rework max = 2T min = 0
                if (element == 'T' && index == 0) {
                    newCodeList.push(codeReplaceList[0]);
                }
                else if(index == 0) {
                    newCodeList.push(codeReplaceList[codeReplaceList.indexOf(element)+1]);
                }
                else if(index != 0 && code[index-1] == '0') {
                    if (element == 'T') {
                        newCodeList.push(codeReplaceList[0]);
                    }
                    else {
                        newCodeList.push(codeReplaceList[codeReplaceList.indexOf(element)+1]);
                    }
                }
            });
            console.log(newCodeList);
            return [newCodeList,checkAdCode,header];
            // // 將newCodeList變成字串
            // // 將取得的newCode寫回去checkAdCode裡面
            // // 將寫好的checkAdCode寫回Cookie
            // // 修改Cookie然後回傳            
            // 算出新的achbahaad code
        })
        .then( async ([newCodeList,checkAdCode,header]) => {
            let checkAdCodeList = checkAdCode.split('');
            let num = 0;
            checkAdCodeList.forEach( (element,index) => {
                if (element != '-') {
                    checkAdCodeList[index] = newCodeList[num];
                    num += 1;
                }
            });
            return [checkAdCodeList,header];
            // 將算出來的新Code寫入checkadcode
        })
        .then (([checkAdCodeList, header]) => {
            let checkAdCode = checkAdCodeList.join('');
            let newCookie = header.Cookie.replace(header.Cookie.slice(checkAdCodeStrStart, checkAdCodeStrEnd), checkAdCode);
            return [newCookie,header];
        })
        .then( ([newCookie,header]) => {
            Object.assign(tabInfo[tabId], {'deviceIdHeader': header});
            Object.assign(tabInfo[tabId], {'VideoCastCookie' : newCookie});
        });
    }
    browser.webRequest.onBeforeSendHeaders.addListener(listener,{urls: ['https://ani.gamer.com.tw/ajax/getdeviceid.php?id=*'],tabId: tabId}, ['blocking','requestHeaders'])
}
async function getAdStartS(tabId) {
    return new Promise( (resolve,reject) => {
        browser.webRequest.onCompleted.addListener( details => {
            let getUrl = details.url;
            let codeSInfo = getUrl.substring(getUrl.indexOf('php?s=')+6, getUrl.indexOf('&sn=')-1);
            resolve(codeSInfo);
        },{urls:[
            'https://ani.gamer.com.tw/ajax/videoCastcishu.php?s=*&sn=*'
        ], tabId: tabId},);
    })
    .then(　codeSInfo => {
        Object.assign(tabInfo[tabId],{'adSCode': codeSInfo});
    })
}
async function waitCreatNewTab(tabId) {    
    console.log('waitCreatNewTab監聽介入'); // test
    return new Promise( (resolve) => {
        async function listener(details) {
            const responseBody = browser.webRequest.filterResponseData(details.requestId);
            let decoder = new TextDecoder('utf-8');
            let responseText = '';
            responseBody.ondata = event => {
                responseText += decoder.decode(event.data, {stream: true});
            }
            responseBody.onstop = async event => {
                console.log(responseText); //test
                if (responseText.includes('IV=')) {
                    filteTextStart = responseText.indexOf('media',responseText.length-500);
                    const m3u8FileAlert = responseText.substring(filteTextStart,responseText.indexOf('ts',filteTextStart)+2);
                    resolve(m3u8FileAlert);
                    setTimeout( () => {
                        responseBody.disconnect();
                        browser.webRequest.onBeforeRequest.removeListener(listener);
                    },200);
                }
            }
        }
        browser.webRequest.onBeforeRequest.addListener(listener,{urls:['https://bahamut.akamaized.net/*chunklist_b*.m3u8'], tabId: tabId},);
        // 獲取警告觸發檔案名
    })
    .then(fileName => {
        // 設定監聽器監聽警告檔案名
        console.log('警戒檔名：',fileName);
        browser.webRequest.onCompleted.addListener( details => {
            console.log('檢測到檔案被讀取，開始建立新分頁'); // test
            let tabEpiscodeInfo = tabInfo[tabId].tabEpiscodeInfo;
            let newSnCode;
            if (tabEpiscodeInfo.playingEpiscodeNum != tabEpiscodeInfo.max) {
                newSnCode = tabEpiscodeInfo[tabEpiscodeInfo.playingEpiscodeNum+1];
                browser.tabs.create({
                    url:'https://ani.gamer.com.tw/animeVideo.php?sn='+newSnCode,
                    active: false,
                })
                .then( async createdTab => {
                    await new Promise(resolve => setTimeout(resolve,7000));
                    let tabDeviceId = tabInfo[createdTab.id].deviceId;
                    let tabAdStartS = await (parseInt(tabInfo[tabId].adSCode));
                    Object.assign(tabInfo[onCreat.id], {adScode: String(tabAdStartS)});
                    return new Promise( resolve => {
                        requestUrl = 'https://ani.gamer.com.tw/ajax/videoCastcishu.php?s=' + tabAdStartS + '&sn=' + newSnCode;
                        console.log(createdTab.id,'video cast url =', requestUrl);
                        // TODO 可能會需要增加設定Cookie的程式碼
                        resolve(requestUrl);
                    })
                    .then( async requestUrl => {
                        browser.tabs.sendMessage(createdTab.id, {type: 'adStartRequest', url: requestUrl});
                        setTimeout( () => {
                            return requestUrl;
                        },30000)
                    })
                    .then( async requestUrl => {
                        browser.tabs.sendMessage(createdTab.id, {type: 'adEndRequest', url: requestUrl+'&ad=end'});
                    });

                })
            }
        },{urls:['https://bahamut.akamaized.net*'+fileName],tabId:tabId});
    })
}
async function timeNewTab(playingTabId,animeName) {
    /*
    let playingSncode;
    if (playingTabId.url.indexOf('#') == true) {
        playingSncode = playingTabId.url.substring(playingTabId.url.indexOf('sn=')+3,playingTabId.url.indexOf('#')-1);
    }
    else {
        playingSncode = playingTabId.url.substring(playingTabId.url.indexOf('sn=')+3,-1);
    }/* */
    episcodeInfo = await JSON.parse(localStorage.getItem(animeName));
    let alertRequestName = await getM3u8Alert(playingTabId);
}
// TODO 計算下一集的網址，然後發送已經看過廣告的東西 => 由document.getclassname獲取，並且分析內容
// TODO 攔截m3u8檔案 => 網址不像ad的m3u8就直接截取內容
// TODO 檢測m3u8檔案倒數幾行，設定監聽器，如果倒數幾個檔案被觸發，就在背景打開分頁，開始播放廣告
// TODO 偵測播放時間，在指定時間播放（可能可以由m3u8檔案已經要結束的狀況）=> 延伸：偵測m3u8檔案長度，然後在偵測到m3u8檔案最後幾個東西已經傳送完畢的時候，發送看過廣告的GET


// ad start 裡面的s直接用之前的加上去，直接搞個數字就行，不管那麼多