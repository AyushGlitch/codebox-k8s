import axios from "axios"
import { useEffect, useState } from "react"
import { FcFullTrash } from "react-icons/fc";
import { ImSpinner9 } from "react-icons/im"
import { useNavigate } from "react-router-dom";


type CodeBox = {
    codeboxid: string;
    containerName: string;
    language: string;
    status: string;
};


export default function PastCodeBoxes() {
    const [pastCodeBoxes, setPastCodeBoxes] = useState<CodeBox[]>()
    const [loading, setLoading]= useState<boolean>(true)
    const navigate= useNavigate()


    async function pastCodeBoxesHandleClick( {codeBoxId, language}: {codeBoxId: string, language: string} ) {
        setLoading(true);
        // console.log(language);

        try {
            await axios.post(`${import.meta.env.VITE_BACKEND_URL}/create`, { codeBoxId: codeBoxId, language: language }, { withCredentials: true });

            // console.log("Codebox created successfully");
            setLoading(false);
            navigate(`/coding?codeBoxId=${codeBoxId}&lang=${language}`);
        } catch (error) {
            console.error('Error creating CodeBox:', error);
            setLoading(false);
        }
    }


    async function pastCodeBoxesHandleDeleteClick( {codeBoxId, language}: {codeBoxId: string, language: string} ) {
        setLoading(true);

        try {
            await axios.post(`${import.meta.env.VITE_ORCHESTRATOR_URL}/deleteCodebox`, { codeBoxId: codeBoxId, language: language });
            await axios.post(`${import.meta.env.VITE_BACKEND_URL}/delete`, { codeBoxId: codeBoxId, language: language });

            setPastCodeBoxes( prevState => prevState?.filter( (codebox) => codebox.codeboxid != codeBoxId ) )

            setLoading(false)
        }
        catch (error) {
            console.error('Error deleting CodeBox:', error);
            setLoading(false);
        }
    }


    useEffect( () => {
        async function getPastCodeBoxes() {
            setLoading(true);
            try {
                const res = await axios.get(`${import.meta.env.VITE_ORCHESTRATOR_URL}/containers`);
                setPastCodeBoxes(res.data);
                console.log(res.data);  // Corrected to log the fetched data directly
            } catch (error) {
                console.error("Error fetching past code boxes:", error);
            } finally {
                setLoading(false);
            }
        }

        getPastCodeBoxes();
    }, [] )


    if (loading) {
        return (
            <div className="flex flex-col gap-7 justify-center items-center w-1/3 bg-slate-900 rounded-3xl ml-5">
                <h1 className="text-center font-medium text-xl">Loading Past CodeBoxes</h1>
                <ImSpinner9 size={30} className="animate-spin" />
            </div>
        )
    }


    return (
        <div className="flex flex-col gap-7 justify-start py-5 overflow-auto items-center w-1/3 bg-zinc-900 rounded-3xl ml-5">
            <h1 className="text-center font-medium text-xl">Loading Past CodeBoxes</h1>
            

            <div className="flex flex-col gap-4 w-full px-3">
                {
                    pastCodeBoxes && (
                        pastCodeBoxes.map( (codebox, i) => (
                                <div className="flex justify-between items-center gap-2 bg-slate-800 rounded-2xl w-full px-3 py-2 hover:cursor-pointer" 
                                    key={i}>
                                    <div className="flex flex-col bg-slate-900 px-3 py-2 w-11/12 rounded-2xl hover:scale-110 transition-all duration-200 " 
                                        onClick={() => pastCodeBoxesHandleClick( {codeBoxId: codebox.codeboxid, language: codebox.language} )}
                                    >
                                        <h1 className="text-base font-medium text-zinc-400"><span className="text-base font-bold text-white">CodeBox Id: </span>{codebox.codeboxid}</h1>
                                        <h1 className="text-base font-medium text-zinc-400"><span className="text-base font-bold text-white">Language: </span>{codebox.language}</h1>
                                    </div>

                                    <div className="flex flex-col bg-slate-900 px-2 py-2 rounded-2xl hover:scale-125 transition-all duration-200 " 
                                        onClick={() => pastCodeBoxesHandleDeleteClick( {codeBoxId: codebox.codeboxid, language: codebox.language} )}
                                    >
                                        <FcFullTrash size={20} className="group-hover:scale-110 transition-all duration-200" />
                                    </div>
                                </div>
                        ) )
                    )
                }
            </div>
        </div>
    )
}