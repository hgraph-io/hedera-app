import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import V1App from './V1App'
import V2App from './V2App'

export function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<V2App />} />
        <Route path="/v1" element={<V1App />} />
      </Routes>
    </Router>
  )
}

export default App
