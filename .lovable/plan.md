

## Diagnóstico

O problema raiz: a Edge Function `gemini-proxy` **só aceita requests com `base64Data` + `mimeType`** (análise de documentos). Porém o frontend faz **3 tipos diferentes** de chamada:

1. **Análise de documentos** (upload PDF/imagem) -- envia `base64Data` + `mimeType` -- funciona
2. **Dicas de Sabedoria** (`handleConsultar`) -- envia `{ prompt: "..." }` -- retorna **400** porque não tem `base64Data`
3. **Análise financeira mensal** (`gerarAnaliseFinanceira`) -- envia `{ tipo: "analise_financeira", dados: {...} }` -- retorna **400**

O erro no screenshot ("Edge Function returned a non-2xx status code") confirma: a Edge Function rejeita qualquer request sem `base64Data`.

## Solução

Atualizar a Edge Function `gemini-proxy` para suportar os 3 tipos de request, fazendo branching no body:

### Edge Function (`supabase/functions/gemini-proxy/index.ts`)

Adicionar lógica de roteamento antes da validação de `base64Data`:

- Se `b.base64Data` + `b.mimeType` existe -> fluxo atual (análise de documento com `inline_data`)
- Se `b.prompt` existe -> chamada text-only ao Gemini com o prompt (conselho financeiro)
- Se `b.tipo === "analise_financeira"` -> gerar prompt de análise com os dados financeiros e chamar Gemini text-only
- Se `b.tipo === "reflexao_diaria"` -> gerar reflexão diária text-only

A estrutura ficará:

```text
req.json() -> body

if (body.base64Data && body.mimeType)
  -> Gemini com inline_data (documento) -> retorna { resultado: JSON }

else if (body.prompt)
  -> Gemini text-only (conselho) -> retorna { resultado: texto, text: texto }

else if (body.tipo === "analise_financeira")
  -> Gemini text-only com dados financeiros -> retorna { resultado: texto }

else if (body.tipo === "reflexao_diaria")
  -> Gemini text-only reflexão -> retorna { resultado: texto }

else -> 400 parametros ausentes
```

Cada branch monta o `contents` diferente e chama o mesmo endpoint `gemini-2.0-flash`. O retorno mantém o formato que o frontend espera (`resultado` e/ou `text`).

### Nenhuma alteração no frontend

O frontend já está correto -- o problema é exclusivamente na Edge Function que não aceita os outros formatos de body.

### Deploy

Após editar, re-deploy da Edge Function.

