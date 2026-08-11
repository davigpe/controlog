// vitest-axe@0.1.0 não expõe corretamente os tipos do seu próprio matcher
// (ver src/test/setup.ts para o porquê). Declaramos a extensão nós mesmos,
// no padrão documentado pelo Vitest para matchers customizados.
import 'vitest';

interface CustomMatchers<R = unknown> {
  toHaveNoViolations(): R;
}

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- padrão oficial do Vitest para matchers customizados
  interface Assertion<T = unknown> extends CustomMatchers<T> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- padrão oficial do Vitest para matchers customizados
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
