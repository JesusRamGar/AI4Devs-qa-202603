# Prompts E2E Tests — Interfaz Position

## Contexto técnico del proyecto

| Elemento | Detalle |
|---|---|
| Frontend | React 18.3.1 + TypeScript · `frontend/` · puerto 3000 |
| Backend | Express.js + Prisma + PostgreSQL · `backend/` · puerto 3010 |
| E2E Framework | Playwright v1.61.0 · tests en `frontend/tests/` |
| Drag & Drop | react-beautiful-dnd v13.1.1 |
| Endpoint fase | `PUT /candidates/:id` · body: `{applicationId: number, currentInterviewStep: number}` |
| Componentes clave | `PositionDetails.js`, `StageColumn.js`, `CandidateCard.js` |

> **Nota:** El enunciado indica `PUT /candidate/:id` pero el código real usa `PUT /candidates/:id` (plural). Los prompts usan la ruta correcta del código.

---

## Plan de ejecución

### Paso 1 — Configurar Playwright
**Rol:** QA Engineer  
**Objetivo:** Habilitar `baseURL` en `playwright.config.ts` para que las pruebas usen rutas relativas

### Paso 2 — Escenario 1: Carga de página Position
**Rol:** QA Engineer  
**Objetivo:** Validar que título, columnas de fases y tarjetas de candidatos cargan correctamente, usando mocks de API para independencia del backend

### Paso 3 — Escenario 2: Cambio de fase de candidato
**Rol:** QA Engineer Senior  
**Objetivo:** Validar drag & drop con verificación de la petición `PUT /candidates/:id` mediante intercepción de red en Playwright

---

## Prompts

---

### PROMPT 1 — Configurar Playwright para pruebas locales

**Rol:** QA Engineer  
**Objetivo:** Configurar `playwright.config.ts` con `baseURL` para que las pruebas naveguen con rutas relativas

```
Modifica el fichero `frontend/playwright.config.ts` para habilitar las pruebas E2E en entorno local.

Contexto del proyecto:
- Frontend React corre en http://localhost:3000
- Los tests están en `frontend/tests/`
- Playwright v1.61.0 ya está instalado como devDependency

Cambios requeridos:
1. Descomenta y establece `baseURL: 'http://localhost:3000'` dentro de `use: {}`
2. Mantén el resto de la configuración existente (fullyParallel, retries, workers, reporter, trace)
3. No habilites `webServer` — el servidor se lanzará manualmente antes de los tests
4. Deja los proyectos de Firefox y WebKit comentados; activa solo Chromium para esta fase

No añadas dependencias nuevas ni cambies la estructura de carpetas.
```

**Respuesta — Ficheros modificados:**

- [frontend/playwright.config.ts](../frontend/playwright.config.ts) — `baseURL` habilitado, solo Chromium activo
- [frontend/tsconfig.playwright.json](../frontend/tsconfig.playwright.json) — tsconfig dedicado para Playwright con tipos de Node (resuelve error TS2591 de `process`)

**Estado:** ✅ Completado · `npx tsc --project tsconfig.playwright.json --noEmit` sin errores

---

### PROMPT 2 — Escenario 1: Carga de la página Position

**Rol:** QA Engineer  
**Objetivo:** Verificar que título de posición, columnas de fases y tarjetas de candidatos cargan correctamente

