from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, Field


class MeetingLogCreate(BaseModel):
    clientName: str = Field(min_length=1)
    location: str = Field(min_length=1)
    notes: str = Field(min_length=1)
    meetingType: str = "review"
    priority: Literal["low", "medium", "high"] = "medium"
    outcome: str = ""
    followUpSummary: str = ""
    followUpDate: Optional[date] = None


class MeetingLogUpdate(BaseModel):
    clientName: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    meetingType: Optional[str] = None
    priority: Optional[Literal["low", "medium", "high"]] = None
    outcome: Optional[str] = None
    followUpSummary: Optional[str] = None
    followUpDate: Optional[date] = None


class ClientUpdate(BaseModel):
    primaryHolderName: Optional[str] = None
    email: Optional[str] = None
    mobile: Optional[str] = None
    city: Optional[str] = None
    familyName: Optional[str] = None
    relationshipStatus: Optional[str] = None
    notes: Optional[str] = None
    nextAction: Optional[str] = None
    nextReviewDate: Optional[date] = None


class ClientCreate(BaseModel):
    clientCode: Optional[str] = None
    primaryHolderName: str = Field(min_length=1)
    email: Optional[str] = None
    mobile: Optional[str] = None
    city: Optional[str] = None
    familyName: Optional[str] = None
    relationshipStatus: Optional[str] = None
    notes: Optional[str] = None
    nextAction: Optional[str] = None
    nextReviewDate: Optional[date] = None
    source: Optional[str] = "bulk_import"
    assignedRmEmail: Optional[str] = None


class FollowUpTaskCreate(BaseModel):
    clientId: str = Field(min_length=1)
    title: str = Field(min_length=1)
    details: str = ""
    dueDate: Optional[date] = None
    priority: Literal["low", "medium", "high"] = "medium"


class FollowUpTaskUpdate(BaseModel):
    title: Optional[str] = None
    details: Optional[str] = None
    dueDate: Optional[date] = None
    priority: Optional[Literal["low", "medium", "high"]] = None
    status: Optional[Literal["open", "done"]] = None


class UploadSignRequest(BaseModel):
    folder: Optional[str] = None
    resourceType: str = "auto"


class ChatMessagePayload(BaseModel):
    text: str = ""
    attachmentUrl: str = ""
    attachmentType: str = ""
    attachmentName: str = ""
