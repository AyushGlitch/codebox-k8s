# Go Proxy Server

This is a simple HTTP and WebSocket proxy server written in Go that forwards requests to a configured load balancer IP.

## Configuration

The server reads configuration from a `.env` file:

- `PORT`: The port on which the proxy server will run (default: 8080)
- `LOADBALANCER_IP`: The IP address of the load balancer to proxy requests to

## How it works

The proxy server:
1. Listens for incoming HTTP and WebSocket requests on the configured port
2. Detects WebSocket upgrade requests automatically
3. For HTTP requests: forwards to `http://LOADBALANCER_IP/original_path`
4. For WebSocket requests: establishes bidirectional connection to `ws://LOADBALANCER_IP/original_path`
5. Preserves the original path and query parameters for both protocols

## Examples

If you have:
- `PORT=8080`
- `LOADBALANCER_IP=172.19.0.3`

**HTTP requests:**
- `http://localhost:8080/api/data` → `http://172.19.0.3/api/data`
- `http://localhost:8080/pod/yjs?param=value` → `http://172.19.0.3/pod/yjs?param=value`

**WebSocket requests:**
- `ws://localhost:8080/websocket` → `ws://172.19.0.3/websocket`
- `ws://localhost:8080/ws/chat?room=123` → `ws://172.19.0.3/ws/chat?room=123`

## Usage

1. Update the `.env` file with your desired port and load balancer IP
2. Run the server:
   ```bash
   go mod tidy
   go run main.go
   ```

## Dependencies

- `github.com/joho/godotenv` - For loading environment variables from .env file
- `github.com/gorilla/websocket` - For WebSocket proxy functionality 