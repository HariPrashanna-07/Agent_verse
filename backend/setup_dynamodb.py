"""
One-time DynamoDB table setup script.

Run this ONCE with credentials that have DynamoDB full-access:
    python backend/setup_dynamodb.py

Or set env vars for a more-privileged IAM user/role before running.
"""

import boto3
import sys
from dotenv import dotenv_values
from pathlib import Path

env = dotenv_values(Path(__file__).parent / ".env")

region           = env.get("AWS_REGION", "ap-southeast-2")
access_key       = env.get("AWS_ACCESS_KEY_ID", "")
secret_key       = env.get("AWS_SECRET_ACCESS_KEY", "")
users_table      = env.get("DYNAMODB_USERS_TABLE", "agentverse-users")
scorecards_table = env.get("DYNAMODB_SCORECARDS_TABLE", "agentverse-scorecards")

db = boto3.client(
    "dynamodb",
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
    region_name=region,
)


def table_exists(name: str) -> bool:
    try:
        db.describe_table(TableName=name)
        return True
    except db.exceptions.ResourceNotFoundException:
        return False
    except Exception as exc:
        print(f"  ✗ Cannot check {name}: {exc}")
        sys.exit(1)


# ── agentverse-users ────────────────────────────────────────────────────────
print(f"\nChecking table '{users_table}'…")
if table_exists(users_table):
    print(f"  ✓ Already exists — skipping creation.")

    # Ensure the email-index GSI is present
    desc = db.describe_table(TableName=users_table)
    gsis = [g["IndexName"] for g in desc["Table"].get("GlobalSecondaryIndexes", [])]
    if "email-index" not in gsis:
        print("  ✗ email-index GSI is MISSING. Adding it now…")
        db.update_table(
            TableName=users_table,
            AttributeDefinitions=[{"AttributeName": "email", "AttributeType": "S"}],
            GlobalSecondaryIndexUpdates=[{
                "Create": {
                    "IndexName": "email-index",
                    "KeySchema": [{"AttributeName": "email", "KeyType": "HASH"}],
                    "Projection": {"ProjectionType": "ALL"},
                    "BillingMode": "PAY_PER_REQUEST",
                }
            }],
        )
        print("  ✓ email-index GSI creation initiated (takes ~60s to become ACTIVE).")
    else:
        print(f"  ✓ email-index GSI present: {gsis}")
else:
    print(f"  → Creating '{users_table}'…")
    db.create_table(
        TableName=users_table,
        KeySchema=[
            {"AttributeName": "candidate_id", "KeyType": "HASH"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "candidate_id", "AttributeType": "S"},
            {"AttributeName": "email",        "AttributeType": "S"},
        ],
        GlobalSecondaryIndexes=[{
            "IndexName": "email-index",
            "KeySchema": [{"AttributeName": "email", "KeyType": "HASH"}],
            "Projection": {"ProjectionType": "ALL"},
        }],
        BillingMode="PAY_PER_REQUEST",
    )
    print(f"  ✓ '{users_table}' created with email-index GSI.")


# ── agentverse-scorecards ───────────────────────────────────────────────────
print(f"\nChecking table '{scorecards_table}'…")
if table_exists(scorecards_table):
    print(f"  ✓ Already exists — skipping creation.")
else:
    print(f"  → Creating '{scorecards_table}'…")
    db.create_table(
        TableName=scorecards_table,
        KeySchema=[
            {"AttributeName": "candidate_id", "KeyType": "HASH"},
            {"AttributeName": "interview_id",  "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "candidate_id", "AttributeType": "S"},
            {"AttributeName": "interview_id",  "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )
    print(f"  ✓ '{scorecards_table}' created.")

print("\nDone. Tables may take up to 60s to become ACTIVE before use.\n")
