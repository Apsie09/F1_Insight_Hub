from __future__ import annotations

from pydantic import BaseModel


class CalculatorInputPayload(BaseModel):
    season: int
    raceId: str
    racerId: str
    gridPosition: int
    weatherCondition: str
