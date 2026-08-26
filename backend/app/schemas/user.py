from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.cpf import is_valid_cpf, normalize_cpf
from app.core.enums import UserRole


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    cpf: str
    password: str = Field(min_length=8, max_length=128)
    role: UserRole = UserRole.COLLABORATOR

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name cannot be blank")
        return value

    @field_validator("cpf", mode="before")
    @classmethod
    def validate_cpf(cls, value: str) -> str:
        digits = normalize_cpf(value)
        if not is_valid_cpf(digits):
            raise ValueError("Invalid CPF")
        return digits


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None
    cpf: str | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
    role: UserRole | None = None
    is_active: bool | None = None

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("Name cannot be blank")
        return value

    @field_validator("cpf", mode="before")
    @classmethod
    def validate_cpf(cls, value: str | None) -> str | None:
        if value is None:
            return None
        digits = normalize_cpf(value)
        if not is_valid_cpf(digits):
            raise ValueError("Invalid CPF")
        return digits


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: EmailStr
    cpf: str | None
    role: str
    is_active: bool
    created_at: datetime
