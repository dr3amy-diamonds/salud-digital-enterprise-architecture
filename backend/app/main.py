# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.api.endpoints import auth, admision, clinico, lab, farmacia, facturacion

app = FastAPI(
    title="SaludDigital API Core",
    description="Backend centralizado para la arquitectura empresarial de la Clínica SaludDigital",
    version="1.0.0"
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro de Routers
app.include_router(auth.router, prefix="/auth", tags=["Autenticación & Roles"])
app.include_router(admision.router, prefix="/admision", tags=["Admisión & Citas"])
app.include_router(clinico.router, prefix="/clinico", tags=["Historia Clínica"])
app.include_router(lab.router, prefix="/lab", tags=["Laboratorio Clínico"])
app.include_router(farmacia.router, prefix="/farmacia", tags=["Farmacia"])
app.include_router(facturacion.router, prefix="/facturacion", tags=["Facturación"])

@app.get("/", tags=["Healthcheck"])
def read_root():
    return {"status": "online", "sistema": "SaludDigital Enterprise Platform"}