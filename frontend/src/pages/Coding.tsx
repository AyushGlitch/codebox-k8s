import Workspace from "@/components/Workspace";
import { useSocket } from "@/hooks/useSocket";
import { useYWorkspace, type FileItem } from "@/hooks/useYWorkspace";
import axios from "axios";
import { useEffect, useState } from "react";
import { ImSpinner10 } from "react-icons/im";
import { useSearchParams } from "react-router-dom";



export const Coding = () => {
    const [workspaceCreated, setWorkspaceCreated] = useState(false);
    const [searchParams] = useSearchParams();
    const workspaceId = searchParams.get('workspaceId');
    const language = searchParams.get('language');

    useEffect( () => {
        async function createWorkspace() {
            try {
                await axios.post(`${import.meta.env.VITE_ORCHESTRATOR_URL}/start`, {workspaceId, language})
                setWorkspaceCreated(true);
            } catch (error) {
                console.error('Error creating workspace:', error);
            }
        }

        if (workspaceId && language) {
            createWorkspace();
        }
    }, [workspaceId, language] )

    if (!workspaceCreated) {
        return (
            <div className="w-full flex flex-col gap-14 justify-center items-center mt-28">
                <ImSpinner10 size={200} className="animate-spin" />
                <h1 className="text-2xl font-bold text-slate-400">Creating workspace...</h1>
            </div>
        )
    }

    return (
        <Workspace />
    )
}