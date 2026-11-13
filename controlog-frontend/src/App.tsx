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

        {/* A ajuda é a única tela que todos os perfis abrem, e por isso é
            declarada UMA vez, antes dos blocos por perfil.
            Declará-la dentro dos dois blocos (como estava) não funciona: os
            dois registram `path="/"`, o React Router casa o primeiro, e um
            gestor em /ajuda caía no RequireAuth do bloco do motorista — que o
            rejeitava e o mandava para a tela inicial. No celular, com login de
            motorista, o mesmo caminho funcionava, porque ali o perfil era o
            esperado. */}
        <Route element={<RequireAuth perfis={[...PERFIS_GESTAO, 'MOTORISTA']} />}>
          <Route path="/" element={<Layout />}>
            <Route path="ajuda" element={<Ajuda />} />
          </Route>
        </Route>

        {/* Visão restrita do motorista — compartilha o Layout, mas é a única
            rota que o perfil MOTORISTA consegue abrir. */}
        <Route element={<RequireAuth perfis={['MOTORISTA']} />}>
          <Route path="/" element={<Layout />}>
            <Route path="minhas-rotas" element={<MinhasRotas />} />
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
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
