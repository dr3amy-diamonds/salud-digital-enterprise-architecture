# SaludDigital Enterprise Architecture

![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white&labelColor=111827)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white&labelColor=111827)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black&labelColor=111827)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white&labelColor=111827)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white&labelColor=111827)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?logo=tailwindcss&logoColor=white&labelColor=111827)

## 1. Encabezado y visión general

SaludDigital es una plataforma enterprise de gestión clínica y administrativa para una clínica privada ficticia. Integra los dominios de admisión, historia clínica, laboratorio, farmacia, facturación y analítica gerencial bajo una arquitectura por dominios con separación clara de responsabilidades.

El sistema expone una API REST protegida con JWT y control de acceso basado en roles (RBAC). El frontend ajusta la experiencia según el rol autenticado, mientras PostgreSQL aplica el principio de mínimo privilegio para el usuario de analítica. El backend es la autoridad final de permisos; la interfaz solo adapta la experiencia por conveniencia.

Roles soportados: paciente, médico, bacteriólogo, farmacéutico, cajero, gerencia y administrador. El proyecto es académico: no está diseñado para producción ni para almacenar datos clínicos reales.

## 2. Arquitectura de software y módulos (RBAC)

### Dominios y módulos

| Esquema / módulo | Responsabilidad |
| --- | --- |
| `admision` | Maestro de pacientes, citas, usuarios y solicitudes de acceso institucional |
| `clinico` | Historias clínicas y atención médica |
| `lab` | Órdenes de laboratorio y resultados estructurados en JSONB |
| `farmacia` | Recetas electrónicas y estado de dispensación |
| `facturacion` | Facturas por concepto y vista agregada para analítica |

### Roles y alcance operativo

| Rol | Módulo principal | Alcance operativo |
| --- | --- | --- |
| Paciente | Portal del paciente | Autoregistro directo, agendamiento, reprogramación y cancelación de citas propias, consulta de exámenes procesados |
| Médico | Estación clínica | Historias clínicas, recetas electrónicas y órdenes de laboratorio |
| Bacteriólogo | Módulo de laboratorio | Procesamiento de muestras y carga de resultados |
| Farmacéutico | Módulo de farmacia | Dispensación de medicamentos y control de stock |
| Cajero | Módulo de facturación | Facturación por concepto (atención, laboratorio, medicamentos) y recaudos |
| Gerencia | Tablero de control | KPI operativos y financieros |
| Administrador | Gestión de usuarios | Gestión de usuarios y aprobaciones de cuentas institucionales |

### Matriz de permisos por rol

`R` = lectura, `W` = escritura, `—` = sin acceso. El backend valida cada permiso en el servidor.

| Módulo | medico | bacteriologo | farmaceutico | cajero | gerencia | admin | paciente |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Admisión — pacientes | R/W | R | R | R/W | R | R/W | — |
| Admisión — citas | R/W | R | R | R/W | R | R/W | R/W (solo propias) |
| Historia clínica | R/W | — | — | — | — | — | — |
| Laboratorio — órdenes | R/W | R/W | — | — | R | R/W | — |
| Laboratorio — resultados | R | R/W | — | — | — | R/W | R (solo propios procesados) |
| Farmacia — recetas | R/W | — | R/W | — | R | R/W | — |
| Facturación | — | — | — | R/W | R | R/W | — |
| Usuarios y cuentas | — | — | — | — | — | R/W | — |

Reglas operativas relevantes:

- El rol `paciente` solo puede agendar, cancelar o reprogramar citas propias. El estado inicial siempre se fuerza a `Agendada`.
- Toda cita debe tener una fecha estrictamente futura; el servidor responde `400 Bad Request` si la fecha ya pasó.
- Los módulos de solo lectura ocultan formularios de escritura y muestran la insignia **Vista de Solo Lectura**.
- `gerencia` no accede a historia clínica ni a resultados de laboratorio.
- Un paciente solo puede gestionar citas vinculadas a su expediente (`paciente_id` del JWT).

### Autenticación y acceso

- Login en `POST /auth/login` con credenciales de usuario y contraseña.
- El JWT usa HS256 y expira a los 60 minutos. Incluye `sub` (usuario), `role` y `paciente_id`.
- Contraseñas almacenadas con bcrypt.
- El paciente puede autoregistrarse en `POST /auth/registro-paciente`.
- El personal institucional solicita acceso en `POST /auth/solicitudes`; el administrador crea y aprueba cuentas.
- Cambio de contraseña en `POST /auth/cambiar-password`.

## 3. Guía de instalación y despliegue con Docker

### Requisitos previos

- Docker Desktop en ejecución.
- Archivo `.env` en la raíz del proyecto.
- Puerto `5173`, `8000` y `5433` disponibles.

Si no existe `.env`, créalo a partir de la plantilla:

```powershell
Copy-Item .env.example .env
```

### Levantar el entorno

```bash
docker compose up -d --build
```

Verifica el estado de los servicios:

```bash
docker compose ps
```

Servicios disponibles:

| Servicio | URL |
| --- | --- |
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Documentación Swagger | http://localhost:8000/docs |
| PostgreSQL | localhost:5433 |

### Detener la plataforma

```bash
docker compose down
```

