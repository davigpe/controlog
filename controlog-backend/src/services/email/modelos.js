import { NOME_DO_PRODUTO } from '../../config/email.js';

/**
 * Conteúdo das mensagens.
 *
 * Separado dos transportes para poder ser testado sem AWS nenhuma, e porque o
 * texto é a parte que muda com mais frequência.
 */

/**
 * Escapa o que vai para dentro do HTML.
 *
 * O link carrega um token gerado por nós, então hoje não há conteúdo de
 * terceiro aqui — mas um modelo de e-mail é exatamente o lugar onde isso muda
 * sem ninguém notar (um nome de usuário no corpo, por exemplo), e aí o escape
 * precisa já estar no caminho.
 */
export function escaparHtml(valor) {
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function moldura(conteudo) {
  // HTML deliberadamente simples, com estilo em atributo: cliente de e-mail
  // não suporta folha de estilo externa de forma confiável, e vários removem
  // a tag <style>. Tabela e largura fixa pelo mesmo motivo.
  return `<!doctype html>
<html lang="pt-BR">
<body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
    <tr><td>
      <h1 style="margin:0 0 16px;font-size:20px;color:#1e40af;">${NOME_DO_PRODUTO}</h1>
      ${conteudo}
    </td></tr>
  </table>
</body>
</html>`;
}

export function modeloRedefinicaoDeSenha({ link, validadeMinutos }) {
  const linkSeguro = escaparHtml(link);
  const texto = [
    `Recebemos um pedido para redefinir a sua senha no ${NOME_DO_PRODUTO}.`,
    '',
    'Abra o endereço abaixo para escolher uma senha nova:',
    link,
    '',
    `O link vale por ${validadeMinutos} minutos e só pode ser usado uma vez.`,
    '',
    'Se não foi você quem pediu, ignore esta mensagem: sua senha continua a mesma.',
  ].join('\n');

  const html = moldura(`
      <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">
        Recebemos um pedido para redefinir a sua senha.
      </p>
      <p style="margin:0 0 24px;">
        <a href="${linkSeguro}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;font-size:15px;">
          Escolher nova senha
        </a>
      </p>
      <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#4b5563;">
        O link vale por ${validadeMinutos} minutos e só pode ser usado uma vez.
        Se o botão não funcionar, copie e cole este endereço no navegador:
      </p>
      <p style="margin:0 0 24px;font-size:12px;word-break:break-all;color:#4b5563;">${linkSeguro}</p>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#4b5563;">
        Se não foi você quem pediu, ignore esta mensagem: sua senha continua a mesma.
      </p>`);

  return {
    assunto: `Redefinição de senha — ${NOME_DO_PRODUTO}`,
    texto,
    html,
  };
}