```
Crea el fichero `frontend/tests/e2e/position-page.spec.ts` con una prueba E2E en Playwright que
valide la carga correcta de la página de detalle de una posición.

Contexto técnico:
- Ruta de la página: /positions/:id (ejemplo: /positions/1)
- Al cargar, el componente PositionDetails.js hace dos llamadas fetch:
    1. GET http://localhost:3010/positions/:id/interviewFlow
       Respuesta esperada: { interviewFlow: { positionName: string, interviewFlow: { interviewSteps: Array<{ id, name, orderIndex }> } } }
    2. GET http://localhost:3010/positions/:id/candidates
       Respuesta esperada: Array<{ candidateId, fullName, currentInterviewStep (nombre de la fase), applicationId, averageScore }>
- El título de la posición se renderiza en un <h2 class="text-center mb-4">
- Cada fase se renderiza como una columna con Card.Header (Bootstrap) mostrando stage.title
- Cada candidato se renderiza como una Card dentro de la columna correspondiente, mostrando candidate.name

Instrucciones:
1. Usa page.route() para interceptar y mockear AMBAS llamadas de API antes de navegar.
   Mock de interviewFlow: posición "Senior Backend Developer" con 4 fases:
     - { id: 1, name: "CV Review", orderIndex: 1 }
     - { id: 2, name: "Phone Screen", orderIndex: 2 }
     - { id: 3, name: "Technical Interview", orderIndex: 3 }
     - { id: 4, name: "Offer", orderIndex: 4 }
   Mock de candidates: 3 candidatos distribuidos:
     - { candidateId: 1, fullName: "Alice Johnson", currentInterviewStep: "CV Review", applicationId: 101, averageScore: 3 }
     - { candidateId: 2, fullName: "Bob Smith", currentInterviewStep: "Technical Interview", applicationId: 102, averageScore: 4 }
     - { candidateId: 3, fullName: "Carol White", currentInterviewStep: "CV Review", applicationId: 103, averageScore: 2 }

2. Navega a /positions/1

3. Escribe tres bloques test independientes dentro de test.describe('Position page load'):

   Test 1 — "shows position title":
   - Espera a que el h2 sea visible
   - Verifica que contiene el texto "Senior Backend Developer"

   Test 2 — "shows all hiring phase columns":
   - Espera a que las columnas carguen
   - Verifica que existen exactamente 4 columnas (Card.Header)
   - Verifica que cada columna muestra el nombre correcto de la fase

   Test 3 — "shows candidate cards in correct columns":
   - Espera a que las tarjetas carguen
   - Verifica que "Alice Johnson" y "Carol White" están en la columna "CV Review"
   - Verifica que "Bob Smith" está en la columna "Technical Interview"
   - Verifica que la columna "Phone Screen" no contiene tarjetas

4. Usa selectores robustos basados en texto visible y roles ARIA cuando sea posible.
   Para columnas: getByRole('heading') o localizar el Card.Header por texto.
   Para tarjetas de candidatos: localizar Card.Title por texto del nombre.

5. Añade beforeEach con la configuración de mocks y la navegación para evitar repetición.

No uses data-testid artificiales — los selectores deben funcionar con el HTML existente
generado por Bootstrap y react-beautiful-dnd.
```

**Respuesta — Ficheros creados:**

- [frontend/tests/e2e/position-page.spec.ts](../frontend/tests/e2e/position-page.spec.ts) — 3 tests con mocks de API vía `page.route()`

**Decisiones de implementación:**
- Selectores: `.card-header` para columnas, `.card-title` para candidatos, `.card.mb-4` como contenedor de columna
- `beforeEach` comparte mocks y navegación entre los 3 tests
- Wait explícito en Test 3 sobre `Alice Johnson` garantiza que ambos fetches han resuelto antes de las aserciones

**Estado:** ✅ Completado · `3 passed` en `npx playwright test tests/e2e/position-page.spec.ts`

---

### PROMPT 3 — Escenario 2: Cambio de fase de candidato

**Rol:** QA Engineer Senior  
**Objetivo:** Simular drag & drop de candidato entre columnas y verificar la petición PUT al backend

