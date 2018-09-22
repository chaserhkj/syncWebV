// ==UserScript==
// @name         BiliSync
// @namespace    https://github.com/chaserhkj/
// @version      1.1.1
// @description  Bilibili syncplay script
// @author       Chaserhkj
// @match        https://www.bilibili.com/video/*
// @match        https://www.bilibili.com/bangumi/play/*
// @grant        GM_getValue
// @grant        GM_setValue
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// @updateURL    https://github.com/chaserhkj/syncWebV/raw/master/src/BiliSync.user.js
// @downloadURL  https://github.com/chaserhkj/syncWebV/raw/master/src/BiliSync.user.js
// @supportURL   https://github.com/chaserhkj/syncWebV/
// ==/UserScript==
// Default host is set to my party VPN private address, which is easier for my
// friends to setup. You may want to change this.
var BSdefaultHost = "desktop.fastpub.zt.chaserhkj.me:4433"
var BSaddr = null;
waitForKeyElements(".bilibili-player-video video", BiliSync_Main, true);
var syncInterval = 5;
var syncDiff = 1;
var delayInterval = 5;

var BSstatus;
var BSvideo;
var BSenabled;
var BSwebsocket;
var pendingPlay;
var pendingPause;
var pendingSeek;
var syncTask;
var delayTask;
var estDelay;

function BiliSync_Main() {
    BSstatus = $("<div/>").text("BiliSync Standby, click to enable.").css("text-align","center").css("font-size","15px").css("padding","2px");
    $(".bilibili-player-area").append(BSstatus);
    BSvideo = $(".bilibili-player-video video")[0];

    BSstatus.click(function(event){
        if (BSenabled) {
            BSresetV();
        } else {
            BSenable(false);
        }
    });
    var mo_config = { attributes: true, childList: true, subtree: true };
    var mo = new MutationObserver(function(mList){
        for(var mutation of mList) {
            if (mutation.type == 'childList' && mutation.removedNodes.length > 0) {
                if (BSenabled) {
                    GM_setValue("lastAddr", BSaddr);
                }
                BSdisable();
                BSstatus.remove();
                waitForKeyElements(".bilibili-player-video video", BiliSync_Main, true);
            }
        }
    });
    mo.observe($("div.bilibili-player-video")[0], mo_config);
    var storeAddr = GM_getValue("lastAddr", "");
    if (storeAddr != ""){
        BSaddr = storeAddr;
        $.when(true).done(BSenable);
    }
}

// Play without signaling
function BSplayV(delay) {
    if (BSvideo.paused) {
        pendingPlay ++;
        BSvideo.click();
        $(BSvideo).one("play", function(event){
            pendingPlay --;
        });
        BSseekV(BSvideo.currentTime, delay);
    }
}

// Pause without signaling
function BSpauseV(delay) {
    if (!BSvideo.paused) {
        pendingPause ++;
        BSvideo.click();
        $(BSvideo).one("pause", function(event){
            pendingPause --;
        });
        BSseekV(BSvideo.currentTime, delay);
    }
}

// Seek without signaling
function BSseekV(target, delay) {
    pendingSeek ++;
    BSvideo.currentTime = target + (delay + estDelay) / 1000;
    $(BSvideo).one("seeking", function(event){
        pendingSeek --;
    });
}

function BSsyncV(target, delay) {
    if ((BSvideo.currentTime - target - (delay + estDelay) / 1000) >= syncDiff) {
        BSseekV(target, delay);
    }
}

// Reset with explicit signal
function BSresetV(target, noSignal) {
    BSvideo.currentTime = 0;
    BSpauseV();
    if (!noSignal){
        BSonSeek(null);
        BSonPause(null);
    }
}

function BSonPlay(event){
    if (!BSenabled || pendingPlay > 0) {
        return;
    }
    var data = {type:"PLAY", delay:estDelay, page:location.href};
    BSwebsocket.send(JSON.stringify(data));
}
function BSonPause(event) {
    if (!BSenabled || pendingPause > 0) {
        return;
    }
    var data = {type:"PAUSE", delay:estDelay, page:location.href};
    BSwebsocket.send(JSON.stringify(data));
}
function BSonSeek(event) {
    if (!BSenabled || pendingSeek > 0) {
        return;
    }
    var data = {type:"SEEK", target:BSvideo.currentTime, delay:estDelay, page:location.href};
    BSwebsocket.send(JSON.stringify(data));
}

