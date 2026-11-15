import js from '@eslint/js';
import globals from 'globals';
import security from 'eslint-plugin-security';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['coverage', 'node_modules', 'prisma/migrations']),

  {
    files: ['**/*.js'],
    extends: [js.configs.recommended, security.configs.recommended],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      // `catch {}` sem parâmetro é intencional em vários pontos onde o erro não
      // acrescenta informação; o que não se tolera é variável declarada e
      // esquecida.
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      'no-return-await': 'error',

      // `require-await` ficou de fora de propósito. Ela acusa toda função
      // `async` sem `await`, e isso inclui dois usos corretos e frequentes
      // aqui: implementar uma interface que promete devolver promessa — como o
      // transporte de e-mail `registro`, que só escreve no log — e criar mock
      // de teste que devolve valor pronto. O que a regra tentava pegar,
      // promessa criada e não aguardada, precisa de informação de tipo
      // (`no-floating-promises`), indisponível em JavaScript puro.

      // `==` entre tipos diferentes já produziu o bug de `Boolean('false')`
      // nesta base. Comparação explícita, sempre.
      eqeqeq: ['error', 'always'],

      'no-console': 'off', // o log do servidor é a observabilidade que existe hoje
      'no-var': 'error',
      'prefer-const': 'error',

      // Desligada por ruído, não por discordância: a regra acusa qualquer
      // `objeto[chave]` com chave variável, e isso inclui todo acesso legítimo a
      // mapa — rótulo de status, tabela de transporte de e-mail, extensão por
      // MIME type. O risco real que ela mira, caminho de arquivo montado com
      // entrada do cliente, é tratado explicitamente em
      // `comprovante.service.js`, que valida o caminho resolvido antes de abrir
      // o arquivo, e coberto por teste.
      'security/detect-object-injection': 'off',

      // As demais regras do plugin sobem de aviso a erro. As quatro ocorrências
      // que existiam quando o lint entrou foram verificadas uma por uma e estão
      // dispensadas no próprio local, com a justificativa. Como erro, qualquer
      // ocorrência nova reprova o CI em vez de virar aviso que ninguém lê.
      'security/detect-non-literal-fs-filename': 'error',
      'security/detect-non-literal-regexp': 'error',
      'security/detect-child-process': 'error',
      'security/detect-unsafe-regex': 'error',
    },
  },

  {
    files: ['tests/**/*.js', '**/*.test.js'],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      // Teste existe para exercitar o caminho perigoso de propósito.
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-non-literal-regexp': 'off',
    },
  },

  {
    files: ['prisma/**/*.js'],
    rules: {
      // O seed lê e escreve arquivo de dados por caminho montado.
      'security/detect-non-literal-fs-filename': 'off',
    },
  },
]);
