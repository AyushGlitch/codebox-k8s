import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import Home from '@/pages/Home'
import Coding from '@/pages/Coding'

function App() {
    return (
        <>
          <BrowserRouter>
            <Navbar />
            <Routes>
                <Route path= '/' element={<Home />} />
                <Route path= '/coding' element={<Coding />} />
            </Routes>
          </BrowserRouter>
        </>
    )
}

export default App