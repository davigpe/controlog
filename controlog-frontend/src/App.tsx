import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/layout'
import RequireAuth from './components/auth/RequireAuth'
import { PERFIS_GESTAO } from './lib/perfil'
import Login          from './pages/Login'
import EsqueciSenha   from './pages/EsqueciSenha'
import RedefinirSenha from './pages/RedefinirSenha'
import MinhasRotas from './pages/MinhasRotas'
import Dashboard   from './pages/Dashboard'
import Entregas    from './pages/Entregas'
import Veiculos    from './pages/Veiculos'
import Motoristas  from './pages/Motoristas'
import Clientes    from './pages/Clientes'
import Rotas       from './pages/Rotas'
import Atribuicoes from './pages/Atribuicoes'
import OtimizacaoRotas from './pages/OtimizacaoRotas'
import Pedidos from './pages/Pedidos'
import Planos from './pages/Planos'
import PlanoDetalhe from './pages/PlanoDetalhe'
import Relatorios from './pages/Relatorios'
import RotasDoDia from './pages/RotasDoDia'
import Ajuda from './pages/Ajuda'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />

        {/* Visão restrita do motorista — compartilha o Layout, mas é a única
            rota que o perfil MOTORISTA consegue abrir. */}
        <Route element={<RequireAuth perfis={['MOTORISTA']} />}>
          <Route path="/" element={<Layout />}>
            <Route path="minhas-rotas" element={<MinhasRotas />} />
            {/* A ajuda e o unico lugar fora de "Minhas Rotas" que o motorista
                alcanca: e quem mais precisa de orientacao em campo. */}
            <Route path="ajuda" element={<Ajuda />} />
          </Route>
        </Route>

        <Route element={<RequireAuth perfis={PERFIS_GESTAO} />}>
          <Route path="/" element={<Layout />}>
            <Route index         element={<Dashboard />}  />
            <Route path="entregas"   element={<Entregas />}   />
            <Route path="veiculos"   element={<Veiculos />}   />
            <Route path="motoristas" element={<Motoristas />} />
            <Route path="clientes"   element={<Clientes />} />
            <Route path="rotas"      element={<Rotas />}      />
            <Route path="atribuicoes" element={<Atribuicoes />} />
            <Route path="otimizacao-rotas" element={<OtimizacaoRotas />} />
            <Route path="pedidos" element={<Pedidos />} />
            <Route path="planos" element={<Planos />} />
            <Route path="planos/:id" element={<PlanoDetalhe />} />
            <Route path="relatorios" element={<Relatorios />} />
            <Route path="rotas-do-dia" element={<RotasDoDia />} />
            <Route path="ajuda" element={<Ajuda />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
