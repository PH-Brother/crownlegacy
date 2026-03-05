

## Diagnóstico

O erro **404** nos logs confirma o problema: a URL do modelo está como `gemini-2.0` (linha 29), que **não existe**. O nome correto é `gemini-2.0-flash`.

### Qual modelo ideal do Gemini para análise de faturas PDF e imagens?

| Modelo | Multimodal (PDF/Imagem) | Velocidade | Precisão | Recomendação |
|--------|------------------------|------------|----------|--------------|
| `gemini-2.0-flash` | Sim | Rápido | Boa | **Melhor custo-benefício** |
| `gemini-2.5-flash` | Sim | Rápido | Muito boa | Alternativa mais nova |
| `gemini-1.5-flash` | Sim | Rápido | Boa | Estável, funciona bem |
| `gemini-2.5-pro` | Sim | Lento | Excelente | Mais caro, melhor precisão |

**Recomendação: `gemini-2.0-flash`** -- suporta PDF e imagens nativamente, é rápido, e tem boa precisão para extração de dados estruturados.

## Correção

Apenas **1 linha** precisa mudar no arquivo `supabase/functions/gemini-proxy/index.ts`:

**Linha 29** -- trocar o modelo de `gemini-2.0` para `gemini-2.0-flash`:

```
// DE:
"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0:generateContent?key=" + key

// PARA:
"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + key
```

Depois, re-deploy da Edge Function. Nenhum outro arquivo será alterado.

