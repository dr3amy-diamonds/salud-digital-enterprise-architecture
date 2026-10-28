# backend/app/models.py
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, Text, func
from sqlalchemy.dialects.postgresql import JSONB

from backend.app.db.session import Base


class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = {"schema": "admision"}

    id = Column(Integer, primary_key=True, index=True)
    username = Column(Text, unique=True, nullable=False, index=True)
    hashed_password = Column(Text, nullable=False)
    role = Column(Text, nullable=False)
    paciente_id = Column(
        Integer,
        ForeignKey("admision.pacientes.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())


class Paciente(Base):
    __tablename__ = "pacientes"
    __table_args__ = {"schema": "admision"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(Text, nullable=False)
    documento = Column(Text, unique=True, nullable=False, index=True)
    telefono = Column(Text)
    email = Column(Text)
    fecha_registro = Column(DateTime, server_default=func.now())


class Cita(Base):
    __tablename__ = "citas"
    __table_args__ = {"schema": "admision"}

    id = Column(Integer, primary_key=True, index=True)
    paciente_id = Column(Integer, ForeignKey("admision.pacientes.id", ondelete="CASCADE"), nullable=False)
    fecha = Column(DateTime, nullable=False)
    especialidad = Column(Text, nullable=False)
    estado = Column(Text, default="Agendada")


class HistoriaClinica(Base):
    __tablename__ = "historias"
    __table_args__ = {"schema": "clinico"}

    id = Column(Integer, primary_key=True, index=True)
    paciente_id = Column(Integer, ForeignKey("admision.pacientes.id", ondelete="CASCADE"), nullable=False)
    cita_id = Column(Integer, ForeignKey("admision.citas.id"), unique=True)
    fecha_atencion = Column(DateTime, server_default=func.now())
    motivo_consulta = Column(Text, nullable=False)
    diagnostico = Column(Text, nullable=False)
    medico_id = Column(Integer, nullable=False)


class OrdenLab(Base):
    __tablename__ = "ordenes"
    __table_args__ = {"schema": "lab"}

    id = Column(Integer, primary_key=True, index=True)
    paciente_id = Column(Integer, ForeignKey("admision.pacientes.id", ondelete="CASCADE"), nullable=False)
    atencion_id = Column(Integer, ForeignKey("clinico.historias.id"))
    tipo_examen = Column(Text, nullable=False)
    estado = Column(Text, default="Pendiente")


class ResultadoLab(Base):
    __tablename__ = "resultados"
    __table_args__ = {"schema": "lab"}

    id = Column(Integer, primary_key=True, index=True)
    orden_id = Column(Integer, ForeignKey("lab.ordenes.id", ondelete="CASCADE"), unique=True)
    detalle_resultado = Column(JSONB, nullable=False)
    fecha_resultado = Column(DateTime, server_default=func.now())
    bacteriologo_id = Column(Integer, nullable=False)


class Receta(Base):
    __tablename__ = "recetas"
    __table_args__ = {"schema": "farmacia"}

    id = Column(Integer, primary_key=True, index=True)
    paciente_id = Column(Integer, ForeignKey("admision.pacientes.id", ondelete="CASCADE"), nullable=False)
    atencion_id = Column(Integer, ForeignKey("clinico.historias.id"))
    medicamento = Column(Text, nullable=False)
    dosis = Column(Text, nullable=False)
    estado = Column(Text, default="Pendiente")


class Factura(Base):
    __tablename__ = "facturas"
    __table_args__ = {"schema": "facturacion"}

    id = Column(Integer, primary_key=True, index=True)
    paciente_id = Column(Integer, ForeignKey("admision.pacientes.id", ondelete="CASCADE"), nullable=False)
    atencion_id = Column(Integer, ForeignKey("clinico.historias.id"))
    total = Column(Numeric(10, 2), nullable=False)
    concepto = Column(Text, nullable=False, default="Atención médica")
    fecha_emision = Column(DateTime, server_default=func.now())
    estado_pago = Column(Text, default="Pendiente")


class SolicitudAcceso(Base):
    __tablename__ = "solicitudes_acceso"
    __table_args__ = {"schema": "admision"}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(Text, nullable=False)
    documento = Column(Text, nullable=False)
    email = Column(Text)
    telefono = Column(Text)
    rol_solicitado = Column(Text, nullable=False)
    motivo = Column(Text)
    estado = Column(Text, nullable=False, default="Pendiente")
    fecha_solicitud = Column(DateTime, server_default=func.now())
    revisado_por = Column(Integer, ForeignKey("admision.usuarios.id"))
    fecha_revision = Column(DateTime)
