from io import BytesIO

from botocore.exceptions import ClientError

from app.storage.s3 import S3FileStorage


class FakeS3Client:
    def __init__(self) -> None:
        self.objects: dict[tuple[str, str], bytes] = {}

    def upload_fileobj(self, stream, bucket, key, ExtraArgs):
        assert ExtraArgs == {
            "ContentType": "application/pdf",
            "ServerSideEncryption": "AES256",
        }
        self.objects[(bucket, key)] = stream.read()

    def get_object(self, *, Bucket, Key):
        try:
            data = self.objects[(Bucket, Key)]
        except KeyError as exc:
            raise ClientError(
                {"Error": {"Code": "NoSuchKey", "Message": "missing"}},
                "GetObject",
            ) from exc
        return {"Body": BytesIO(data)}

    def delete_object(self, *, Bucket, Key):
        self.objects.pop((Bucket, Key), None)


def test_s3_storage_saves_reads_and_deletes_private_pdf():
    client = FakeS3Client()
    storage = S3FileStorage(
        bucket="docflow-private",
        endpoint_url="https://s3.example.com",
        region="us-east-1",
        access_key_id="test-key",
        secret_access_key="test-secret",
        prefix="tenant-files",
        client=client,
    )

    path = storage.save(BytesIO(b"%PDF-private"), "policy.pdf")

    assert path.startswith("tenant-files/")
    assert storage.open(path).read() == b"%PDF-private"
    storage.delete(path)

    try:
        storage.open(path)
    except FileNotFoundError:
        pass
    else:
        raise AssertionError("Deleted object should not be readable")
