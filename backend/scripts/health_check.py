#!/usr/bin/env python3
"""Health check script for monitoring and alerting"""
import sys
import os
import requests
import json
from datetime import datetime
from pathlib import Path

# Add parent directory to path to import modules
sys.path.append(str(Path(__file__).parent.parent))

from core.logging_config import setup_logging, get_logger

def check_backend_health(base_url="http://localhost:8000"):
    """Check backend health endpoint"""
    try:
        response = requests.get(f"{base_url}/health", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            return {
                "status": "healthy",
                "backend_status": data.get("status"),
                "database_connected": data.get("database", {}).get("connected", False),
                "database_query_healthy": data.get("database", {}).get("can_query", False),
                "version": data.get("version"),
                "environment": data.get("environment"),
                "timestamp": data.get("timestamp")
            }
        else:
            return {
                "status": "unhealthy",
                "error": f"HTTP {response.status_code}",
                "response": response.text
            }
    except requests.exceptions.RequestException as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }

def check_readiness(base_url="http://localhost:8000"):
    """Check backend readiness endpoint"""
    try:
        response = requests.get(f"{base_url}/ready", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            return {
                "status": "ready",
                "timestamp": data.get("timestamp")
            }
        else:
            return {
                "status": "not_ready",
                "error": f"HTTP {response.status_code}"
            }
    except requests.exceptions.RequestException as e:
        return {
            "status": "not_ready",
            "error": str(e)
        }

def main():
    """Main health check function"""
    setup_logging()
    logger = get_logger("health_check")
    
    # Get backend URL from environment or use default
    backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
    
    logger.info("health_check_started", backend_url=backend_url)
    
    # Check health
    health_result = check_backend_health(backend_url)
    logger.info("health_check_result", **health_result)
    
    # Check readiness
    readiness_result = check_readiness(backend_url)
    logger.info("readiness_check_result", **readiness_result)
    
    # Determine overall status
    overall_healthy = (
        health_result.get("status") == "healthy" and
        readiness_result.get("status") == "ready"
    )
    
    # Output results
    results = {
        "overall_status": "healthy" if overall_healthy else "unhealthy",
        "timestamp": datetime.now().isoformat(),
        "health": health_result,
        "readiness": readiness_result
    }
    
    print(json.dumps(results, indent=2))
    
    # Exit with appropriate code
    sys.exit(0 if overall_healthy else 1)

if __name__ == "__main__":
    main()
