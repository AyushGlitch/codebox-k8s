import { useEffect, useState } from "react"
import { io, Socket } from "socket.io-client"


export const useSocket = (workspaceId: string) => {
    const [socket, setSocket] = useState<Socket | null>(null)

    useEffect( () => {
        const ws= io(`${import.meta.env.VITE_WS_URL}`, {
            query: {
                "workspaceId": workspaceId
            },
            timeout: 20 * 60 * 1000
        })
        setSocket(ws)
        console.log("Socket connected", ws)

        return ( () => {
            ws.disconnect()
        } )

    }, [workspaceId] )

    return socket
}