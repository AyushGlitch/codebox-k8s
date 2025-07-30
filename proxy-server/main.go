package main

import (
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"

	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	loadBalancerIP := os.Getenv("LOADBALANCER_IP")
	if loadBalancerIP == "" {
		log.Fatal("LOADBALANCER_IP must be set in .env file")
	}

	// Create proxy handler
	proxyHandler := &ProxyHandler{
		LoadBalancerIP: loadBalancerIP,
	}

	http.HandleFunc("/", proxyHandler.ServeHTTP)

	fmt.Printf("Proxy server starting on port %s\n", port)
	fmt.Printf("Proxying to load balancer IP: %s\n", loadBalancerIP)
	
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

type ProxyHandler struct {
	LoadBalancerIP string
}

func (p *ProxyHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Extract the original URL path
	originalURL := r.URL.String()
	fmt.Printf("Received request: %s %s\n", r.Method, originalURL)

	// Check if this is a WebSocket upgrade request
	if p.isWebSocketRequest(r) {
		p.handleWebSocket(w, r)
		return
	}

	// Handle regular HTTP requests
	// Create target URL with load balancer IP and same path
	target, err := url.Parse("http://" + p.LoadBalancerIP + r.URL.Path)
	if err != nil {
		http.Error(w, "Invalid target URL", http.StatusBadRequest)
		return
	}

	// Preserve query parameters
	target.RawQuery = r.URL.RawQuery

	fmt.Printf("Proxying HTTP to: %s\n", target.String())

	// Create reverse proxy
	proxy := httputil.NewSingleHostReverseProxy(target)
	
	// Modify the request
	r.URL.Host = target.Host
	r.URL.Scheme = target.Scheme
	r.Header.Set("X-Forwarded-Host", r.Header.Get("Host"))
	r.Host = target.Host

	// Serve the request
	proxy.ServeHTTP(w, r)
}

func (p *ProxyHandler) isWebSocketRequest(r *http.Request) bool {
	connection := strings.ToLower(r.Header.Get("Connection"))
	upgrade := strings.ToLower(r.Header.Get("Upgrade"))
	
	// Check if Connection contains "upgrade" (it might have multiple values)
	hasUpgrade := strings.Contains(connection, "upgrade")
	isWebSocket := upgrade == "websocket"
	
	return hasUpgrade && isWebSocket
}

func (p *ProxyHandler) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	// Create WebSocket URL for target server
	targetURL := "ws://" + p.LoadBalancerIP + r.URL.Path
	if r.URL.RawQuery != "" {
		targetURL += "?" + r.URL.RawQuery
	}

	fmt.Printf("Proxying WebSocket to: %s\n", targetURL)

	// Create WebSocket upgrader
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true // Allow all origins for simplicity
		},
	}

	// Upgrade the HTTP connection to WebSocket
	clientConn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade client connection: %v", err)
		return
	}
	defer clientConn.Close()

	// Connect to target WebSocket server
	targetConn, _, err := websocket.DefaultDialer.Dial(targetURL, nil)
	if err != nil {
		log.Printf("Failed to connect to target WebSocket: %v", err)
		clientConn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseInternalServerErr, "Failed to connect to target"))
		return
	}
	defer targetConn.Close()

	// Start bidirectional proxying
	errChan := make(chan error, 2)

	// Proxy messages from client to target
	go func() {
		errChan <- p.copyWebSocketMessages(targetConn, clientConn, "client->target")
	}()

	// Proxy messages from target to client
	go func() {
		errChan <- p.copyWebSocketMessages(clientConn, targetConn, "target->client")
	}()

	// Wait for either connection to close or error
	err = <-errChan
	if err != nil {
		log.Printf("WebSocket proxy error: %v", err)
	}
}

func (p *ProxyHandler) copyWebSocketMessages(dst, src *websocket.Conn, direction string) error {
	for {
		messageType, message, err := src.ReadMessage()
		if err != nil {
			if websocket.IsCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.Printf("WebSocket connection closed (%s): %v", direction, err)
			} else {
				log.Printf("Error reading WebSocket message (%s): %v", direction, err)
			}
			return err
		}

		if err := dst.WriteMessage(messageType, message); err != nil {
			log.Printf("Error writing WebSocket message (%s): %v", direction, err)
			return err
		}
	}
}

 