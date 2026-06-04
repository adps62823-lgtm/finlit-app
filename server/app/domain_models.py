from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

ObjectIdStr = str


class Address(BaseModel):
    line1: str = ""
    city: str = ""
    state: str = ""
    pincode: str = ""


class PortfolioSync(BaseModel):
    lastFullSyncAt: Optional[datetime] = None
    lastSource: str = ""
    syncStatus: Literal["pending", "success", "failed"] = "pending"


class ClientBase(BaseModel):
    clientCode: str
    familyGroupId: str = ""
    primaryHolderName: str
    pan: str = ""
    mobile: str = ""
    email: str = ""
    dob: Optional[datetime] = None
    kycStatus: Literal["pending", "verified", "rejected", "unknown"] = "unknown"
    riskProfile: Literal["conservative", "moderate", "aggressive", "unknown"] = "unknown"
    segment: Literal["retail", "hni", "family", "corporate", "unknown"] = "retail"
    source: str = ""
    assignedRmUserId: Optional[ObjectIdStr] = None
    ownerUserId: Optional[ObjectIdStr] = None
    arnCode: str = ""
    euin: str = ""
    address: Address = Field(default_factory=Address)
    tags: list[str] = Field(default_factory=list)
    notes: str = ""
    portfolioSync: PortfolioSync = Field(default_factory=PortfolioSync)
    status: Literal["active", "inactive", "prospect", "closed"] = "active"


class ClientCreate(ClientBase):
    pass


class ClientOut(ClientBase):
    id: ObjectIdStr = Field(alias="_id")
    createdAt: datetime
    updatedAt: datetime


class FolioBase(BaseModel):
    clientId: ObjectIdStr
    folioNumber: str
    amcCode: str
    amcName: str
    rta: Literal["CAMS", "KFINTECH", "FRANKLIN", "OTHER"] = "OTHER"
    holdingMode: Literal["single", "joint", "either_or_survivor"] = "single"
    taxStatus: str = ""
    bankAccountMasked: str = ""
    bankName: str = ""
    branchName: str = ""
    ifscMasked: str = ""
    nomineeRegistered: bool = False
    kycStatus: str = ""
    fatcaStatus: str = ""
    euin: str = ""
    arnCode: str = ""
    source: str = ""
    isActive: bool = True
    openedAt: Optional[datetime] = None
    lastTransactionAt: Optional[datetime] = None


class FolioOut(FolioBase):
    id: ObjectIdStr = Field(alias="_id")
    createdAt: datetime
    updatedAt: datetime


class HoldingCurrentBase(BaseModel):
    clientId: ObjectIdStr
    folioId: ObjectIdStr
    schemeCode: str
    schemeName: str
    amcCode: str
    assetClass: str
    category: str
    optionType: str
    planType: str
    isin: str = ""
    units: float = 0
    nav: float = 0
    marketValue: float = 0
    costValue: float = 0
    unrealizedGain: float = 0
    xirr: float = 0
    lastNavDate: Optional[datetime] = None
    lastTransactionDate: Optional[datetime] = None
    valuationSource: str = ""
    asOfDate: datetime


class HoldingCurrentOut(HoldingCurrentBase):
    id: ObjectIdStr = Field(alias="_id")
    createdAt: datetime
    updatedAt: datetime


class HoldingSnapshotBase(BaseModel):
    clientId: ObjectIdStr
    folioId: ObjectIdStr
    schemeCode: str
    units: float
    nav: float
    marketValue: float
    costValue: float
    asOfDate: datetime
    source: str = ""
    importBatchId: Optional[ObjectIdStr] = None


