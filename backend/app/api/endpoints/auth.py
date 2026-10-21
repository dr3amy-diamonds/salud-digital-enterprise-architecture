# backend/app/api/endpoints/auth.py
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    require_role,
    verify_password,
)
from backend.app.db.session import get_db
from backend.app.models import SolicitudAcceso, Usuario
from backend.app.schemas import (
    AprobarSolicitud,
    CambioPassword,
    LoginRequest,
    SolicitudCreate,
    Token,
    UsuarioCreate,
)

router = APIRouter()


class EstadoUpdate(BaseModel):
    is_active: bool


class ResetPassword(BaseModel):
    nueva: str = Field(..., min_length=6)


class RolUpdate(BaseModel):
    role: str


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario o clave invalidos")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Cuenta desactivada")
    token = create_access_token({"sub": user.username, "role": user.role, "paciente_id": user.paciente_id})
    return {"access_token": token, "token_type": "bearer", "role": user.role}


@router.post("/solicitudes", status_code=201)
def crear_solicitud(payload: SolicitudCreate, db: Session = Depends(get_db)):
    sol = SolicitudAcceso(
        nombre=payload.nombre,
        documento=payload.documento,
        email=payload.email,
        telefono=payload.telefono,
        rol_solicitado=payload.rol_solicitado,
        motivo=payload.motivo,
        estado="Pendiente",
    )
    db.add(sol)
    db.commit()
    db.refresh(sol)
    return {"id": sol.id, "estado": sol.estado}


@router.get("/solicitudes")
def listar_solicitudes(
    estado: str | None = None,
    db: Session = Depends(get_db),
    _admin=Depends(require_role(["admin"])),
):
    q = db.query(SolicitudAcceso)
    if estado:
        q = q.filter(SolicitudAcceso.estado == estado)
    rows = q.order_by(SolicitudAcceso.id.desc()).all()
    return [
        {
            "id": r.id,
            "nombre": r.nombre,
            "documento": r.documento,
            "email": r.email,
            "rol_solicitado": r.rol_solicitado,
            "motivo": r.motivo,
            "estado": r.estado,
            "fecha_solicitud": r.fecha_solicitud,
        }
        for r in rows
    ]


@router.post("/usuarios", status_code=201)
def crear_usuario(
    payload: UsuarioCreate,
    db: Session = Depends(get_db),
    _admin=Depends(require_role(["admin"])),
):
    if db.query(Usuario).filter(Usuario.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username ya existe")
    user = Usuario(username=payload.username, hashed_password=hash_password(payload.password), role=payload.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "username": user.username, "role": user.role}


@router.post("/usuarios/aprobar", status_code=201)
def aprobar_solicitud(
    payload: AprobarSolicitud,
    db: Session = Depends(get_db),
    admin=Depends(require_role(["admin"])),
):
    sol = db.query(SolicitudAcceso).filter(SolicitudAcceso.id == payload.solicitud_id).first()
    if not sol:
        raise HTTPException(status_code=404, detail="Solicitud no existe")
    if sol.estado != "Pendiente":
        raise HTTPException(status_code=400, detail="Solicitud ya fue revisada")
    if db.query(Usuario).filter(Usuario.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username ya existe")
    role = payload.role or sol.rol_solicitado
    if role == "admin":
        raise HTTPException(status_code=400, detail="No se puede aprobar rol admin por solicitud")
    revisor = db.query(Usuario).filter(Usuario.username == admin["username"]).first()
    user = Usuario(username=payload.username, hashed_password=hash_password(payload.password), role=role)
    db.add(user)
    db.flush()
    sol.estado = "Aprobada"
    sol.revisado_por = revisor.id if revisor else None
    sol.fecha_revision = datetime.now()
    db.commit()
    db.refresh(user)
    return {"id": user.id, "username": user.username, "role": user.role, "solicitud": sol.id}


@router.post("/solicitudes/{solicitud_id}/rechazar")
def rechazar_solicitud(
    solicitud_id: int,
    db: Session = Depends(get_db),
    admin=Depends(require_role(["admin"])),
):
    sol = db.query(SolicitudAcceso).filter(SolicitudAcceso.id == solicitud_id).first()
    if not sol:
        raise HTTPException(status_code=404, detail="Solicitud no existe")
    revisor = db.query(Usuario).filter(Usuario.username == admin["username"]).first()
    sol.estado = "Rechazada"
    sol.revisado_por = revisor.id if revisor else None
    sol.fecha_revision = datetime.now()
    db.commit()
    return {"id": sol.id, "estado": sol.estado}


@router.get("/usuarios")
def listar_usuarios(db: Session = Depends(get_db), _admin=Depends(require_role(["admin"]))):
    rows = db.query(Usuario).order_by(Usuario.id).all()
    return [{"id": u.id, "username": u.username, "role": u.role, "is_active": u.is_active} for u in rows]


@router.patch("/usuarios/{user_id}/rol")
def cambiar_rol(
    user_id: int,
    payload: RolUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(require_role(["admin"])),
):
    if payload.role not in ("medico", "bacteriologo", "farmaceutico", "cajero", "gerencia", "admin"):
        raise HTTPException(status_code=400, detail="Rol invalido")
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no existe")
    user.role = payload.role
    db.commit()
    return {"id": user.id, "username": user.username, "role": user.role}


@router.patch("/usuarios/{user_id}/estado")
def cambiar_estado(
    user_id: int,
    payload: EstadoUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(require_role(["admin"])),
):
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no existe")
    user.is_active = payload.is_active
    db.commit()
    return {"id": user.id, "username": user.username, "is_active": user.is_active}


@router.post("/usuarios/{user_id}/reset-password")
def reset_password(
    user_id: int,
    payload: ResetPassword,
    db: Session = Depends(get_db),
    _admin=Depends(require_role(["admin"])),
):
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no existe")
    user.hashed_password = hash_password(payload.nueva)
    db.commit()
    return {"id": user.id, "username": user.username, "reset": True}


@router.post("/cambiar-password")
def cambiar_password_propia(
    payload: CambioPassword,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    row = db.query(Usuario).filter(Usuario.username == user["username"]).first()
    if not row:
        raise HTTPException(status_code=404, detail="Usuario no existe")
    if not verify_password(payload.actual, row.hashed_password):
        raise HTTPException(status_code=400, detail="Clave actual incorrecta")
    row.hashed_password = hash_password(payload.nueva)
    db.commit()
    return {"username": row.username, "cambiada": True}
