#!/usr/bin/env python3
"""Security audit script for the application"""
import sys
import os
import requests
import json
from pathlib import Path

# Add parent directory to path to import modules
sys.path.append(str(Path(__file__).parent.parent))

from core.logging_config import setup_logging, get_logger

def check_authentication(base_url="http://localhost:8000"):
    """Check if authentication is properly configured"""
    logger = get_logger("security_audit")
    
    # Test endpoints that should require authentication
    protected_endpoints = [
        f"{base_url}/api/workers",
        f"{base_url}/api/roster/roster"
    ]
    
    results = {}
    
    for endpoint in protected_endpoints:
        logger.info("testing_endpoint_auth", endpoint=endpoint)
        
        # Test without authentication (should fail)
        try:
            response = requests.post(endpoint, json={}, timeout=5)
            results[endpoint] = {
                "requires_auth": response.status_code == 401,
                "status_code": response.status_code,
                "error": None
            }
        except Exception as e:
            results[endpoint] = {
                "requires_auth": False,
                "status_code": None,
                "error": str(e)
            }
    
    return results

def check_cors_configuration(base_url="http://localhost:8000"):
    """Check CORS configuration"""
    logger = get_logger("security_audit")
    
    # Test CORS headers
    try:
        response = requests.options(f"{base_url}/api/workers", timeout=5)
        cors_headers = {
            "access-control-allow-origin": response.headers.get("Access-Control-Allow-Origin"),
            "access-control-allow-methods": response.headers.get("Access-Control-Allow-Methods"),
            "access-control-allow-headers": response.headers.get("Access-Control-Allow-Headers"),
            "access-control-allow-credentials": response.headers.get("Access-Control-Allow-Credentials")
        }
        
        logger.info("cors_headers_check", **cors_headers)
        
        # Check if CORS is too permissive
        allow_origin = cors_headers.get("access-control-allow-origin")
        is_wildcard = allow_origin == "*"
        
        return {
            "cors_configured": bool(allow_origin),
            "is_wildcard": is_wildcard,
            "headers": cors_headers,
            "secure": not is_wildcard
        }
    except Exception as e:
        logger.error("cors_check_failed", error=str(e))
        return {
            "cors_configured": False,
            "is_wildcard": False,
            "headers": {},
            "secure": False,
            "error": str(e)
        }

def check_rate_limiting(base_url="http://localhost:8000"):
    """Check if rate limiting is working"""
    logger = get_logger("security_audit")
    
    # Make multiple rapid requests to test rate limiting
    endpoint = f"{base_url}/api/workers"
    responses = []
    
    for i in range(35):  # Should trigger rate limit
        try:
            response = requests.get(endpoint, timeout=2)
            responses.append({
                "status_code": response.status_code,
                "rate_limited": response.status_code == 429
            })
        except Exception as e:
            responses.append({
                "status_code": None,
                "rate_limited": False,
                "error": str(e)
            })
    
    rate_limited_responses = [r for r in responses if r.get("rate_limited")]
    
    return {
        "rate_limiting_active": len(rate_limited_responses) > 0,
        "total_requests": len(responses),
        "rate_limited_requests": len(rate_limited_responses),
        "rate_limit_threshold": 30  # Expected threshold
    }

def check_health_endpoints(base_url="http://localhost:8000"):
    """Check if health endpoints are working"""
    logger = get_logger("security_audit")
    
    endpoints = [
        f"{base_url}/health",
        f"{base_url}/ready"
    ]
    
    results = {}
    
    for endpoint in endpoints:
        try:
            response = requests.get(endpoint, timeout=5)
            results[endpoint] = {
                "accessible": response.status_code == 200,
                "status_code": response.status_code,
                "response_time": response.elapsed.total_seconds(),
                "error": None
            }
        except Exception as e:
            results[endpoint] = {
                "accessible": False,
                "status_code": None,
                "response_time": None,
                "error": str(e)
            }
    
    return results

def check_error_handling(base_url="http://localhost:8000"):
    """Check error handling and information disclosure"""
    logger = get_logger("security_audit")
    
    # Test with invalid data to check error responses
    test_cases = [
        {
            "endpoint": f"{base_url}/api/workers",
            "method": "POST",
            "data": {"invalid": "data"},
            "expected_status": [400, 401, 422]
        },
        {
            "endpoint": f"{base_url}/api/workers/nonexistent",
            "method": "GET",
            "data": None,
            "expected_status": [404, 401]
        }
    ]
    
    results = {}
    
    for test_case in test_cases:
        try:
            if test_case["method"] == "POST":
                response = requests.post(
                    test_case["endpoint"], 
                    json=test_case["data"], 
                    timeout=5
                )
            else:
                response = requests.get(test_case["endpoint"], timeout=5)
            
            # Check if error response contains sensitive information
            response_text = response.text.lower()
            sensitive_keywords = ["password", "secret", "key", "token", "database"]
            contains_sensitive = any(keyword in response_text for keyword in sensitive_keywords)
            
            results[test_case["endpoint"]] = {
                "status_code": response.status_code,
                "expected_status": test_case["expected_status"],
                "status_appropriate": response.status_code in test_case["expected_status"],
                "contains_sensitive_info": contains_sensitive,
                "response_length": len(response.text)
            }
        except Exception as e:
            results[test_case["endpoint"]] = {
                "error": str(e),
                "status_code": None
            }
    
    return results

def main():
    """Main security audit function"""
    setup_logging()
    logger = get_logger("security_audit")
    
    # Get backend URL from environment
    backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
    
    logger.info("security_audit_started", backend_url=backend_url)
    
    # Run security checks
    auth_results = check_authentication(backend_url)
    cors_results = check_cors_configuration(backend_url)
    rate_limit_results = check_rate_limiting(backend_url)
    health_results = check_health_endpoints(backend_url)
    error_handling_results = check_error_handling(backend_url)
    
    # Compile results
    audit_results = {
        "timestamp": str(Path(__file__).stat().st_mtime),
        "backend_url": backend_url,
        "authentication": auth_results,
        "cors": cors_results,
        "rate_limiting": rate_limit_results,
        "health_endpoints": health_results,
        "error_handling": error_handling_results
    }
    
    # Calculate security score
    security_score = 0
    total_checks = 0
    
    # Authentication check
    total_checks += 1
    if all(result.get("requires_auth", False) for result in auth_results.values()):
        security_score += 1
    
    # CORS check
    total_checks += 1
    if cors_results.get("secure", False):
        security_score += 1
    
    # Rate limiting check
    total_checks += 1
    if rate_limit_results.get("rate_limiting_active", False):
        security_score += 1
    
    # Health endpoints check
    total_checks += 1
    if all(result.get("accessible", False) for result in health_results.values()):
        security_score += 1
    
    # Error handling check
    total_checks += 1
    if all(
        result.get("status_appropriate", False) and 
        not result.get("contains_sensitive_info", False)
        for result in error_handling_results.values()
        if "status_appropriate" in result
    ):
        security_score += 1
    
    security_percentage = (security_score / total_checks) * 100
    
    audit_results["security_score"] = {
        "score": security_score,
        "total_checks": total_checks,
        "percentage": security_percentage,
        "grade": "A" if security_percentage >= 90 else "B" if security_percentage >= 80 else "C" if security_percentage >= 70 else "D"
    }
    
    # Print results
    print(json.dumps(audit_results, indent=2))
    
    logger.info("security_audit_completed", 
        security_score=security_score,
        total_checks=total_checks,
        percentage=security_percentage
    )
    
    # Exit with appropriate code
    sys.exit(0 if security_percentage >= 80 else 1)

if __name__ == "__main__":
    main()
