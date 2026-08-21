import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/layout'
import RequireAuth from './components/auth/RequireAuth'
import Login          from './pages/Login'
import EsqueciSenha   from './pages/EsqueciSenha'
import RedefinirSenha from './pages/RedefinirSenha'
import Dashboard   from './pages/Dashboard'
import Entregas    from './pages/Entregas'
import Veiculos    from './pages/Veiculos'
import Motoristas  from './pages/Motoristas'
import Rotas       from './pages/Rotas'
import OtimizacaoRotas from './pages/OtimizacaoRotas'
import Relatorios from './pages/Relatorios'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />

        <Route element={<RequireAuth />}>
          <Route path="/" element={<Layout />}>
            <Route index         element={<Dashboard />}  />
            <Route path="entregas"   element={<Entregas />}   />
            <Route path="veiculos"   element={<Veiculos />}   />
            <Route path="motoristas" element={<Motoristas />} />
            <Route path="rotas"      element={<Rotas />}      />
            <Route path="otimizacao-rotas" element={<OtimizacaoRotas />} />
            <Route path="relatorios" element={<Relatorios />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
