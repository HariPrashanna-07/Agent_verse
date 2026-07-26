import io
import logging
import uuid
from datetime import datetime, timezone

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from backend.app.config import settings

logger = logging.getLogger(__name__)


def get_s3_client():
    """Return a configured boto3 S3 client using centralized settings."""
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )


def upload_pdf_to_s3(pdf_bytes: bytes, company: str, filename: str) -> str:
    """
    Upload PDF raw bytes to S3 and return the public file URL.

    A UUID-prefixed timestamp is prepended to the S3 key to prevent
    filename collisions between concurrent uploads of the same file.
    Returns a sentinel string if upload fails (non-fatal — interview can continue).
    """
    if not settings.aws_configured:
        logger.warning("AWS credentials not configured — S3 upload skipped.")
        return "s3_upload_skipped_no_credentials"

    bucket_name = settings.AWS_S3_BUCKET_NAME
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
    unique_prefix = f"{timestamp}-{uuid.uuid4().hex[:8]}"
    s3_key = f"resumes/{company}/{unique_prefix}-{filename}"

    try:
        s3 = get_s3_client()
        s3.upload_fileobj(
            io.BytesIO(pdf_bytes),
            bucket_name,
            s3_key,
            ExtraArgs={"ContentType": "application/pdf"},
        )
        url = f"https://{bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"
        logger.info("Resume uploaded to S3: %s", url)
        return url

    except (BotoCoreError, ClientError) as exc:
        logger.error("S3 upload failed: %s", exc)
        return "s3_upload_failed"
    except Exception as exc:
        logger.error("Unexpected S3 error: %s", exc)
        return "s3_upload_failed"