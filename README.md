
# syncWebV

syncWebV is a framework providing similar functionalities as [syncplay](http://syncplay.pl),
synchronizing video playback amongst multiple peers, yet targeting web video playbacks.

## But, why another, since we have syncplay ?

syncplay is great, we use it regularly to play videos stored locally and stored
on our own server, as well as playing some web videos. However, using syncplay
to play web video has many limitations. Many on-site features such as Danmaku
(floating video comments) from Bilibili, and recommended related videos are not
available for syncplay. Also, some copyright-protected, region-restricted videos
might cause problem for playback outside the browser.

## Features

- Websocket-based protocol
- Golang-based Server (Modified from [gorilla/websocket](https://github.com/gorilla/websocket)'s chat server examples, thanks for that!)
- Userscript client
- Synchronization of playback events
- Periodic synchronization of playback progress
- Synchronization of page navigation on video site
- Automatic delay detection, for offsetting the delay impact on higher delays
- Currently no session control/authentication, but planned for future

## Supported sites

Currently [Bilibili](https://www.bilibili.com/) only, but others might be planned
for future

## Installation and Usage

### Server

#### Build

```
$ go get github.com/gorilla/websocket
$ cd src/WSSyncServer
$ go build
```

#### Usage

You should prepare your own TLS cert and privkey for secure websocket.

```
$ ./WSSyncServer [-addr host:port] [-cert cert_file] [-priv privkey_file]
```

`./WSSyncServer -h` for more info

Note that currently no session control/authentication is implemented, this should
not be hosted publicly. A private network is recommended for hosting this, take 
a look at [ZeroTier](https://zerotier.com/) for your party.

### Client

#### Install

- Install [Tampermonkey](https://tampermonkey.net/) for chrome, or [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/) for firefox
- Visit [this page](https://github.com/chaserhkj/syncWebV/raw/master/src/BiliSync.user.js) to install the userscript for Bilibili (BiliSync)

#### Usage

On Bilibili play page, a banner should be shown below the video player, which should show self-explainable instructions for use the script.

## Roadmap

- [  ] Session control
- [  ] Authentication
- [  ] Standardize the protocol
- [  ] Support for other sites

## License

This project is licensed under the below BSD license.

```
Copyright 2018 Chaserhkj

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```
