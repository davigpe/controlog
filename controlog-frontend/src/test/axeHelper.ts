import { configureAxe } from 'vitest-axe';

// color-contrast é desabilitado aqui porque o jsdom não faz layout/rendering
// real, então o cálculo de contraste não é confiável nesse ambiente — essa
// checagem já é feita à parte, com axe-core rodando num Chromium real
// (ver docs/AUDITORIA_ACESSIBILIDADE.md). Os testes aqui cobrem a parte
// estrutural: nomes acessíveis, labels de formulário, atributos ARIA válidos.
export const axe = configureAxe({
  rules: {
    'color-contrast': { enabled: false },
  },
});
