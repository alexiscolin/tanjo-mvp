# Configuration Linting et Pre-commit

Ce projet utilise ESLint avec TypeScript et Husky pour garantir la qualité du code.

## 🛠️ Outils Configurés

### ESLint
- **Configuration**: `eslint.config.mjs`
- **Parser**: TypeScript ESLint avec support des types
- **Plugins**: 
  - `typescript-eslint` - Règles TypeScript type-aware
  - `eslint-plugin-react-hooks` - Règles React Hooks
  - `eslint-plugin-import` - Ordre et gestion des imports
  - `eslint-plugin-unused-imports` - Suppression auto des imports non utilisés

### Husky + lint-staged
- **Pre-commit hook**: Vérifie automatiquement le code avant chaque commit
- **lint-staged**: Ne lint que les fichiers modifiés pour plus de rapidité

## 📋 Commandes Disponibles

```bash
# Linter tout le projet
pnpm lint

# Linter et corriger automatiquement les erreurs
pnpm lint:fix
```

## 🔄 Fonctionnement du Pre-commit Hook

Lorsque vous faites un `git commit`, Husky exécute automatiquement:

1. **Sauvegarde** de l'état actuel dans git stash
2. **ESLint --fix** sur les fichiers modifiés (corrections automatiques)
3. **ESLint** (vérification finale)
4. **Commit** si aucune erreur, sinon **blocage du commit**

### Exemple de workflow réussi

```bash
$ git commit -m "feat: add new feature"
[STARTED] Running tasks for staged files...
[STARTED] eslint --fix
[COMPLETED] eslint --fix
[STARTED] eslint
[COMPLETED] eslint
[COMPLETED] Running tasks for staged files...
[main abc1234] feat: add new feature
```

### Exemple de commit bloqué

```bash
$ git commit -m "feat: add buggy code"
[STARTED] Running tasks for staged files...
[STARTED] eslint --fix
[COMPLETED] eslint --fix
[STARTED] eslint
[FAILED] eslint

✖ 2 errors, 0 warnings

✖ lint-staged failed
```

## ⚙️ Configuration ESLint

### Règles Principales (Error - bloquent le commit)
- ✅ **Quotes**: Single quotes obligatoires (`'hello'` pas `"hello"`)
- ✅ **Semi**: Pas de point-virgule en fin de ligne
- ✅ **Indent**: 2 espaces d'indentation
- ✅ **Import order**: Ordre des imports strict (React → Next → autres packages → internes → relatifs)
- ✅ **Unused imports**: Auto-suppression des imports non utilisés
- ✅ **React Hooks rules**: Application stricte des règles des hooks
- ✅ **No trailing spaces**: Pas d'espaces en fin de ligne
- ✅ **Object curly spacing**: Espaces dans les objets `{ foo: bar }`

### Règles de Qualité (Warning - n'empêchent pas le commit)

#### Complexité
- ⚠️ **Complexity**: Max 15 de complexité cyclomatique
- ⚠️ **Max depth**: Max 4 niveaux d'imbrication
- ⚠️ **Max nested callbacks**: Max 3 callbacks imbriqués
- ⚠️ **Max params**: Max 5 paramètres par fonction
- ⚠️ **Max lines per function**: 150 lignes max par fonction
- ⚠️ **Max lines per file**: 600 lignes max par fichier

#### Naming Convention
- ⚠️ **Boolean variables**: Doivent commencer par `is`, `has`, `should`, `can`, `will`, `did`, `show`, `hide`, `enable`, `disable`
- ⚠️ **Boolean props**: Doivent commencer par `is`, `has`, `should`, etc.
- ⚠️ **Interfaces**: PascalCase
- ⚠️ **Type aliases**: PascalCase
- ⚠️ **Enums**: PascalCase

#### TypeScript
- ⚠️ **Prefer nullish coalescing**: Utiliser `??` au lieu de `||` (plus sûr avec 0, '', false)
- ⚠️ **Prefer optional chain**: Utiliser `?.` au lieu de `obj && obj.property`
- ⚠️ **Consistent type imports**: Utiliser `import type` pour les imports de types uniquement
- ⚠️ **No unnecessary type assertion**: Éviter les assertions de type inutiles
- ⚠️ **Prefer as const**: Préférer `as const` aux types littéraux
- ⚠️ **Consistent type definitions**: Utiliser `interface` plutôt que `type`
- ⚠️ **No explicit any**: Éviter `any`, utiliser des types précis

#### React
- ⚠️ **React Hooks exhaustive-deps**: Vérification des dépendances useEffect
- ⚠️ **No array index key**: Ne pas utiliser l'index comme key
- ⚠️ **Self-closing comp**: Composants auto-fermants quand possible

#### Autres
- ⚠️ **No console**: Seulement `console.warn` et `console.error` autorisés
- ⚠️ **Require await**: Fonctions async doivent avoir await
- ⚠️ **Prefer template**: Préférer les template literals
- ⚠️ **Warning comments**: Avertir sur TODO, FIXME, XXX, HACK

## 🎯 Avantages

1. **Code cohérent**: Tous les développeurs suivent les mêmes règles
2. **Erreurs détectées tôt**: Avant même le commit
3. **Auto-fix**: Corrections automatiques des erreurs simples (quotes, imports, spacing, etc.)
4. **Type-safe**: Détection des problèmes TypeScript dans ESLint
5. **Rapide**: Seuls les fichiers modifiés sont vérifiés (lint-staged)
6. **React best practices**: Règles spécifiques pour React et les hooks

## 🔧 Désactiver Temporairement

Si vous devez vraiment committer sans passer le pre-commit hook:

```bash
# À utiliser UNIQUEMENT en cas d'urgence
git commit --no-verify -m "message"
```

⚠️ **Non recommandé**: Cela contourne toutes les vérifications de qualité.

## 📝 Fichiers Exclus

Les fichiers de configuration (`.config.mjs`, `.config.js`) sont exclus du type-checking TypeScript car ils ne font pas partie du projet TypeScript principal (pas dans `tsconfig.json`).

## 🔍 Exemples de Règles

### ✅ Nullish Coalescing

```typescript
// ❌ Mauvais - utilise ||
const value = input || 'default' // problème si input = 0 ou ''

// ✅ Bon - utilise ??
const value = input ?? 'default' // fonctionne correctement avec 0 et ''
```

### ✅ Optional Chaining

```typescript
// ❌ Mauvais
const name = user && user.profile && user.profile.name

// ✅ Bon
const name = user?.profile?.name
```

### ✅ Type Imports

```typescript
// ❌ Mauvais
import { User, fetchUser } from './api'

// ✅ Bon
import type { User } from './api'
import { fetchUser } from './api'
```

### ✅ Boolean Naming

```typescript
// ❌ Mauvais
const loading = true
const visible = false

// ✅ Bon
const isLoading = true
const isVisible = false
```
