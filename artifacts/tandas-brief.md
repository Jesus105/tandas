# Tandas — Brief de producto (detallado)

**Hackatón México 2026**  
Uso de la API de Pey para cobros CoDi.  
Versión: idea / brief. No es especificación de implementación.

---

## 1. Contexto

Una tanda es un esquema informal de ahorro rotativo: un grupo fijo aporta la misma cantidad con una frecuencia fija (semanal, quincenal o mensual). Cada periodo una persona distinta recibe el total de las aportaciones de los demás. El orden se acuerda de antemano.

Hoy la operación es manual:

- Efectivo en mano, o
- Transferencias SPEI sueltas + capturas por WhatsApp + una persona (el organizador) que revisa quién ya depositó y quién no.

El dinero casi siempre termina moviéndose por SPEI. El dolor no es el riel; es la coordinación y la conciliación.

CoDi (vía Pey) permite generar un cobro con monto, concepto y referencia, y recibir un webhook cuando el pago cae. Eso elimina la captura y el “aún no me llega”.

## 2. Problema

En grupos que ya se conocen (familia, compañeros de trabajo, amigos) la confianza no es el cuello de botella. Lo es la operación:

| Dolor | Cómo se vive hoy |
|-------|------------------|
| Saber quién pagó | El organizador revisa capturas o movimientos de su cuenta |
| Perseguir pendientes | Mensajes de “¿ya pagaste?” |
| Evitar errores de monto o cuenta | El participante teclea CLABE y monto a mano |
| Saber a quién le toca | Lista en WhatsApp, Excel o memoria |
| Cerrar la ronda | El organizador junta el dinero y lo manda por SPEI |

El organizador carga con el trabajo administrativo de toda la tanda.

## 3. Solución (en una frase)

Una app en la que el organizador configura la tanda una vez (frecuencia, monto, participantes y CLABEs) y después solo monitorea. Cada ronda el sistema genera los cobros CoDi **directo a la CLABE de la persona a la que le toca recibir**. El webhook marca quién ya pagó. El organizador no recibe ni reparte el dinero.

## 4. Principio de diseño crítico (reglas del hackathon)

Las reglas del Hackatón México prohíben **cobrar a favor de terceros / concentración de pagos**. La dispersión está permitida.

Por eso esta idea **no** funciona así:

- Todos pagan a la cuenta del organizador.
- El organizador junta el dinero.
- El organizador se lo manda al que le toca.

Eso es concentración.

Funciona así:

- Cada cobro de la ronda se genera con Pey apuntando a la CLABE del beneficiario de esa ronda (`bankAccountId`).
- El dinero va directo de cada participante al que recibe.
- El organizador solo configura y ve el estado.
- El beneficiario de la ronda no se cobra a sí mismo.

**Supuesto a validar con los organizadores:** que generar cobros a nombre del sistema/organizador pero con destino directo a la CLABE del beneficiario de la ronda no se considera “cobrar a favor de terceros” ni concentración. Si lo consideran restringido, la idea necesita autorización (legal@pey.mx) o se descarta.

## 5. Usuarios

### Organizador
Persona del grupo que hoy ya lleva el control. Quiere dejar de perseguir y de revisar capturas. Configura la tanda y consulta el tablero.

### Participante
Persona del grupo. Quiere pagar su aportación sin teclear CLABE ni mandar captura, y saber cuándo le toca recibir.

No hay usuario “plataforma” que concentre fondos.

## 6. Alcance del MVP

### Entra
- Crear una tanda.
- Definir frecuencia, monto, fecha de inicio y número de participantes.
- Registrar participantes (nombre, teléfono, CLABE).
- Definir o generar el orden de turnos.
- Por ronda: generar cobros CoDi (link o push) a la CLABE del beneficiario.
- Recibir webhook y marcar pagado / pendiente.
- Tablero del organizador: quién pagó, quién falta, a quién le toca, historial básico.
- El participante puede abrir un link de cobro y pagar.

### No entra
- API oficial de WhatsApp.
- Clientes no oficiales de WhatsApp (Baileys, whatsapp-web.js, etc.).
- El organizador recibiendo y redistribuyendo dinero.
- Scoring, garantías, penalizaciones automáticas o sistema de confianza.
- Varias tandas por organizador con lógica compleja.
- Subasta o cambio de turnos.
- App nativa pulida (puede ser web responsive).
- Onboarding bancario más allá de registrar CLABE en Pey.

## 7. Flujo principal

### 7.1 Configuración (organizador, una vez)