class SIPRegistrationBase(BaseModel):
    clientId: ObjectIdStr
    folioId: ObjectIdStr
    schemeCode: str
    schemeName: str
    sipAmount: float
    frequency: Literal["daily", "weekly", "monthly", "quarterly"] = "monthly"
    sipDate: int
    startDate: datetime
    endDate: Optional[datetime] = None
    installmentsPlanned: Optional[int] = None
    installmentsCompleted: int = 0
    status: Literal["active", "paused", "expired", "terminated", "rejected"] = "active"
    registrationStatus: Literal["pending", "registered", "rejected"] = "pending"
    sourcePlatform: str = ""
    sourceReferenceId: str = ""
    mandateId: Optional[ObjectIdStr] = None
    bankAccountMasked: str = ""
    rejectionReason: Optional[str] = None
    lastSuccessAt: Optional[datetime] = None
    nextDueAt: Optional[datetime] = None


class SIPRegistrationOut(SIPRegistrationBase):
    id: ObjectIdStr = Field(alias="_id")
    createdAt: datetime
    updatedAt: datetime


class MandateBase(BaseModel):
    clientId: ObjectIdStr
    folioId: Optional[ObjectIdStr] = None
    mandateRef: str
    bankName: str
    accountHolderName: str
    accountType: Literal["savings", "current", "nre", "nro", "other"] = "savings"
    accountNumberMasked: str
    ifscMasked: str = ""
    limitAmount: float = 0
    frequencyCap: str = ""
    mode: Literal["otm", "emandate", "physical"] = "emandate"
    provider: str = ""
    status: Literal["pending", "active", "rejected", "expired", "cancelled"] = "pending"
    registeredAt: Optional[datetime] = None
    approvedAt: Optional[datetime] = None
    rejectedAt: Optional[datetime] = None
    rejectionReason: Optional[str] = None


class MandateOut(MandateBase):
    id: ObjectIdStr = Field(alias="_id")
    createdAt: datetime
    updatedAt: datetime


class AUMSnapshotBase(BaseModel):
    scopeType: Literal["client", "rm", "branch", "business"]
    scopeId: Optional[ObjectIdStr] = None
    scopeLabel: str
    totalAum: float
    equityAum: float = 0
    debtAum: float = 0
    hybridAum: float = 0
    otherAum: float = 0
    activeSipAmount: float = 0
    folioCount: int = 0
    schemeCount: int = 0
    clientCount: int = 0
    asOfDate: datetime
    source: str = ""
    importBatchId: Optional[ObjectIdStr] = None


class AUMSnapshotOut(AUMSnapshotBase):
    id: ObjectIdStr = Field(alias="_id")
    createdAt: datetime


class TransactionBase(BaseModel):
    clientId: ObjectIdStr
    folioId: ObjectIdStr
    schemeCode: str
    transactionType: Literal["purchase", "redemption", "switch_in", "switch_out", "sip", "stp", "swp"]
    orderType: str = ""
    amount: float = 0
    units: float = 0
    nav: float = 0
    transactionDate: datetime
    status: Literal["pending", "success", "failed", "rejected", "cancelled"] = "pending"
    sourcePlatform: str = ""
    sourceReferenceId: str = ""
    rejectionReason: Optional[str] = None
    arnCode: str = ""
    euin: str = ""


class TransactionOut(TransactionBase):
    id: ObjectIdStr = Field(alias="_id")
    createdAt: datetime
    updatedAt: datetime


class OrderDraftCreate(BaseModel):
    clientId: ObjectIdStr
    folioId: ObjectIdStr
    schemeCode: str
    orderIntentType: Literal["purchase", "redemption", "sip", "switch", "stp", "swp"]
    amount: float = 0
    units: Optional[float] = None
    remarks: str = ""


class OrderDraftOut(BaseModel):
    id: ObjectIdStr = Field(alias="_id")
    clientId: ObjectIdStr
    folioId: ObjectIdStr
    schemeCode: str
    rail: str
    orderIntentType: str
    amount: float
    units: Optional[float] = None
    status: str
    externalRef: str = ""
    remarks: str = ""
    createdByUserId: ObjectIdStr
    createdAt: datetime
    updatedAt: datetime


class OrderUpdate(BaseModel):
    status: Optional[str] = None
    externalRef: Optional[str] = None
    remarks: Optional[str] = None