```
Crea el fichero `frontend/tests/e2e/candidate-stage-change.spec.ts` con una prueba E2E en Playwright
que valide el movimiento de un candidato de una fase a otra mediante drag & drop.

Contexto técnico:
- Librería de drag & drop: react-beautiful-dnd v13.1.1
- Al soltar un candidato en una nueva columna, se llama:
    PUT http://localhost:3010/candidates/:candidateId
    Headers: Content-Type: application/json
    Body: { applicationId: number, currentInterviewStep: number }
    Donde currentInterviewStep es el ID de la fase destino (número entero de la DB, no el nombre)
- react-beautiful-dnd NO responde bien a page.dragAndDrop() estándar de Playwright.
  Debes simular el drag con eventos de ratón de bajo nivel.

Instrucciones:

1. Configura los mismos mocks de interviewFlow y candidates del Escenario 1 con page.route().

2. Intercepta la llamada PUT /candidates/:id usando page.route():
   - Captura el cuerpo de la petición (request body)
   - Responde con status 200 y body: { message: "Candidate stage updated successfully" }
   - Guarda los datos capturados para las aserciones: candidateId, applicationId, currentInterviewStep

3. Navega a /positions/1 y espera a que las columnas y tarjetas carguen completamente.

4. Implementa la función helper simulateDrag(page, sourceLocator, targetLocator):
   - Obtén el boundingBox() del elemento origen
   - Obtén el boundingBox() del elemento destino
   - Ejecuta la secuencia de eventos del ratón:
       a. page.mouse.move(sourceCenter.x, sourceCenter.y)
       b. page.mouse.down()
       c. Mueve el ratón gradualmente en pequeños pasos hacia el destino (al menos 5 pasos intermedios)
          para que react-beautiful-dnd detecte el inicio del drag
       d. page.mouse.move(targetCenter.x, targetCenter.y)
       e. Espera 100ms
       f. page.mouse.up()

5. Escribe el test "moves candidate from CV Review to Phone Screen":
   a. Localiza la tarjeta de "Alice Johnson" en la columna "CV Review"
   b. Localiza la columna "Phone Screen" como destino
   c. Ejecuta simulateDrag con ambos elementos
   d. Espera a que la petición PUT sea interceptada (usa Promise que resuelva cuando page.route capture la petición)

6. Aserciones requeridas tras el drag:
   a. La tarjeta de "Alice Johnson" ya NO es visible en la columna "CV Review"
   b. La tarjeta de "Alice Johnson" ES visible en la columna "Phone Screen"
   c. Se disparó exactamente una petición PUT a /candidates/1
   d. El candidateId en la URL coincide con el id de Alice Johnson (candidateId: 1)
   e. El body de la petición contiene applicationId: 101
   f. El body de la petición contiene currentInterviewStep: 2 (id de la fase "Phone Screen")
   g. La respuesta del backend fue exitosa (status 200)

7. Estructura el test dentro de test.describe('Candidate stage change').

Consideraciones importantes:
- Usa page.waitForResponse() o una Promise con page.route() para capturar la petición antes de hacer aserciones sobre ella.
- Si el drag falla por timing, aumenta los pasos intermedios o añade pequeñas esperas entre eventos de ratón.
- Los selectores de columnas deben ser lo suficientemente específicos para no confundir columnas con el mismo candidato.
  Usa un locator que combine la columna (por su título) con la tarjeta (por el nombre del candidato):
  page.locator('.card').filter({ hasText: 'CV Review' }).locator('.card-title', { hasText: 'Alice Johnson' })
```

**Respuesta — Ficheros creados:**

- [frontend/tests/e2e/candidate-stage-change.spec.ts](../frontend/tests/e2e/candidate-stage-change.spec.ts) — 1 test con drag simulation y verificación de API

**Decisiones de implementación:**
- `simulateDrag`: 10 pasos intermedios con 20ms delay cada uno — threshold suficiente para que react-beautiful-dnd detecte el drag
- `page.waitForResponse()` configurado ANTES del drag para capturar la respuesta sin race condition
- `capturedCandidateId` y `capturedBody` capturados desde el handler de `page.route()` para acceso en aserciones
- Selectores: `.card.mb-2` identifica tarjetas de candidato (vs `.card.mb-4` para columnas)

**Estado:** ✅ Completado · `1 passed` en `npx playwright test tests/e2e/candidate-stage-change.spec.ts`

---

## PROMPT 4 — Verificación de cobertura de requisitos

**Rol:** QA Lead  
**Objetivo:** Validar que los tests implementados cubren todos los requisitos del enunciado original

