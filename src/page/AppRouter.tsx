import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ConnectionContext } from '../contexts/ConnectionContext'
import { useContext } from 'react'
import Connect from './Connect'
import Homepage from './Homepage'

const AppRouter = () => {
  const { name } = useContext(ConnectionContext)

  return (
    <>
      <BrowserRouter>
        <Routes>
          {name !== '' && <Route path='/connect' element={<Connect />} />}
          <Route path='/' element={<Homepage />} />
          <Route path='*' element={<Navigate to='/' />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}
export default AppRouter
