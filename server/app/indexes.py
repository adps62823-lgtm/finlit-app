from pymongo import ASCENDING, DESCENDING, TEXT
from pymongo.errors import OperationFailure


INDEX_OPTION_KEYS = ("unique", "sparse", "expireAfterSeconds", "partialFilterExpression", "weights")


def _index_signature(keys, options):
    signature = {"key": list(keys)}
    for option_key in INDEX_OPTION_KEYS:
        if option_key in options:
            signature[option_key] = options[option_key]
    return signature


def _create_index_if_missing(collection, keys, **options):
    try:
        return collection.create_index(keys, **options)
    except OperationFailure as exc:
        if exc.code != 85:
            raise

        desired_signature = _index_signature(keys, options)
        for existing in collection.list_indexes():
            if _index_signature(existing["key"].items(), existing) == desired_signature:
                return existing["name"]
        raise


def create_platform_indexes(db):
    _create_index_if_missing(db.clients, [("clientCode", ASCENDING)], unique=True, name="uq_client_code")
    _create_index_if_missing(db.clients, [("pan", ASCENDING)], name="idx_clients_pan")
    _create_index_if_missing(db.clients, [("mobile", ASCENDING)], name="idx_clients_mobile")
    _create_index_if_missing(db.clients, [("email", ASCENDING)], name="idx_clients_email")
    _create_index_if_missing(db.clients, [("assignedRmUserId", ASCENDING)], name="idx_clients_rm")
    _create_index_if_missing(db.clients, [("familyGroupId", ASCENDING)], name="idx_clients_family")
    _create_index_if_missing(
        db.clients,
        [("primaryHolderName", TEXT), ("pan", TEXT), ("email", TEXT), ("mobile", TEXT)],
        name="txt_clients_search",
    )

    _create_index_if_missing(
        db.folios,
        [("clientId", ASCENDING), ("folioNumber", ASCENDING), ("amcCode", ASCENDING)],
        unique=True,
        name="uq_folio_client_amc",
    )
    _create_index_if_missing(db.folios, [("folioNumber", ASCENDING)], name="idx_folios_number")
    _create_index_if_missing(db.folios, [("clientId", ASCENDING)], name="idx_folios_client")
    _create_index_if_missing(db.folios, [("rta", ASCENDING)], name="idx_folios_rta")
    _create_index_if_missing(db.folios, [("lastTransactionAt", DESCENDING)], name="idx_folios_last_txn")

    _create_index_if_missing(
        db.holdings_current,
        [("clientId", ASCENDING), ("folioId", ASCENDING), ("schemeCode", ASCENDING)],
        unique=True,
        name="uq_holding_current",
    )
    _create_index_if_missing(db.holdings_current, [("clientId", ASCENDING)], name="idx_holdings_current_client")
    _create_index_if_missing(db.holdings_current, [("folioId", ASCENDING)], name="idx_holdings_current_folio")
    _create_index_if_missing(db.holdings_current, [("amcCode", ASCENDING)], name="idx_holdings_current_amc")
    _create_index_if_missing(db.holdings_current, [("assetClass", ASCENDING)], name="idx_holdings_current_asset")
    _create_index_if_missing(db.holdings_current, [("category", ASCENDING)], name="idx_holdings_current_category")
    _create_index_if_missing(db.holdings_current, [("marketValue", DESCENDING)], name="idx_holdings_current_value")

    _create_index_if_missing(
        db.holding_snapshots,
        [("clientId", ASCENDING), ("folioId", ASCENDING), ("schemeCode", ASCENDING), ("asOfDate", DESCENDING)],
        unique=True,
        name="uq_holding_snapshot",
    )
    _create_index_if_missing(db.holding_snapshots, [("asOfDate", DESCENDING)], name="idx_holding_snapshots_date")
    _create_index_if_missing(db.holding_snapshots, [("importBatchId", ASCENDING)], name="idx_holding_snapshots_batch")

    _create_index_if_missing(db.sip_registrations, [("clientId", ASCENDING)], name="idx_sips_client")
    _create_index_if_missing(db.sip_registrations, [("folioId", ASCENDING)], name="idx_sips_folio")
    _create_index_if_missing(db.sip_registrations, [("schemeCode", ASCENDING)], name="idx_sips_scheme")
    _create_index_if_missing(db.sip_registrations, [("status", ASCENDING)], name="idx_sips_status")
    _create_index_if_missing(db.sip_registrations, [("nextDueAt", ASCENDING)], name="idx_sips_next_due")
    _create_index_if_missing(db.sip_registrations, [("sourceReferenceId", ASCENDING)], name="idx_sips_source_ref")

    _create_index_if_missing(db.mandates, [("clientId", ASCENDING)], name="idx_mandates_client")
    _create_index_if_missing(db.mandates, [("folioId", ASCENDING)], name="idx_mandates_folio")
    _create_index_if_missing(db.mandates, [("mandateRef", ASCENDING)], name="idx_mandates_ref")
    _create_index_if_missing(db.mandates, [("status", ASCENDING)], name="idx_mandates_status")

    _create_index_if_missing(
        db.aum_snapshots,
        [("scopeType", ASCENDING), ("scopeId", ASCENDING), ("asOfDate", DESCENDING)],
        unique=True,
        name="uq_aum_snapshot_scope",
    )
    _create_index_if_missing(db.aum_snapshots, [("asOfDate", DESCENDING)], name="idx_aum_snapshots_date")
    _create_index_if_missing(db.aum_snapshots, [("scopeType", ASCENDING)], name="idx_aum_snapshots_scope_type")

    _create_index_if_missing(db.transactions, [("clientId", ASCENDING), ("transactionDate", DESCENDING)], name="idx_txn_client_date")
    _create_index_if_missing(db.transactions, [("folioId", ASCENDING)], name="idx_txn_folio")
    _create_index_if_missing(db.transactions, [("schemeCode", ASCENDING)], name="idx_txn_scheme")
    _create_index_if_missing(db.transactions, [("status", ASCENDING)], name="idx_txn_status")
    _create_index_if_missing(
        db.transactions,
        [("sourcePlatform", ASCENDING), ("sourceReferenceId", ASCENDING)],
        name="idx_txn_source_ref",
    )

    _create_index_if_missing(db.orders, [("clientId", ASCENDING), ("createdAt", DESCENDING)], name="idx_orders_client_date")
    _create_index_if_missing(db.orders, [("status", ASCENDING)], name="idx_orders_status")
    _create_index_if_missing(db.orders, [("rail", ASCENDING)], name="idx_orders_rail")

    _create_index_if_missing(db.rejections, [("clientId", ASCENDING), ("createdAt", DESCENDING)], name="idx_rej_client_date")
    _create_index_if_missing(db.rejections, [("status", ASCENDING)], name="idx_rej_status")

    _create_index_if_missing(db.meeting_logs, [("staffId", ASCENDING), ("createdAt", DESCENDING)], name="idx_meeting_staff_date")
    _create_index_if_missing(db.meeting_logs, [("clientId", ASCENDING), ("createdAt", DESCENDING)], name="idx_meeting_client_date")
    _create_index_if_missing(db.chat_messages, [("createdAt", DESCENDING)], name="idx_chat_date")
    _create_index_if_missing(db.follow_up_tasks, [("clientId", ASCENDING), ("status", ASCENDING), ("dueDate", ASCENDING)], name="idx_tasks_client_status_due")
    _create_index_if_missing(db.follow_up_tasks, [("assignedToUserId", ASCENDING), ("status", ASCENDING), ("dueDate", ASCENDING)], name="idx_tasks_owner_status_due")

    _create_index_if_missing(db.import_batches, [("source", ASCENDING), ("startedAt", DESCENDING)], name="idx_import_source_date")
    _create_index_if_missing(db.import_batches, [("status", ASCENDING)], name="idx_import_status")
