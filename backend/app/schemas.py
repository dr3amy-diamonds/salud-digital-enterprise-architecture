# backend/app/schemas.py
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Rol = Literal["medico", "bacteriologo", "farmaceutico", "cajero", "gerencia", "admin"]
RolSolicitable = Literal["medico", "bacteriologo", "farmaceutico", "cajero", "gerencia"]


class PacienteCreate(BaseModel):
    nombre: str = Field(..., min_length=2)
    documento: str = Field(..., min_length=5)
    telefono: str | None = None
    email: str | None = None


class CitaCreate(BaseModel):
    paciente_id: int | None = None
    fecha: datetime
    especialidad: str = Field(..., min_length=2)
    estado: str = "Agendada"


class CitaReprogramar(BaseModel):
    fecha: datetime


class CitaOut(BaseModel):
    id: int
    paciente_id: int
    fecha: datetime
    especialidad: str
    estado: str | None = None

    class Config:
        from_attributes = True


class ResultadoLabOut(BaseModel):
    id: int
    orden_id: int
    tipo_examen: str
    detalle_resultado: dict
    fecha_resultado: datetime | None = None
    pdf_url: str | None = None


class HistoriaCreate(BaseModel):
    paciente_id: int
    cita_id: int | None = None
    motivo_consulta: str = Field(..., min_length=3)
    diagnostico: str = Field(..., min_length=3)


class OrdenCreate(BaseModel):
    paciente_id: int
    atencion_id: int | None = None
    tipo_examen: str = Field(..., min_length=2)


class ResultadoCreate(BaseModel):
    orden_id: int
    detalle_resultado: dict
    bacteriologo_id: int | None = None


class RecetaCreate(BaseModel):
    paciente_id: int
    atencion_id: int | None = None
    medicamento: str = Field(..., min_length=2)
    dosis: str = Field(..., min_length=1)


class FacturaCreate(BaseModel):
    paciente_id: int
    atencion_id: int | None = None
    total: float = Field(..., gt=0)


class LoginRequest(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class SolicitudCreate(BaseModel):
    nombre: str = Field(..., min_length=2)
    documento: str = Field(..., min_length=5)
    email: str | None = None
    telefono: str | None = None
    rol_solicitado: RolSolicitable
    motivo: str | None = None


class UsuarioCreate(BaseModel):
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)
    role: Rol


class AprobarSolicitud(BaseModel):
    solicitud_id: int
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)
    role: Rol | None = None


class CambioPassword(BaseModel):
    actual: str = Field(..., min_length=1)
    nueva: str = Field(..., min_length=6)


class UsuarioOut(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True
