import hashlib
import mimetypes
import os
from pathlib import Path


def configuration():
    names = ('R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET')
    local = {}
    env_file = Path(__file__).parent / '.env'
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            name, separator, value = line.strip().partition('=')
            if separator and name in names:
                local[name] = value.strip().strip('\"\'')
    values = {name: os.environ.get(name, local.get(name, '')).strip() for name in names}
    missing = [name for name in names if not values[name]]
    if missing:
        raise RuntimeError('R2 niet ingesteld: ' + ', '.join(missing) + '. Stoppen zonder publicatie.')
    if len(values['R2_ACCOUNT_ID']) != 32 or any(character not in '0123456789abcdef' for character in values['R2_ACCOUNT_ID']):
        raise RuntimeError('Ongeldig R2_ACCOUNT_ID.')
    return values


def client_for(settings):
    import boto3
    return boto3.client(
        's3',
        endpoint_url=f"https://{settings['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=settings['R2_ACCESS_KEY_ID'],
        aws_secret_access_key=settings['R2_SECRET_ACCESS_KEY'],
        region_name='auto',
    )


def check_access():
    settings = configuration()
    client_for(settings).list_objects_v2(Bucket=settings['R2_BUCKET'], Prefix='img/kleurplaten/', MaxKeys=1)


def sync_images(root, client=None, bucket=None):
    root = Path(root)
    if client is None:
        settings = configuration()
        client = client_for(settings)
        bucket = settings['R2_BUCKET']
    prefix = 'img/kleurplaten/'
    directory = root / prefix
    files = sorted(path for path in directory.rglob('*') if path.is_file() and (path.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp') or path.name == '.titles.json'))
    if not files:
        raise RuntimeError('Geen lokale kleurplaten gevonden; stoppen zonder publicatie.')
    for source in files:
        if source.parent == directory and source.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp'):
            if not (directory / 'thumbs' / source.name).is_file():
                raise RuntimeError(f'Voorbeeldafbeelding ontbreekt: {source.name}')
    remote = {}
    for page in client.get_paginator('list_objects_v2').paginate(Bucket=bucket, Prefix=prefix):
        for item in page.get('Contents', []):
            remote[item['Key']] = item
    uploaded = 0
    for source in files:
        key = source.relative_to(root).as_posix()
        data = source.read_bytes()
        digest = hashlib.md5(data).hexdigest()
        existing = remote.get(key, {})
        if existing.get('ETag', '').strip('"') == digest and existing.get('Size') == len(data):
            continue
        client.put_object(
            Bucket=bucket, Key=key, Body=data,
            ContentType=mimetypes.guess_type(source.name)[0] or 'application/octet-stream',
            CacheControl='public, max-age=3600',
        )
        saved = client.head_object(Bucket=bucket, Key=key)
        if saved.get('ETag', '').strip('"') != digest or saved.get('ContentLength') != len(data):
            raise RuntimeError(f'R2-verificatie mislukt: {key}; stoppen zonder publicatie.')
        uploaded += 1
    print(f'R2: {uploaded} bestanden geüpload en gecontroleerd; {len(files) - uploaded} ongewijzigd.')
    return uploaded


if __name__ == '__main__':
    sync_images(Path(__file__).parent)
