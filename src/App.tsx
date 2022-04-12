import './App.css'
import AppRouter from './page/AppRouter'
import ConnectionProvider from './contexts/ConnectionProvider'
import DbProvider from './contexts/DbProvider'
import MessagesProvider from './contexts/MessagesProvider'

function App() {
  return (
    <div className='App'>
      <MessagesProvider>
        <DbProvider>
          <ConnectionProvider>
            <AppRouter />
          </ConnectionProvider>
        </DbProvider>
      </MessagesProvider>
    </div>
  )
}

export default App
