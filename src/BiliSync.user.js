// ==UserScript==
// @name         BiliSync
// @namespace    https://github.com/chaserhkj/
// @version      1.0
// @description  Bilibili syncplay script
// @author       Chaserhkj
// @match        https://www.bilibili.com/video/*
// @match        https://www.bilibili.com/bangumi/play/*
// @grant        GM.getValue
// @grant        GM.setValue
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
var BSenabled = false;
var BSwebsocket;
var blocked = false;
var syncTask;
var delayTask;
var estDelay = 0;

function BiliSync_Main() {
    BSstatus = $("<div/>").text("BiliSync Standby, click to enable.").css("text-align","center").css("font-size","15px").css("padding","2px");
    $(".bilibili-player-area").append(BSstatus);
    BSvideo = $(".bilibili-player-video video")[0];

    BSstatus.click(function(event){
        if (BSenabled) {
            BSresetV();
        } else {
            BSenable();
        }
    });
    var mo_config = { attributes: true, childList: true, subtree: true };
    var mo = new MutationObserver(function(mList){
        for(var mutation of mList) {
            if (mutation.type == 'childList' && mutation.removedNodes.length > 0) {
                if (BSenabled) {
                    GM.setValue("lastAddr", BSaddr);
                }
                BSdisable();
                BSstatus.remove();
                waitForKeyElements(".bilibili-player-video video", BiliSync_Main, true);
            }
        }
    });
    mo.observe($("div.bilibili-player-video")[0], mo_config);
    var storeAddr = GM.getValue("lastAddr", "");
    if (storeAddr != ""){
        BSaddr = storeAddr;
        BSenable();
        BSonpage();
    }
}

function BSplayV(delay) {
    if (BSvideo.paused) {
        BSvideo.click();
    }
    BSseekV(BSvideo.currentTime, delay);
}

function BSpauseV(delay) {
    if (!BSvideo.paused) {
        BSvideo.click();
    }
    BSseekV(BSvideo.currentTime, delay);
}

function BSseekV(target, delay) {
    BSvideo.currentTime = target + (delay + estDelay) / 1000;
}

function BSsyncV(target, delay) {
    if ((BSvideo.currentTime - target - (delay + estDelay) / 1000) >= syncDiff) {
        blocked = true;
        BSseekV(target, delay);
        $(BSvideo).one("seeking", function(event){
                blocked = false;
        });
    }
}

function BSresetV(target) {
    BSvideo.currentTime = 0;
    BSpauseV();
}

function BSonPlay(event){
    if (!BSenabled || blocked) {
        return;
    }
    var data = {type:"PLAY", delay:estDelay, page:location.href};
    BSwebsocket.send(JSON.stringify(data));
}
function BSonPause(event) {
    if (!BSenabled || blocked) {
        return;
    }
    var data = {type:"PAUSE", delay:estDelay, page:location.href};
    BSwebsocket.send(JSON.stringify(data));
}
function BSonSeek(event) {
    if (!BSenabled || blocked) {
        return;
    }
    var data = {type:"SEEK", target:BSvideo.currentTime, delay:estDelay, page:location.href};
    BSwebsocket.send(JSON.stringify(data));
}

function BSonsync() {
    var data = {type:"SYNC", target:BSvideo.currentTime, delay:estDelay, page:location.href};
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

function BSenable() {
    if (BSenabled) {
        return;
    }
    // Reset value on init
    GM.setValue("lastAddr", "");
    if (BSaddr == null)  {
        var host = prompt("Please enter Host:Port", BSdefaultHost);
        if (host == null) {
            return;
        }
        BSaddr = "wss://" + host + "/sync";
    }
    BSenabled = true;
    BSwebsocket = new WebSocket(BSaddr);
    BSwebsocket.onopen = function(event){
        BSstatus.text("Connected. Click to reset. Right click to disable. Middle click to sync page.");
        BSattach();
        if (BSvideo.paused) {
            BSonPause(null);
        } else {
            BSonPlay(null);
        }
        BSonsync();
    };
    BSwebsocket.onerror = function(event){
        BSstatus.text("Connection error. Click to retry.");
        BSenabled = false;
    };
    BSwebsocket.onmessage = BSmsghandler;
    BSwebsocket.onclose = function(event){
        BSdisable();
    };
}

function BSdisable() {
    if (!BSenabled) {
        return;
    }
    BSaddr = null;
    BSenabled = false;
    BSwebsocket.close(1000);
    BSdetach();
    BSstatus.text("Connection closed. Click to reconnect.");
}

function BSmsghandler(event) {
    var data = JSON.parse(event.data);
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
            if (estDelay == 0) {
                estDelay = newDelay
            } else {
                estDelay = estDelay * 0.9 + newDelay * 0.1
            }
            break;
        case "PLAY":
            blocked = true;
            BSplayV(data.delay);
            $(BSvideo).one("seeking", function(event){
                blocked = false;
            });
            break;
        case "PAUSE":
            blocked = true;
            BSpauseV(data.delay);
            $(BSvideo).one("seeking", function(event){
                blocked = false;
            });
            break;
        case "SEEK":
            blocked = true;
            BSseekV(data.target, data.delay);
            $(BSvideo).one("seeking", function(event){
                blocked = false;
            });
            break;
        case "SYNC":
            BSsyncV(data.target, data.delay);
            break;
        case "PAGE":
            if (data.target != location.href) {
                GM.setValue("lastAddr", BSaddr);
                location.href = data.target;
            }
            break;
    }
}