### Mantenimiento y reinicio completo de la base de datos

`database/init.sql` solo se ejecuta al crear el volumen por primera vez. Si modificas el script y necesitas reaplicarlo, elimina el volumen. Esta operación borra todos los datos existentes y no se puede deshacer:

```bash
docker compose down -v
docker compose up -d --build
```

Los contenedores de backend y frontend no montan código fuente. Rebuild después de cada cambio de código; reiniciar solo no despliega los cambios.

### Verificación de calidad local

Frontend, desde `frontend/`:

```bash
npm install
npm run lint
npm run build
```

Backend, desde `backend/`:

```powershell
..\.venv\Scripts\python.exe -m py_compile app\api\endpoints\admision.py app\schemas.py
```

## 4. Credenciales de prueba (tabla de usuarios)

Todas las cuentas precreadas usan la misma contraseña: `Salud2026*`.

| Usuario | Rol | Descripción |
| --- | --- | --- |
| `admin` | admin | Superusuario técnico y gestión de cuentas |
| `drmartinez` | medico | Atención clínica, órdenes y recetas |
| `lab1` | bacteriologo | Procesamiento de resultados de laboratorio |
| `farmacia1` | farmaceutico | Registro y dispensación de recetas |
| `cajero1` | cajero | Facturación y admisión |
| `gerencia1` | gerencia | Consulta gerencial y tablero de indicadores |
| `paciente1` | paciente | Portal del paciente (Laura Sofía Valencia) |

Recomendación: cambiar la contraseña del usuario `admin` después del primer inicio de sesión mediante `POST /auth/cambiar-password`.

## 5. Persistencia de datos y conexión Power BI

### Esquemas PostgreSQL

| Esquema | Tablas / objetos | Descripción |
| --- | --- | --- |
| `admision` | `pacientes`, `citas`, `usuarios`, `solicitudes_acceso` | Maestro operativo, citas y usuarios del sistema |
| `clinico` | `historias` | Historias clínicas y atenciones médicas |
| `lab` | `ordenes`, `resultados` | Órdenes de laboratorio y resultados JSONB |
| `farmacia` | `recetas` | Recetas electrónicas y estado de dispensación |
| `facturacion` | `facturas`, `v_facturacion_diaria` | Facturas base y vista agregada para BI |

### Modelo de datos principal

- `admision.pacientes`: identidad del paciente, documento único y fecha de registro.
- `admision.citas`: paciente, fecha, especialidad y estado (`Agendada`, `Cancelada`, etc.).
- `admision.usuarios`: credenciales por rol, estado activo y vinculación opcional a `paciente_id`.
- `admision.solicitudes_acceso`: solicitudes institucionales con estado `Pendiente`, `Aprobada` o `Rechazada`.
- `clinico.historias`: motivo, diagnóstico, médico y vínculo opcional a cita.
- `lab.ordenes`: paciente, atención opcional, tipo de examen y estado.
- `lab.resultados`: orden única, detalle en JSONB, fecha y bacteriólogo.
- `farmacia.recetas`: paciente, atención opcional, medicamento, dosis y estado.
- `facturacion.facturas`: paciente, concepto (`Atención médica`, `Laboratorio` o `Medicamentos`), total y estado de pago.
- `facturacion.v_facturacion_diaria`: vista agregada con `dia`, `cantidad_facturas` y `total_recaudado`.

### Conexión Power BI

Conecta Power BI Desktop mediante el conector PostgreSQL con estos parámetros:

| Parámetro | Valor |
| --- | --- |
| Host | `localhost` |
| Puerto | `5433` |
| Base de datos | `salud_db` |
| Usuario | `bi_readonly` |
| Contraseña | `solo_lectura` |
| Esquema principal | `facturacion` |
| Vista | `facturacion.v_facturacion_diaria` |

Cadena de conexión de referencia:

```text
Host=localhost;Port=5433;Database=salud_db;Username=bi_readonly;Password=solo_lectura
```

El usuario `bi_readonly` tiene privilegios limitados:

- Lectura sobre los esquemas `admision`, `lab` y `farmacia`.
- Lectura únicamente de la vista agregada `facturacion.v_facturacion_diaria`.
- Sin acceso al esquema `clinico`, a las facturas base ni a las credenciales de usuarios (`admision.usuarios`).

### Notas de seguridad

- Las contraseñas se almacenan con bcrypt y nunca en texto plano.
- El JWT expira a los 60 minutos e incluye el rol y el identificador del paciente.
- El backend es la autoridad final de permisos; el frontend no reemplaza las validaciones del servidor.
- `bi_readonly` aplica mínimo privilegio y no puede leer información clínica sensible.
- Las credenciales incluidas son de demostración académica. Cámbialas antes de cualquier uso fuera del aula.

## Estructura del proyecto

```text
.
├── backend/                 API FastAPI, modelos, esquemas y seguridad JWT
│   └── app/api/endpoints/   Routers por dominio
├── database/                Scripts SQL de inicialización y migraciones
├── frontend/                Aplicación React + Vite
│   └── src/pages/           Portal del paciente y módulos de staff
├── docker-compose.yml       Orquestación de los tres servicios
├── .env.example             Variables de entorno de referencia
└── README.md                Guía de entrega y despliegue
```