```
Verifica que los tests E2E en `frontend/tests/e2e/` cubren los siguientes requisitos:

Escenario 1 — Carga de la página Position:
  R1. El título de la posición se muestra correctamente.
  R2. Se muestran las columnas correspondientes a cada fase del proceso de contratación.
  R3. Las tarjetas de los candidatos se muestran en la columna correcta según su fase actual.

Escenario 2 — Cambio de fase de un candidato:
  R4. Se puede arrastrar una tarjeta de candidato desde una columna hacia otra.
  R5. La tarjeta del candidato aparece visualmente en la nueva columna tras el movimiento.
  R6. Se dispara una petición PUT al mover el candidato.
  R7. El id del candidato en la URL corresponde al candidato movido.
  R8. El body de la petición contiene la nueva fase.
  R9. La respuesta del backend es exitosa (status 200).

Para cada requisito indica: fichero, nombre del test, línea(s) donde se verifica, y si está cubierto o no.
```

**Respuesta — Matriz de cobertura:**

| Req | Descripción | Fichero | Test | Línea(s) | Estado |
|---|---|---|---|---|---|
| R1 | Título de posición visible y correcto | `position-page.spec.ts` | `shows position title` | 40-43 | ✅ |
| R2 | Columnas de cada fase presentes | `position-page.spec.ts` | `shows all hiring phase columns` | 45-52 | ✅ |
| R3 | Tarjetas en columna correcta | `position-page.spec.ts` | `shows candidate cards in correct columns` | 54-77 | ✅ |
| R4 | Drag de tarjeta entre columnas | `candidate-stage-change.spec.ts` | `moves candidate from CV Review to Phone Screen` | 100 (`simulateDrag`) | ✅ |
| R5 | Tarjeta visible en nueva columna | `candidate-stage-change.spec.ts` | `moves candidate from CV Review to Phone Screen` | 113 | ✅ |
| R6 | Petición PUT disparada | `candidate-stage-change.spec.ts` | `moves candidate from CV Review to Phone Screen` | 96-102 | ✅ |
| R7 | ID candidato correcto en URL | `candidate-stage-change.spec.ts` | `moves candidate from CV Review to Phone Screen` | 105 | ✅ |
| R8 | Body contiene nueva fase | `candidate-stage-change.spec.ts` | `moves candidate from CV Review to Phone Screen` | 108 | ✅ |
| R9 | Respuesta backend exitosa (200) | `candidate-stage-change.spec.ts` | `moves candidate from CV Review to Phone Screen` | 109 | ✅ |

**Notas de la verificación:**

- R8: el body envía `currentInterviewStep: 2` — el ID numérico de la fase "Phone Screen" en base de datos, que es la representación correcta que espera el backend (`PUT /candidates/:id` body: `{applicationId, currentInterviewStep: number}`).
- El enunciado menciona `PUT /candidate/:id` (singular) pero el endpoint real es `PUT /candidates/:id` (plural). Los tests usan la ruta correcta del código.
- Cobertura total: **9/9 requisitos cubiertos** · **4 tests** · **2 ficheros**

**Estado:** ✅ Verificación completada · `4 passed` confirmado en ejecución

---

## Ejecución visual de los tests

> **Prerequisito:** servidor React corriendo en `http://localhost:3000`
> ```powershell
> cd C:\Users\jesus.ramos\AI4Devs\AI4Devs-qa-202603\frontend && npm start
> ```
> Espera a ver `Compiled successfully!` antes de lanzar los tests.

---

### Opción 1 — Headed (navegador visible en tiempo real)

Abre Chrome, ejecuta los tests y lo cierra al terminar. Útil para ver el flujo completo de un vistazo.

```powershell
cd C:\Users\jesus.ramos\AI4Devs\AI4Devs-qa-202603\frontend
npx playwright test tests/e2e/ --headed
```

---

### Opción 2 — UI Mode (interfaz interactiva)

Abre la interfaz visual de Playwright. Permite reruns individuales, inspeccionar cada paso, ver screenshots, timeline y network calls por test.

```powershell
cd C:\Users\jesus.ramos\AI4Devs\AI4Devs-qa-202603\frontend
npx playwright test tests/e2e/ --ui
```

| Característica | Headed | UI Mode |
|---|---|---|
| Ver navegador en ejecución | ✅ | ✅ |
| Pausar / step-by-step | ❌ | ✅ |
| Reruns de test individual | ❌ | ✅ |
| Inspeccionar network calls | ❌ | ✅ |
| Screenshots por paso | ❌ | ✅ |
| Uso recomendado | Validación rápida | Debug y exploración |

---
