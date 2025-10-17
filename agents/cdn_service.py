import json
import boto3
import logging
import requests
import hashlib
from botocore.exceptions import ClientError
from typing import Dict, Any

logger = logging.getLogger(__name__)

class CDNService:
    """Service to process SceneJSON and replace Sketchfab URLs with persistent S3 URLs"""
    
    def __init__(self):
        import os
        
        # Get configuration from environment variables
        aws_region = os.getenv('AWS_REGION', 'us-east-1')
        self.bucket_name = os.getenv('S3_BUCKET_NAME', 'locusgen-3d-models-dev')
        self.table_name = os.getenv('DYNAMODB_TABLE_NAME', 'locusgen-assets-dev')
        
        # Initialize AWS clients
        self.s3_client = boto3.client('s3', region_name=aws_region)
        self.dynamodb = boto3.resource('dynamodb', region_name=aws_region)
        self.table = self.dynamodb.Table(self.table_name)
    
    def process_scene_json(self, scene_json: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process SceneJSON and replace temporary Sketchfab URLs with persistent S3 URLs
        """
        try:
            if not scene_json or 'scene' not in scene_json:
                return scene_json
            
            # Process each object in the scene
            processed_objects = []
            
            for obj in scene_json.get('scene', {}).get('objects', []):
                asset = obj.get('asset', {})
                glb_url = asset.get('glb_url')
                
                if not glb_url:
                    processed_objects.append(obj)
                    continue
                
                # Generate asset ID from Sketchfab model ID or URL hash
                asset_id = asset.get('id') or hashlib.md5(glb_url.encode()).hexdigest()
                
                # Check if already cached in DynamoDB
                try:
                    response = self.table.get_item(Key={'model_id': asset_id})
                    if 'Item' in response:
                        # Use cached URL
                        obj['asset']['glb_url'] = response['Item']['s3_url']
                        processed_objects.append(obj)
                        logger.info(f"Using cached asset: {asset_id}")
                        continue
                except ClientError as e:
                    logger.warning(f"Error checking DynamoDB cache: {e}")
                
                # Download and cache the asset
                try:
                    logger.info(f"Downloading and caching asset: {asset_id}")
                    
                    # Download GLB file
                    response = requests.get(glb_url, timeout=60)
                    response.raise_for_status()
                    asset_data = response.content
                    
                    # Generate S3 key
                    s3_key = f"models/{asset_id}.glb"
                    
                    # Upload to S3
                    self.s3_client.put_object(
                        Bucket=self.bucket_name,
                        Key=s3_key,
                        Body=asset_data,
                        ContentType='model/gltf-binary',
                        CacheControl='public, max-age=31536000'  # 1 year cache
                    )
                    
                    # Generate CDN URL
                    cdn_url = f"https://{self.bucket_name}.s3.amazonaws.com/{s3_key}"
                    
                    # Store in DynamoDB
                    self.table.put_item(
                        Item={
                            'model_id': asset_id,
                            's3_url': cdn_url
                        }
                    )
                    
                    # Update object with CDN URL
                    obj['asset']['glb_url'] = cdn_url
                    processed_objects.append(obj)
                    
                    logger.info(f"Successfully cached asset {asset_id} -> {cdn_url}")
                    
                except Exception as e:
                    logger.error(f"Failed to process asset {asset_id}: {e}")
                    # Keep original URL as fallback
                    processed_objects.append(obj)
            
            # Update scene with processed objects
            scene_json['scene']['objects'] = processed_objects
            
            return scene_json
            
        except Exception as e:
            logger.error(f"Error processing SceneJSON: {e}")
            return scene_json  # Return original on failure