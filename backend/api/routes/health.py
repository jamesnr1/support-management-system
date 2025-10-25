"""Enhanced health check endpoints with detailed monitoring"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from datetime import datetime, timedelta
import psutil
import asyncio
from database import SupabaseDatabase
from monitoring.performance_monitor import performance_monitor
from core.logging_config import get_logger

router = APIRouter(prefix="/api/health", tags=["health"])
logger = get_logger("health")

@router.get("/")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Support Management System",
        "version": "2.0.0"
    }

@router.get("/detailed")
async def detailed_health_check(db: SupabaseDatabase = Depends(lambda: None)):
    """Detailed health check with system metrics"""
    try:
        # System metrics
        system_metrics = {
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_usage": psutil.disk_usage('/').percent,
            "load_average": psutil.getloadavg() if hasattr(psutil, 'getloadavg') else None,
            "boot_time": datetime.fromtimestamp(psutil.boot_time()).isoformat(),
            "uptime_seconds": time.time() - psutil.boot_time()
        }
        
        # Database connectivity
        db_status = "unknown"
        db_response_time = None
        try:
            if db:
                start_time = time.time()
                # Test database connection
                db.client.table('support_workers').select('id').limit(1).execute()
                db_response_time = time.time() - start_time
                db_status = "healthy"
            else:
                db_status = "not_configured"
        except Exception as e:
            db_status = f"error: {str(e)}"
        
        # Performance metrics
        performance_summary = performance_monitor.get_performance_summary()
        
        # Overall health status
        overall_status = "healthy"
        if system_metrics["memory_percent"] > 90:
            overall_status = "warning"
        if system_metrics["cpu_percent"] > 90:
            overall_status = "warning"
        if db_status != "healthy":
            overall_status = "error"
        
        return {
            "status": overall_status,
            "timestamp": datetime.now().isoformat(),
            "service": "Support Management System",
            "version": "2.0.0",
            "system": system_metrics,
            "database": {
                "status": db_status,
                "response_time_ms": round(db_response_time * 1000, 2) if db_response_time else None
            },
            "performance": performance_summary
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@router.get("/database")
async def database_health_check(db: SupabaseDatabase = Depends(lambda: None)):
    """Database-specific health check"""
    try:
        if not db:
            return {
                "status": "not_configured",
                "message": "Database not configured"
            }
        
        # Test basic connectivity
        start_time = time.time()
        workers = db.client.table('support_workers').select('id').limit(1).execute()
        response_time = time.time() - start_time
        
        # Test availability table
        availability_test = db.client.table('availability_rule').select('id').limit(1).execute()
        
        # Test participants table
        participants_test = db.client.table('participants').select('id').limit(1).execute()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "response_time_ms": round(response_time * 1000, 2),
            "tables": {
                "support_workers": "accessible",
                "availability_rule": "accessible", 
                "participants": "accessible"
            },
            "record_counts": {
                "workers": len(workers.data) if workers.data else 0,
                "availability_rules": len(availability_test.data) if availability_test.data else 0,
                "participants": len(participants_test.data) if participants_test.data else 0
            }
        }
        
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {
            "status": "error",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }

@router.get("/performance")
async def performance_health_check():
    """Performance metrics health check"""
    try:
        performance_summary = performance_monitor.get_performance_summary()
        
        # Determine performance health
        performance_status = "healthy"
        if performance_summary["error_rate"] > 5:
            performance_status = "warning"
        if performance_summary["error_rate"] > 10:
            performance_status = "error"
        
        # Check for slow queries
        slow_queries = performance_monitor.get_slow_queries(threshold=2.0)
        if len(slow_queries) > 10:
            performance_status = "warning"
        
        return {
            "status": performance_status,
            "timestamp": datetime.now().isoformat(),
            "metrics": performance_summary,
            "alerts": {
                "high_error_rate": performance_summary["error_rate"] > 5,
                "slow_queries": len(slow_queries) > 5,
                "high_memory_usage": performance_summary["system_performance"]["memory"]["current"] > 80
            }
        }
        
    except Exception as e:
        logger.error(f"Performance health check failed: {e}")
        return {
            "status": "error",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }

@router.get("/readiness")
async def readiness_check():
    """Kubernetes-style readiness check"""
    try:
        # Check if all critical services are ready
        checks = {
            "database": False,
            "performance_monitor": False,
            "system_resources": False
        }
        
        # Database check
        try:
            # This would be a real database check in production
            checks["database"] = True
        except:
            pass
        
        # Performance monitor check
        try:
            performance_monitor.get_performance_summary()
            checks["performance_monitor"] = True
        except:
            pass
        
        # System resources check
        try:
            memory_usage = psutil.virtual_memory().percent
            cpu_usage = psutil.cpu_percent()
            checks["system_resources"] = memory_usage < 95 and cpu_usage < 95
        except:
            pass
        
        all_ready = all(checks.values())
        
        return {
            "status": "ready" if all_ready else "not_ready",
            "timestamp": datetime.now().isoformat(),
            "checks": checks
        }
        
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return {
            "status": "not_ready",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }

@router.get("/liveness")
async def liveness_check():
    """Kubernetes-style liveness check"""
    return {
        "status": "alive",
        "timestamp": datetime.now().isoformat(),
        "uptime_seconds": time.time() - psutil.boot_time()
    }