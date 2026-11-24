# Guía de contribución

## Ramas
| Rama | Uso |
|---|---|
| `main` | Código liberado. Cada release lleva un tag `vX.Y.Z`. Protegida: solo se actualiza por PR. |
| `develop` | Integración. Aquí se juntan las funcionalidades terminadas. Protegida. |
| `feature/<tema>` | Funcionalidad nueva. Nace de `develop`, vuelve a `develop` por PR. |
| `fix/<tema>` | Corrección de error. Nace de `develop`. |
| `chore/<tema>` | Tareas de mantenimiento (docker, CI, dependencias). Nace de `develop`. |
| `release/X.Y.Z` | Preparación de una versión (subir versión, CHANGELOG). Nace de `develop`, va a `main`. |
| `hotfix/<tema>` | Error urgente en producción. Nace de `main`, va a `main` y luego se integra en `develop`. |

Nunca se hace push directo a `main` ni a `develop`.

## Commits (Conventional Commits)
`tipo(alcance opcional): descripción en minúsculas, sin punto final`

Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `build`.
Cambio incompatible: agregar `!` (`feat!: ...`) o un pie `BREAKING CHANGE:`.

## Pull requests
1. Abrir el PR hacia `develop` (o `main` si es release/hotfix) usando la plantilla.
2. El CI (`CI / build`) debe estar en verde.
3. Al menos una revisión de tu compañero/a antes de fusionar.
4. Fusionar con **Squash and merge** hacia `develop`, y con **Create a merge commit** hacia `main`.
5. Borrar la rama al fusionar.

## Versionado (SemVer: MAJOR.MINOR.PATCH)
- MAJOR: cambio incompatible (contrato de API, mensajes, configuración).
- MINOR: funcionalidad nueva compatible.
- PATCH: corrección compatible.
- En `develop` la versión es `X.Y.Z-SNAPSHOT`; en `main` y en los tags es `X.Y.Z`.

## Cómo liberar una versión
```bash
git switch develop && git pull
git switch -c release/1.0.0
# Java:    ./mvnw versions:set -DnewVersion=1.0.0 -DgenerateBackupPoms=false
# Angular: npm version 1.0.0 --no-git-tag-version
# CHANGELOG.md: renombrar "Unreleased" a "[1.0.0] - AAAA-MM-DD"
git commit -am "chore(release): 1.0.0"
git push -u origin release/1.0.0
# Abrir PR release/1.0.0 -> main; con CI en verde, fusionar (merge commit)
git switch main && git pull
git tag -a v1.0.0 -m "Release 1.0.0" && git push origin v1.0.0   # dispara el workflow Release
# Devolver los cambios a develop con la versión siguiente
git switch develop && git merge --no-ff main
# Java:    ./mvnw versions:set -DnewVersion=1.1.0-SNAPSHOT -DgenerateBackupPoms=false
git commit -am "chore: abre desarrollo 1.1.0-SNAPSHOT" && git push
```
