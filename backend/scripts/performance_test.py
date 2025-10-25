#!/usr/bin/env python3
"""Performance testing script for API endpoints"""
import sys
import os
import requests
import time
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# Add parent directory to path to import modules
sys.path.append(str(Path(__file__).parent.parent))

from core.logging_config import setup_logging, get_logger

def make_request(url, headers=None, timeout=10):
    """Make a single HTTP request and return timing data"""
    start_time = time.time()
    try:
        response = requests.get(url, headers=headers, timeout=timeout)
        end_time = time.time()
        
        return {
            "status_code": response.status_code,
            "response_time": end_time - start_time,
            "success": response.status_code == 200,
            "error": None
        }
    except Exception as e:
        end_time = time.time()
        return {
            "status_code": None,
            "response_time": end_time - start_time,
            "success": False,
            "error": str(e)
        }

def test_endpoint_performance(url, num_requests=100, concurrent_requests=10, headers=None):
    """Test endpoint performance with concurrent requests"""
    logger = get_logger("performance_test")
    
    logger.info("performance_test_started", 
        url=url, 
        num_requests=num_requests, 
        concurrent_requests=concurrent_requests
    )
    
    results = []
    
    with ThreadPoolExecutor(max_workers=concurrent_requests) as executor:
        # Submit all requests
        futures = [
            executor.submit(make_request, url, headers) 
            for _ in range(num_requests)
        ]
        
        # Collect results
        for future in as_completed(futures):
            results.append(future.result())
    
    # Calculate statistics
    response_times = [r["response_time"] for r in results]
    successful_requests = [r for r in results if r["success"]]
    failed_requests = [r for r in results if not r["success"]]
    
    stats = {
        "total_requests": num_requests,
        "successful_requests": len(successful_requests),
        "failed_requests": len(failed_requests),
        "success_rate": len(successful_requests) / num_requests * 100,
        "response_times": {
            "min": min(response_times) if response_times else 0,
            "max": max(response_times) if response_times else 0,
            "mean": statistics.mean(response_times) if response_times else 0,
            "median": statistics.median(response_times) if response_times else 0,
            "p95": sorted(response_times)[int(len(response_times) * 0.95)] if response_times else 0,
            "p99": sorted(response_times)[int(len(response_times) * 0.99)] if response_times else 0
        }
    }
    
    logger.info("performance_test_completed", **stats)
    
    return stats

def main():
    """Main performance testing function"""
    setup_logging()
    logger = get_logger("performance_test")
    
    # Get configuration from environment
    backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
    admin_token = os.getenv("ADMIN_SECRET_KEY", "test-secret")
    
    headers = {"X-Admin-Token": admin_token} if admin_token else None
    
    # Test endpoints
    endpoints = [
        f"{backend_url}/health",
        f"{backend_url}/ready",
        f"{backend_url}/api/workers",
        f"{backend_url}/api/participants",
        f"{backend_url}/api/roster/roster"
    ]
    
    results = {}
    
    for endpoint in endpoints:
        logger.info("testing_endpoint", endpoint=endpoint)
        
        # Test with different concurrency levels
        for concurrent in [1, 5, 10]:
            stats = test_endpoint_performance(
                endpoint, 
                num_requests=50, 
                concurrent_requests=concurrent,
                headers=headers
            )
            
            key = f"{endpoint}_concurrent_{concurrent}"
            results[key] = stats
    
    # Print summary
    print("\n" + "="*80)
    print("PERFORMANCE TEST RESULTS")
    print("="*80)
    
    for endpoint, stats in results.items():
        print(f"\n{endpoint}:")
        print(f"  Success Rate: {stats['success_rate']:.1f}%")
        print(f"  Mean Response Time: {stats['response_times']['mean']:.3f}s")
        print(f"  P95 Response Time: {stats['response_times']['p95']:.3f}s")
        print(f"  P99 Response Time: {stats['response_times']['p99']:.3f}s")
    
    # Check if performance meets requirements
    print("\n" + "="*80)
    print("PERFORMANCE REQUIREMENTS CHECK")
    print("="*80)
    
    requirements_met = True
    
    for endpoint, stats in results.items():
        p95_time = stats['response_times']['p95']
        success_rate = stats['success_rate']
        
        # Requirements: P95 < 1s, success rate > 95%
        if p95_time > 1.0:
            print(f"❌ {endpoint}: P95 response time {p95_time:.3f}s > 1.0s")
            requirements_met = False
        else:
            print(f"✅ {endpoint}: P95 response time {p95_time:.3f}s < 1.0s")
        
        if success_rate < 95.0:
            print(f"❌ {endpoint}: Success rate {success_rate:.1f}% < 95%")
            requirements_met = False
        else:
            print(f"✅ {endpoint}: Success rate {success_rate:.1f}% > 95%")
    
    print(f"\nOverall Performance: {'✅ PASS' if requirements_met else '❌ FAIL'}")
    
    sys.exit(0 if requirements_met else 1)

if __name__ == "__main__":
    main()
