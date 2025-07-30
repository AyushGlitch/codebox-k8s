import { NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import axios from "axios";
import { useState } from "react";
import { ImSpinner9 } from "react-icons/im";



function Navbar () {

    const path= useLocation().pathname
    const [searchParams]= useSearchParams()
    const navigate= useNavigate()
    const [codeboxRemoved, setCodeboxRemoved]= useState(true)

    let codeBoxId: string | null= null;
    if (path==='/coding') {
        codeBoxId= searchParams.get('codeBoxId')
    }

    async function handleStopCodebox() {
        try {
            setCodeboxRemoved(false)
            await axios.post(`${import.meta.env.VITE_ORCHESTRATOR_URL}/stop`, { codeBoxId })
            setCodeboxRemoved(true)
            navigate('/')
        }
        catch (err) {
            console.error(err)
            setCodeboxRemoved(true) // Reset loading state on error
        }
    }

    return (
        <nav className="flex justify-between items-center mx-5 my-3">
            <div>
                <h1 className="text-2xl font-semibold">CodeBox</h1>
            </div>

            <div className="flex gap-4">
                <Button variant={"secondary"} className={cn("text-base border-b-4 rounded-xl p-5", path=='/'?'border-b-white' :'')} asChild>
                    <NavLink to={'/'} >Home</NavLink>
                </Button>

                <Button variant={"secondary"} className={cn("text-base border-b-4 rounded-xl p-5", path=='/coding'?'border-b-white' :'')}>
                    Coding
                </Button>

                {
                    path==='/coding' && (
                        codeboxRemoved ? (
                            <Button variant={"destructive"} onClick={handleStopCodebox} className="text-base rounded-xl p-5">
                                Stop CodeBox
                            </Button>
                        )
                        : (
                            <Button variant={"destructive"} className="text-base rounded-xl p-5">
                                <ImSpinner9 className="animate-spin"/>
                            </Button>
                        )
                    )
                }
            </div>

            <div className="w-1/12">
            </div>
        </nav>
    )
}

export default Navbar;