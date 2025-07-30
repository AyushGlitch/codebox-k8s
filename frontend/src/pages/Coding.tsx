import axios from "axios"
import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Socket, io } from "socket.io-client"
import { File, RemoteFile, Type } from "../components/editor/utils/file-manager"
import { Editor } from "../components/Editor"
import { TerminalComp } from "../components/Terminal"
import { ImSpinner10 } from "react-icons/im"


const useSocket = (codeBoxId: string) => {
    const [socket, setSocket] = useState<Socket | null>(null)

    useEffect( () => {
        // async function copyData() {
        //     await axios.post(`http://localhost:3001/copy`, { replId: codeBoxId })
        // }

        // copyData()

        const ws= io(`${import.meta.env.VITE_WS_URL}`, {
            query: {
                "replId": codeBoxId
            },
            timeout: 20 * 60 * 1000
        })
        setSocket(ws)
        console.log("Socket connected", ws)

        return ( () => {
            ws.disconnect()
        } )

    }, [codeBoxId] )

    return socket
}


function Coding() {
    const [codeBoxCreated, setCodeBoxCreated] = useState(false)
    const [searchParams]= useSearchParams()
    const codeBoxId= searchParams.get('codeBoxId')
    const language= searchParams.get('lang')

    useEffect( () => {
        async function createCodeBox() {
            try {
                await axios.post(`${import.meta.env.VITE_ORCHESTRATOR_URL}/start`, { codeBoxId, language })
                // await axios.get(`http://localhost:3001/copy?replId=${codeBoxId}`)

                setCodeBoxCreated(true)

            }
            catch (err) {
                console.error(err)
            }
        }

        if (codeBoxId && language) {
            createCodeBox()
        }
    }, [] )

    if (!codeBoxCreated) {
        return (
            <div className="w-full flex flex-col gap-14 justify-center items-center mt-28">
                <ImSpinner10 size={200} className="animate-spin" />
                <h1 className="font-bold text-2xl text-slate-400">Creating CodeBox...</h1>
            </div>
        )
    }

    return (
        <FinalCodingPage codeBoxId={codeBoxId!} language={language!} />
    )
}


function FinalCodingPage( {codeBoxId, language} : {codeBoxId: string, language: string} ) {
    // console.log(codeBoxId, language)
    const [loaded, setLoaded]= useState(false)
    const socket= useSocket(codeBoxId)
    const [fileStructure, setFileStructure]= useState<RemoteFile[]>([])
    const [selectedFile, setSelectedFile]= useState<File | undefined>(undefined)
    // const [showOutput, ]


    useEffect ( () => {
        if (socket) {
            socket.on('loaded', ({rootContent} : {rootContent: RemoteFile[]}) => {
                setLoaded(true)
                setFileStructure(rootContent)
            })
        }

    }, [socket] )


    const onSelect = (file: File) => {
        if (file.type === Type.DIRECTORY) {
            socket?.emit("fetchDir", file.path, (data: RemoteFile[]) => {
                setFileStructure(prev => {
                    const allFiles = [...prev, ...data];
                    return allFiles.filter((file, index, self) => 
                        index === self.findIndex(f => f.path === file.path)
                    );
                });
            });
        } else {
            socket?.emit("fetchContent", { path: file.path }, (data: string) => {
                file.content = data;
                setSelectedFile(file);
            });
        }
    };
    
    if (!loaded) {
        return (
            <div className="w-full flex flex-col gap-14 justify-center items-center mt-28">
                <ImSpinner10 size={200} className="animate-spin" />
                <h1 className="font-bold text-2xl text-slate-400">Preparing CodeBox...</h1>
                <h1 className="font-medium text-xl text-slate-500">Please have patience, installing dependencies.... (May take a while)</h1>
            </div>
        )
    }

    return (
        <div className="mt-10 w-full flex flex-col gap-5 justify-between">
            <div className="border-2 h-[400px] overflow-auto">
                <Editor socket={socket!} selectedFile={selectedFile} files={fileStructure} onSelect={onSelect} />
            </div>

            <div className="border-2 h-[230px]">
                <TerminalComp socket={socket!} />
            </div>
        </div>
    )
}

export default Coding