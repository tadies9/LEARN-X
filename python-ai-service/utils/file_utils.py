"""
File utilities for file processing.
Handles downloading files from Supabase storage.
"""

import os
import tempfile
import mimetypes
from typing import Optional
from pathlib import Path
import aiohttp
from app.config import settings
from core.logging import get_logger

logger = get_logger(__name__)


async def download_from_storage(storage_path: str, bucket: str = 'course-files') -> str:
    """
    Download file from Supabase storage to a temporary location.
    
    Args:
        storage_path: Path in storage bucket
        bucket: Storage bucket name (defaults to 'course-files')
        
    Returns:
        Local file path
    """
    try:
        # Construct the download URL - try authenticated endpoint
        url = f"{settings.supabase_url}/storage/v1/object/{bucket}/{storage_path}"
        
        logger.info(f"Downloading file from: {url}")
        logger.debug(f"Storage path: {storage_path}, Bucket: {bucket}")
        
        # Determine file extension from storage path
        ext = Path(storage_path).suffix or '.tmp'
        
        # Create temporary file
        temp_file = tempfile.NamedTemporaryFile(mode='wb', delete=False, suffix=ext)
        
        # Download file - use service key for authenticated access
        headers = {}
        if settings.supabase_service_key:
            headers['Authorization'] = f'Bearer {settings.supabase_service_key}'
        elif settings.supabase_anon_key:
            headers['Authorization'] = f'Bearer {settings.supabase_anon_key}'
            
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Download failed: Status {response.status}, Error: {error_text}")
                    raise Exception(f"Failed to download file: {response.status}")
                    
                # Write content to temp file
                content = await response.read()
                temp_file.write(content)
                temp_file.close()
                
        logger.info(f"File downloaded to: {temp_file.name}")
        return temp_file.name
        
    except Exception as e:
        logger.error(f"Error downloading file: {e}")
        raise


def get_mime_type(file_path: str) -> Optional[str]:
    """
    Get MIME type of a file.
    
    Args:
        file_path: Path to the file
        
    Returns:
        MIME type string or None
    """
    mime_type, _ = mimetypes.guess_type(file_path)
    return mime_type or 'application/octet-stream'