import uuid
from typing import BinaryIO

import boto3
from botocore.client import BaseClient
from botocore.config import Config
from botocore.exceptions import ClientError

from app.storage.base import FileStorage


class S3FileStorage(FileStorage):
    def __init__(
        self,
        *,
        bucket: str,
        endpoint_url: str,
        region: str,
        access_key_id: str,
        secret_access_key: str,
        prefix: str = "docflow",
        client: BaseClient | None = None,
    ) -> None:
        if not bucket:
            raise ValueError("S3 bucket is required")
        self.bucket = bucket
        self.prefix = prefix.strip("/")
        self.client = client or boto3.client(
            "s3",
            endpoint_url=endpoint_url or None,
            region_name=region,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        )

    def save(self, stream: BinaryIO, filename: str) -> str:
        del filename
        key = f"{self.prefix}/{uuid.uuid4()}.pdf" if self.prefix else f"{uuid.uuid4()}.pdf"
        self.client.upload_fileobj(
            stream,
            self.bucket,
            key,
            ExtraArgs={"ContentType": "application/pdf", "ServerSideEncryption": "AES256"},
        )
        return key

    def open(self, path: str) -> BinaryIO:
        try:
            return self.client.get_object(Bucket=self.bucket, Key=path)["Body"]
        except ClientError as exc:
            code = str(exc.response.get("Error", {}).get("Code", ""))
            if code in {"NoSuchKey", "404", "NotFound"}:
                raise FileNotFoundError(path) from exc
            raise

    def delete(self, path: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=path)
