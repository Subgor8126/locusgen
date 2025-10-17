"""
Main project views
"""

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
import json


@require_http_methods(["GET"])
def health_check(request):
    """
    Simple health check endpoint
    """
    return JsonResponse({
        "status": "healthy",
        "message": "LocusGen API is running"
    })


@csrf_exempt
def debug_view(request):
    """
    Debug endpoint to check request details
    """
    headers = {}
    for key, value in request.META.items():
        if key.startswith('HTTP_'):
            headers[key[5:].replace('_', '-')] = value
    
    return JsonResponse({
        "method": request.method,
        "path": request.path,
        "user_authenticated": request.user.is_authenticated,
        "user": str(request.user) if request.user.is_authenticated else "AnonymousUser",
        "headers": headers,
        "cors_origin": request.META.get('HTTP_ORIGIN', 'No Origin header'),
        "content_type": request.META.get('CONTENT_TYPE', 'No Content-Type'),
        "query_params": dict(request.GET),
        "session_key": request.session.session_key,
    })