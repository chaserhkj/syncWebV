// Modified by Chaserhkj for use in syncWebV
// Copyright 2013 The Gorilla WebSocket Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

// Hub maintains the set of active clients and broadcasts messages to the
// clients.
type Hub struct {
	// Registered clients.
	clients map[*Client]bool

	// Inbound messages from the clients.
	broadcast chan *Msg

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client
}

// Msg holds a broadcasting message
type Msg struct {
	// Message broadcasted
	message []byte

	// Sender client
	sender *Client
}

func newHub() *Hub {
	return &Hub{
		broadcast:  make(chan *Msg),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
	}
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
		case msg := <-h.broadcast:
			for client := range h.clients {
				if client == msg.sender {
					continue
				}
				select {
				case client.send <- msg.message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
		}
	}
}
