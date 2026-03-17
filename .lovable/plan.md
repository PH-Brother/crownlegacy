

## Plano: Atualizar ícones PWA e limpar assets

### Situação atual
- `src/assets/logo.png` — logo antigo ("Legacy Kingdom"), ainda usado em 4 arquivos (Dashboard, Index, ProtectedRoute, NotFound)
- `src/assets/logo-CL-Verde-dourado-Gold-claro.png` — logo oficial atual
- `public/images/` — só tem o logo grande, sem ícones otimizados para PWA
- Você enviou 10 ícones otimizados em vários tamanhos (16x16 até 180x180)

### O que será feito

**1. Copiar ícones enviados para o projeto**

Copiar para `public/images/icons/`:
- `icon-16x16.png`, `icon-32x32.png`, `icon-48x48.png`, `icon-72x72.png`
- `icon-96x96.png`, `icon-128x128.png`, `icon-144x144.png`
- `favicon-16x16.png`, `favicon-32x32.png`
- `apple-touch-icon.png`

**2. Excluir o logo antigo**

Remover `src/assets/logo.png` e atualizar os 4 arquivos que ainda o importam para usar o logo oficial:
- `src/pages/Dashboard.tsx`
- `src/pages/Index.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/pages/NotFound.tsx`

Em cada um, trocar:
```
import logo from "@/assets/logo.png"
```
por:
```
import logo from "@/assets/logo-CL-Verde-dourado-Gold-claro.png"
```

**3. Atualizar PWA manifest e HTML**

- `public/manifest.json` — adicionar todos os tamanhos de ícone
- `index.html` — adicionar favicons e apple-touch-icon com os novos caminhos

### Arquivos alterados
- 4 arquivos `.tsx` (troca de import)
- `public/manifest.json`
- `index.html`
- 10 novos ícones copiados para `public/images/icons/`
- `src/assets/logo.png` excluído

