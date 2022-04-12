import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
// import Board from '../components/Board'
import Connect from './Connect'
import Homepage from './Homepage'
const AppRouter = () => {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path='/connect' element={<Connect />} />
          <Route path='/' element={<Homepage />} />
          <Route path='*' element={<Navigate to='/' />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}
export default AppRouter
