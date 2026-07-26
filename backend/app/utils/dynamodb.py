"""
DynamoDB access layer.
Tables (created manually in AWS Console):
  agentverse-users      — PK: candidate_id (S)  + GSI: email-index on email (S)
  agentverse-scorecards — PK: candidate_id (S)  + SK: interview_id (S)
"""
import logging
from datetime import datetime, timezone
from typing import Optional

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from backend.app.config import settings

logger = logging.getLogger(__name__)


def _get_resource():
    return boto3.resource(
        "dynamodb",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )


# ── Users ──────────────────────────────────────────────────────────────────

def get_user_by_email(email: str) -> Optional[dict]:
    """Look up a user by email using the email-index GSI."""
    try:
        table = _get_resource().Table(settings.DYNAMODB_USERS_TABLE)
        resp = table.query(
            IndexName="email-index",
            KeyConditionExpression="email = :e",
            ExpressionAttributeValues={":e": email},
            Limit=1,
        )
        items = resp.get("Items", [])
        return items[0] if items else None
    except (BotoCoreError, ClientError) as exc:
        logger.error("DynamoDB get_user_by_email failed: %s", exc)
        raise


def get_user_by_id(candidate_id: str) -> Optional[dict]:
    try:
        table = _get_resource().Table(settings.DYNAMODB_USERS_TABLE)
        resp = table.get_item(Key={"candidate_id": candidate_id})
        return resp.get("Item")
    except (BotoCoreError, ClientError) as exc:
        logger.error("DynamoDB get_user_by_id failed: %s", exc)
        raise


def create_user(candidate_id: str, email: str, hashed_pw: str, name: str) -> dict:
    """Put a new user record into the users table."""
    item = {
        "candidate_id": candidate_id,
        "email": email,
        "password_hash": hashed_pw,
        "name": name,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        table = _get_resource().Table(settings.DYNAMODB_USERS_TABLE)
        table.put_item(
            Item=item,
            ConditionExpression="attribute_not_exists(candidate_id)",
        )
        return item
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
            raise ValueError("User already exists")
        logger.error("DynamoDB create_user failed: %s", exc)
        raise


# ── Scorecards ─────────────────────────────────────────────────────────────

def save_scorecard(candidate_id: str, interview_id: str, payload: dict) -> None:
    """Persist a completed scorecard under the candidate's ID."""
    item = {
        "candidate_id": candidate_id,
        "interview_id": interview_id,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        **payload,
    }
    try:
        table = _get_resource().Table(settings.DYNAMODB_SCORECARDS_TABLE)
        table.put_item(Item=item)
        logger.info("Scorecard saved: candidate=%s interview=%s", candidate_id, interview_id)
    except (BotoCoreError, ClientError) as exc:
        logger.error("DynamoDB save_scorecard failed: %s", exc)
        raise


def get_scorecards(candidate_id: str) -> list[dict]:
    """Fetch all scorecards for a given candidate, newest first."""
    try:
        table = _get_resource().Table(settings.DYNAMODB_SCORECARDS_TABLE)
        resp = table.query(
            KeyConditionExpression="candidate_id = :c",
            ExpressionAttributeValues={":c": candidate_id},
            ScanIndexForward=False,  # newest first
        )
        return resp.get("Items", [])
    except (BotoCoreError, ClientError) as exc:
        logger.error("DynamoDB get_scorecards failed: %s", exc)
        raise
