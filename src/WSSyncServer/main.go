// Modified by Chaserhkj for use in syncWebV
// Copyright 2013 The Gorilla WebSocket Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"flag"
	"log"
	"net/http"
)

var addr = flag.String("addr", ":4433", "http service address")
var cert = flag.String("cert", "./fullchain.pem", "TLS certificate")
var priv = flag.String("priv", "./privkey.pem", "TLS private key")

func serveHome(w http.ResponseWriter, r *http.Request) {
	log.Println(r.URL)
	http.Error(w, "Not found", http.StatusNotFound)
}

func main() {
	flag.Parse()
	hub := newHub()
	go hub.run()
	http.HandleFunc("/", serveHome)
	http.HandleFunc("/sync", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})
	err := http.ListenAndServeTLS(*addr, *cert, *priv, nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