function BSonsync() {
    var data = {type:"SYNC", target:BSvideo.currentTime, paused:BSvideo.paused, delay:estDelay, page:location.href};
    BSwebsocket.send(JSON.stringify(data));
}

function BSonpage() {
    var data = {type:"PAGE", target:location.href};
    BSwebsocket.send(JSON.stringify(data));
}

function BSattach() {
    $(BSvideo).on("play", BSonPlay);
    $(BSvideo).on("pause", BSonPause);
    $(BSvideo).on("seeking", BSonSeek);
    syncTask = setInterval(BSonsync, 1000 * syncInterval);
    delayTask = setInterval(function(){
        var data = {type:"PING", timestamp:$.now()}
        BSwebsocket.send(JSON.stringify(data));
    }, 1000 * delayInterval);
    BSstatus.on("contextmenu", BScontextMenu);
    BSstatus.on("mousedown", BSmiddledown);
}

function BSdetach() {
    $(BSvideo).off("play", BSonPlay);
    $(BSvideo).off("pause", BSonPause);
    $(BSvideo).off("seeking", BSonSeek);
    clearInterval(syncTask);
    clearInterval(delayTask);
    BSstatus.off("contextmenu", BScontextMenu);
    BSstatus.off("mousedown", BSmiddledown);
}

function BSmiddledown(event) {
    if (event.which == 2) {
        BSonpage();
    }
}

function BScontextMenu(event) {
    BSdisable();
    event.preventDefault();
}

function BSenable(resuming) {
    if (BSenabled) {
        return;
    }
    // Reset value on init
    GM_setValue("lastAddr", "");
    if (BSaddr == null)  {
        var host = prompt("Please enter Host:Port", BSdefaultHost);
        if (host == null) {
            return;
        }
        BSaddr = "wss://" + host + "/sync";
    }
    BSenabled = true;
    pendingPlay = 0;
    pendingPause = 0;
    pendingSeek = 0;
    BSwebsocket = new WebSocket(BSaddr);
    BSwebsocket.addEventListener("open", function(event){
        BSstatus.text("Connected. Click to reset. Right click to disable. Middle click to sync page.");
        BSattach();
        if (resuming){
            BSonpage();
            BSenabled = true;
        }
        BSonsync();
    });;
    BSwebsocket.onerror = function(event){
        BSstatus.text("Connection error. Click to retry.");
        BSenabled = false;
    };
    BSwebsocket.onmessage = BSmsghandler;
    BSwebsocket.onclose = function(event){
        if (event.code != 1000) {
            BSdisable();
        }
    };
}

function BSdisable() {
    if (!BSenabled) {
        return;
    }
    BSaddr = null;
    BSenabled = false;
    if (BSwebsocket.readyState <= 1) {
        BSwebsocket.close(1000);
    }
    BSdetach();
    BSstatus.text("Connection closed. Click to reconnect.");
}

function BSmsghandler(event) {
    var dataL = event.data.split(/\r?\n/)
    for (var i in dataL) {
        $.when(dataL[i]).done(BSdatahandler);
    }
}

function BSdatahandler(rdata) {
    var data = JSON.parse(rdata);
    if ((data.type == "PLAY" ||
         data.type == "PAUSE"||
         data.type == "SEEK" ||
         data.type == "SYNC")
        && data.page != location.href) {
        return;
    }
    switch(data.type) {
        case "PING":
            var newDelay = ($.now() - data.timestamp) / 2
            if (!estDelay) {
                estDelay = newDelay
            } else {
                estDelay = estDelay * 0.9 + newDelay * 0.1
            }
            break;
        case "PLAY":
            BSplayV(data.delay);
            break;
        case "PAUSE":
            BSpauseV(data.delay);
            break;
        case "SEEK":
            BSseekV(data.target, data.delay);
            break;
        case "SYNC":
            BSsyncV(data.target, data.delay);
            if (data.paused != undefined) {
                if (data.paused) {
                    BSpauseV(data.delay);
                } else {
                    BSplayV(data.delay);
                }
            }
            break;
        case "PAGE":
            if (data.target != location.href) {
                GM_setValue("lastAddr", BSaddr);
                BSdisable();
                BSstatus.remove();
                location.href = data.target;
            }
            break;
    }
}
