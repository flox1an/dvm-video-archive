import WebSocket from "ws";
import { SimplePool } from "nostr-tools";
import { useWebSocketImplementation } from "nostr-tools/relay";

// @ts-ignore
global.WebSocket = WebSocket;
useWebSocketImplementation(WebSocket);

export const pool = new SimplePool();
