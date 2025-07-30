import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import PastCodeBoxes from "@/components/PastCodeBoxes";
import { toast } from "sonner"

const languages = [
    {
        name: 'Javascript',
        value: 'javascript'
    },
    {
        name: 'Typescript',
        value: 'typescript'
    },
    {
        name: 'Python',
        value: 'python'
    },
    {
        name: 'C++',
        value: 'cpp'
    },
    {
        name: 'C',
        value: 'c'
    },
    {
        name: 'Go',
        value: 'go'
    },
    {
        name: 'Zig',
        value: 'zig'
    },
    {
        name: 'Rust',
        value: 'rust'
    },
    {
        name: 'Ruby',
        value: 'ruby'
    },
    {
        name: 'PHP',
        value: 'php'
    },
    // {
    //     name: 'Scala',
    //     value: 'scala'
    // },
    // {
    //     name: 'Haskell',
    //     value: 'haskell'
    // }
];


function generateCodeBoxId() {
    const characters = 'abcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < 15; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }
    return result;        
}


const Home = () => {
    const [codeBoxId, setCodeBoxId] = useState(generateCodeBoxId());
    const [language, setLanguage] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // console.log(codeBoxId);

    function onCodeBoxIdChange(e: React.ChangeEvent<HTMLInputElement>) {
        setCodeBoxId(e.target.value);
    }

    function onClickLanguage(language: string) {
        setLanguage(language);
        // console.log(language, " ", codeBoxId);
    }

    async function onSubmit() {
        if (!language || !codeBoxId) {
            toast.error("Please select a language and provide a codebox id");
            return;
        }

        if (codeBoxId.length < 8) {
            toast.error("CodeBox Id should be atleast 8 characters long");
            return;
        }

        setLoading(true);
        // console.log(language);

        try {
            const res= await axios.post(`${import.meta.env.VITE_BACKEND_URL}/create`, { codeBoxId: codeBoxId, language: language }, { withCredentials: true });

            console.log(res);
            
            if (res.status !== 200) {
                toast.error("Error creating CodeBox");
                setLoading(false);
                return;
            }
            
            // console.log("Codebox created successfully");
            setLoading(false);
            navigate(`/coding?codeBoxId=${codeBoxId}&lang=${language}`);
        } catch (error) {
            console.error('Error creating CodeBox:', error);
            setLoading(false);
        }
    }

    return (
        <div className="w-full mt-20 flex mb-5 max-h-screen">
            <PastCodeBoxes />

            <div className="w-2/3 flex flex-col justify-center items-center gap-20">
                <div className="flex gap-10 justify-center items-center bg-slate-800 p-5 w-1/2 rounded-3xl">
                    <div className="flex flex-col gap-2 w-1/3 items-start">
                        <h1 className="text-center font-medium text-xl">CodeBox Id</h1>
                        <p className="text-sm font-light text-slate-400">There shouldn't be spaces</p>
                    </div>
                    <Input defaultValue={codeBoxId} className="rounded-2xl" onChange={onCodeBoxIdChange} />
                </div>

                <div className="w-11/12">
                    <h1 className="text-center font-medium text-xl">Select the language</h1>
                    <div className="grid grid-cols-4 gap-10 mt-10">
                        {
                            languages.map((lang, index) => (
                                <div
                                    className={cn("p-4 border-2 text-lg font-medium rounded-3xl hover:scale-110 transition duration-200 cursor-pointer text-center", lang.value === language ? "bg-slate-500" : "bg-zinc-900")}
                                    key={index}
                                    onClick={() => onClickLanguage(lang.value)}
                                >
                                    {lang.name}
                                </div>
                            ))
                        }
                    </div>
                </div>

                <div>
                    <Button 
                        variant={"default"} 
                        className="bg-emerald-500 text-base font-medium w-56 rounded-3xl"  
                        disabled={loading || !language} 
                        onClick={onSubmit}
                    >
                        {loading ? 'Creating...' : !language ? 'Select Language' : 'Start Coding ...!!'}
                    </Button> 
                </div>
            </div>
        </div>
    );
}

export default Home;
