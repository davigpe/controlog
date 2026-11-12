import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';
// vitest-axe@0.1.0's próprio "extend-expect" entrypoint está vazio, e seu
// matchers.d.ts declara "toHaveNoViolations" como type-only mesmo o JS
// exportando a função de verdade — por isso o @ts-expect-error abaixo em vez
// de um import comum (bug de empacotamento da versão 0.1.0; o tipo real da
// asserção vem de vitest-axe.d.ts, escrito à mão neste mesmo diretório).
// @ts-expect-error — ver comentário acima
import { toHaveNoViolations } from 'vitest-axe/matchers';

// @ts-expect-error — mesmo bug de tipos do import acima
expect.extend({ toHaveNoViolations });

afterEach(() => {
  cleanup();
});

// jsdom não implementa matchMedia — usado por next-themes/sonner e pelo
// useTelaGrande. Consultas de largura mínima respondem `true`: o jsdom não tem
// viewport de verdade, e os testes de layout foram escritos assumindo desktop.
// Um teste que precise do celular sobrescreve window.matchMedia localmente.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: query.includes('min-width'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// jsdom não implementa ResizeObserver — usado pelo Recharts (ResponsiveContainer) e Radix.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = window.ResizeObserver ?? ResizeObserverMock;

// jsdom não implementa scrollIntoView — usado pelo Radix Select.
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});

// jsdom não implementa a Pointer Capture API, e o Radix Select chama
// hasPointerCapture no primeiro clique do trigger — sem isso, qualquer teste
// que abra um Select estoura "target.hasPointerCapture is not a function".
Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
