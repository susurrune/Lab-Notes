from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class BusinessError(Exception):
    code: str
    message: str
    status_code: int = 400
    detail: Any = None

    def __str__(self) -> str:
        return self.message