1. Crea la tanda: nombre, frecuencia (semanal / quincenal / mensual), monto por persona, fecha de primera ronda.
2. Agrega participantes: nombre, teléfono, CLABE.
3. El sistema registra cada CLABE en Pey (`POST /bank-account`) y muestra estado (pendiente / activa).  
   *Nota: la activación con Banxico puede tardar hasta 5 días hábiles.*
4. Define el orden de turnos (manual o aleatorio).
5. Confirma. La tanda queda lista.

### 7.2 Inicio de ronda (sistema)

1. Llega la fecha de la ronda (o el organizador la dispara manualmente en el MVP).
2. El sistema identifica al beneficiario de esa ronda.
3. Para cada uno de los demás participantes genera un cobro CoDi:
   - Monto = monto configurado.
   - Concepto = nombre de la tanda + número de ronda.
   - Destino = CLABE del beneficiario (`bankAccountId`).
   - Referencia / metadata = id de tanda + id de participante + número de ronda.
4. Entrega el cobro al participante como:
   - Link de pago, o
   - Push CoDi al teléfono (si se elige y el banco lo soporta), o
   - QR.
5. El beneficiario no recibe cobro.

### 7.3 Pago (participante)

1. Abre el link (o acepta el push / escanea el QR).
2. Paga desde su app de banco vía CoDi.
3. No manda captura.

### 7.4 Confirmación (sistema + organizador)

1. Pey manda webhook (`codi.qr.payment_received` o `codi.pn.payment_received`).
2. El sistema valida la firma, lee `numRef` / metadata y marca a ese participante como pagado en esa ronda.
3. El tablero del organizador se actualiza.
4. Cuando todos pagaron, la ronda se marca completa.

### 7.5 Siguiente ronda

Se repite el ciclo con el siguiente beneficiario del orden.

## 8. Pantallas (MVP)

### Organizador

1. **Inicio / Mis tandas**  
   Lista de tandas. Estado de la ronda actual.

2. **Crear tanda**  
   Nombre, frecuencia, monto, fecha de inicio.

3. **Participantes**  
   Alta de nombre, teléfono, CLABE. Estado de registro en Pey (pendiente / activa).

4. **Orden de turnos**  
   Lista ordenable. Quién recibe en la ronda 1, 2, 3…

5. **Tablero de ronda**  
   - Beneficiario actual.  
   - Lista de participantes con estado: Pagado / Pendiente / No aplica (el beneficiario).  
   - Botón para copiar / ver el link de cobro de cada pendiente.  
   - Progreso (ej. 14/19).

6. **Historial**  
   Rondas anteriores: beneficiario, fecha, quién pagó.

### Participante (mínimo)

1. **Link de cobro**  
   Página simple (o la de Pey) con monto, concepto y forma de pagar (QR / CoDi).  
   No requiere cuenta en la app para el MVP.

2. *(Opcional)* **Mi tanda**  
   Si entra con un código o link personal: ve si ya pagó esta ronda y cuándo le toca recibir.

## 9. Modelo de datos (alto nivel)

- **Tanda**: id, nombre, frecuencia, monto, fecha_inicio, estado, orden de turnos.
- **Participante**: id, tanda_id, nombre, teléfono, CLABE, pey_bank_account_id, estado_pey.
- **Ronda**: id, tanda_id, número, beneficiario_id, fecha, estado (abierta / completa).
- **Cobro**: id, ronda_id, participante_id (el que debe pagar), pey_charge_id, tipo (qr / pn / link), estado (pendiente / pagado), fecha_pago, transaction_id.

El webhook se amarra al cobro vía `numRef` o metadata.

## 10. Uso concreto de Pey

| Necesidad | Cómo se cubre |
|-----------|----------------|
| Registrar la CLABE del beneficiario | `POST /bank-account` |
| Saber cuándo la CLABE está lista | Estado de la cuenta / webhook de cuenta |
| Generar el cobro de la ronda | `POST /codi/qr`, `POST /codi/pn` o payment link |
| Que el dinero caiga en la persona correcta | `bankAccountId` del beneficiario de la ronda |
| Saber que alguien pagó sin captura | Webhook de pago recibido |
| No mezclar pagos de distintas personas/rondas | `numRef` + metadata (tanda, ronda, participante) |

Limitaciones de Pey que el producto debe asumir:

- No hay suscripción o cobro recurrente nativo. La app dispara la generación de cobros según el calendario.
- Activación de CLABE puede tardar días.
- El push CoDi solo llega si el número está enrolado en CoDi en el banco del participante.
- Una API key tiene un solo webhook.

## 11. Cómo se entera el participante (sin WhatsApp API)

Para el MVP no se integra mensajería:

- El organizador copia el link de cobro y lo manda por el canal que el grupo ya usa (WhatsApp personal, Telegram, etc.).
- O el participante abre un link corto / página de la tanda.
- Opcional: push CoDi al teléfono vía Pey.

La confirmación no depende del canal: llega por webhook.

## 12. Casos borde (MVP)

| Caso | Comportamiento esperado |
|------|-------------------------|
| Alguien no paga | Queda en pendiente. El organizador lo ve. No hay cobro automático de mora en el MVP. |
| Paga de más o de menos | El webhook trae el monto. Si no coincide, se marca para revisión (no se auto-concilia). |
| CLABE aún no activa | No se puede generar cobro a esa persona como beneficiaria hasta que Pey la marque activa. |
| Beneficiario de la ronda | No se le genera cobro. |
| Participante se sale | Fuera de alcance del MVP (se maneja manual). |
| Webhook duplicado | Idempotencia por `transactionId` o id de webhook. |
| Organizador quiere recibir él | No es el flujo. Si se permite, hay que revalidar contra las reglas. |

## 13. Demo para el hackathon

Flujo mínimo demostrable en video (máx. 3 min, según reglas):

1. Organizador crea tanda de prueba (2–3 personas, monto pequeño).
2. Se muestran las CLABEs registradas (o una de prueba de Pey).
3. Se dispara la ronda: se genera un cobro CoDi real vía API.
4. Alguien paga (monto pequeño, ej. $0.01 o $1).
5. Llega el webhook y el tablero cambia a “Pagado”.
6. Se muestra que el cobro iba dirigido a la CLABE del beneficiario, no a una cuenta concentradora.

Eso cumple el requisito de integración funcional: generar Mensaje de Cobro CoDi y reaccionar al resultado.

## 14. Supuestos explícitos

1. Los participantes se conocen y aceptan el orden. No se construye confianza.
2. Cada participante puede pagar con CoDi desde su app de banco.
3. El sistema (o el organizador) opera con API key de Pey y puede registrar CLABEs y generar cobros a ellas.
4. Registrar CLABE tarda hasta 5 días hábiles; el MVP debe contemplar estado “pendiente”.
5. La variante “cobro directo al beneficiario de la ronda” se considera compatible con las reglas, o se obtiene confirmación / autorización de Pey antes de construir.
6. No se usa WhatsApp API (oficial ni no oficial) en el MVP.
7. El trabajo de integración con Pey y la lógica de tandas se construye durante el periodo del hackathon.

## 15. Riesgos

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Las reglas interpretan esto como cobro a favor de terceros | Alto (descalificación) | Validar por escrito con legal@pey.mx antes de invertir. Diseñar siempre destino directo. |
| CLABEs tardan en activarse | Medio | Usar cuenta de prueba de Pey para la demo. Mostrar estado en UI. |
| Push CoDi no llega a todos los bancos/números | Medio | Ofrecer link/QR como camino principal. |
| Muchos equipos hacen “terminal QR” | Bajo para esta idea | El diferenciador es la operación de tanda + conciliación automática, no el QR en sí. |
| Complejidad de multi-cuenta bajo una API key | Medio | Confirmar en docs/pruebas que se puede pasar `bankAccountId` distinto por cobro. |

## 16. Criterio de éxito del MVP

El organizador puede:

1. Configurar una tanda (frecuencia, monto, participantes, CLABEs, orden).
2. Disparar una ronda y obtener cobros CoDi generados por Pey.
3. Ver en un tablero quién pagó y quién falta, actualizado por webhook, sin capturas.

El participante puede:

1. Pagar su aportación de la ronda mediante el cobro generado.
2. No tener que mandar comprobante.

Y se puede demostrar en video el flujo completo de cobro CoDi + reacción al webhook.

## 17. Qué hace que no sea “otro generador de QR”

- El objeto principal no es el cobro; es la **ronda de la tanda**.
- El cobro se genera en lote, con destino rotativo, y se concilia solo.
- El usuario que obtiene valor inmediato es el organizador (deja de perseguir y de cuadrar).
- El dinero no se concentra: cada ronda el destino cambia según el turno.

## 18. Preguntas abiertas

1. ¿Pey / el jurado consideran aceptable generar cobros cuya CLABE destino es la de otro participante de la tanda?
2. ¿Una sola API key puede registrar y usar múltiples `bankAccountId` de personas distintas sin problema operativo?
3. ¿Para el MVP el participante necesita cuenta, o basta con el link de cobro?
4. ¿La ronda se dispara sola por fecha o solo manual en el MVP?
5. ¿Se muestra al beneficiario un resumen de quién ya le pagó, o solo lo ve el organizador?
