# SaludDigital Enterprise Architecture

SaludDigital es una plataforma académica de gestión clínica para una clínica privada ficticia. Implementa una arquitectura empresarial por dominios con separación de responsabilidades entre admisión, historia clínica, laboratorio, farmacia, facturación y analítica gerencial.

El sistema expone una API REST protegida con JWT y control de acceso basado en roles (RBAC). El frontend ajusta la experiencia según el rol autenticado, y PostgreSQL aplica el principio de mínimo privilegio para el usuario de analítica.

> Proyecto académico. No está diseñado para producción ni para almacenar datos clínicos reales.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | FastAPI, SQLAlchemy, Pydantic, Uvicorn |
| Frontend | React 19, TypeScript, Vite, React Router |
| Base de datos | PostgreSQL 15 |
| Infraestructura | Docker, Docker Compose |
| Analítica | Power BI (conexión de solo lectura) |
| Autenticación | JWT (HS256) y contraseñas con bcrypt |

## Despliegue rápido

Requisitos: Docker Desktop en ejecución y el archivo `.env` en la raíz.

Si no existe `.env`, créalo a partir de la plantilla:

```powershell
Copy-Item .env.example .env
```

Levanta todos los servicios con un solo comando:

```bash
docker compose up -d --build
```

Servicios disponibles:

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:8000 |
| Documentación Swagger | http://localhost:8000/docs |
| PostgreSQL | localhost:5433 |

Verifica el estado:

```bash
docker compose ps
```

Detén la plataforma:

```bash
docker compose down
```

### Reinicio completo de la base de datos

`database/init.sql` solo se ejecuta al crear el volumen por primera vez. Si modificas el script y necesitas reaplicarlo, elimina el volumen. Esta operación borra todos los datos existentes y no se puede deshacer:

```bash
docker compose down -v
docker compose up -d --build
```

## Usuarios de prueba

Todas las cuentas precreadas usan la misma contraseña: `Salud2026*`.

| Usuario | Rol | Descripción |
|---|---|---|
| `admin` | admin | Superusuario técnico y gestión de cuentas |
| `drmartinez` | medico | Atención clínica, órdenes y recetas |
| `lab1` | bacteriologo | Procesamiento de resultados de laboratorio |
| `farmacia1` | farmaceutico | Registro de recetas |
| `cajero1` | cajero | Facturación y admisión |
| `gerencia1` | gerencia | Consulta gerencial y tablero de indicadores |
| `paciente1` | paciente | Portal del paciente (Laura Sofía Valencia) |

Recomendación: cambiar la contraseña del usuario `admin` después del primer inicio de sesión mediante `POST /auth/cambiar-password`.

## Matriz de roles (RBAC)

`R` = lectura, `W` = escritura, `—` = sin acceso. El backend valida cada permiso en el servidor; el frontend solo oculta acciones por conveniencia.

| Módulo | medico | bacteriologo | farmaceutico | cajero | gerencia | admin | paciente |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Admisión — pacientes | R/W | R | R | R/W | R | R/W | — |
| Admisión — citas | R/W | R | R | R/W | R | R/W | R/W (solo propias) |
| Historia clínica | R/W | — | — | — | — | — | — |
| Laboratorio — órdenes | R/W | R/W | — | — | R | R/W | — |
| Laboratorio — resultados | R | R/W | — | — | — | R/W | R (solo propios, procesados) |
| Farmacia — recetas | R/W | — | R/W | — | R | R/W | — |
| Facturación | — | — | — | R/W | R | R/W | — |
| Usuarios y cuentas | — | — | — | — | — | R/W | — |

Reglas de negocio relevantes:

- El rol `paciente` solo puede agendar, cancelar o reprogramar citas propias; el estado inicial siempre se fuerza a `Agendada`.
- Toda cita debe tener una fecha estrictamente futura; el servidor responde `400 Bad Request` si la fecha ya pasó.
- Los módulos de solo lectura ocultan los formularios de escritura y muestran la insignia **Vista de Solo Lectura**.
- `gerencia` no accede a historia clínica ni a resultados de laboratorio.

## Acceso para Power BI

| Parámetro | Valor |
|---|---|
| Usuario | `bi_readonly` |
| Contraseña | `solo_lectura` |
| Host | `localhost` |
| Puerto | `5433` |
| Base de datos | `salud_db` |
| Esquema | `facturacion` |
| Vista | `v_facturacion_diaria` |

Tabla de la vista: `dia`, `cantidad_facturas`, `total_recaudado`.

El usuario `bi_readonly` tiene privilegios limitados:

- Lectura sobre los esquemas `admision`, `lab` y `farmacia`.
- Lectura únicamente de la vista agregada `facturacion.v_facturacion_diaria`.
- Sin acceso al esquema `clinico`, a las facturas base ni a las credenciales de usuarios.

Si el cliente de Power BI exige una cadena de conexión, usa:

```text
Host=localhost;Port=5433;Database=salud_db;Username=bi_readonly;Password=solo_lectura
```

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

## Verificación de calidad

Desde `frontend/`:

```bash
npm install
npm run lint
npm run build
```

Ambos comandos deben finalizar sin errores ni advertencias.

## Notas de seguridad

- Las contraseñas se almacenan con bcrypt y nunca en texto plano.
- El JWT expira a los 60 minutos e incluye el rol y el identificador del paciente.
- El backend es la autoridad final de permisos; el frontend no reemplaza las validaciones del servidor.
- `bi_readonly` aplica mínimo privilegio y no puede leer información clínica sensible.
- Las credenciales incluidas son de demostración académica. Cámbialas antes de cualquier uso fuera del aula.
