"""Performance monitoring and metrics collection"""
import time
import psutil
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from collections import defaultdict, deque
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class PerformanceMetrics:
    """Performance metrics data structure"""
    timestamp: datetime
    endpoint: str
    method: str
    response_time: float
    status_code: int
    memory_usage: float
    cpu_usage: float
    active_connections: int

class PerformanceMonitor:
    """Performance monitoring system"""
    
    def __init__(self, max_history: int = 1000):
        self.max_history = max_history
        self.metrics_history = deque(maxlen=max_history)
        self.endpoint_stats = defaultdict(lambda: {
            'count': 0,
            'total_time': 0.0,
            'avg_time': 0.0,
            'min_time': float('inf'),
            'max_time': 0.0,
            'error_count': 0,
            'last_updated': datetime.now()
        })
        self.system_stats = {
            'memory_usage': deque(maxlen=100),
            'cpu_usage': deque(maxlen=100),
            'active_connections': deque(maxlen=100)
        }
    
    async def record_request(self, endpoint: str, method: str, 
                           response_time: float, status_code: int):
        """Record a request's performance metrics"""
        try:
            # Get system metrics
            memory_usage = psutil.virtual_memory().percent
            cpu_usage = psutil.cpu_percent()
            active_connections = len(psutil.net_connections())
            
            # Create metrics record
            metrics = PerformanceMetrics(
                timestamp=datetime.now(),
                endpoint=endpoint,
                method=method,
                response_time=response_time,
                status_code=status_code,
                memory_usage=memory_usage,
                cpu_usage=cpu_usage,
                active_connections=active_connections
            )
            
            # Store in history
            self.metrics_history.append(metrics)
            
            # Update endpoint statistics
            self._update_endpoint_stats(endpoint, response_time, status_code)
            
            # Update system statistics
            self._update_system_stats(memory_usage, cpu_usage, active_connections)
            
        except Exception as e:
            logger.error(f"Error recording performance metrics: {e}")
    
    def _update_endpoint_stats(self, endpoint: str, response_time: float, status_code: int):
        """Update endpoint-specific statistics"""
        stats = self.endpoint_stats[endpoint]
        stats['count'] += 1
        stats['total_time'] += response_time
        stats['avg_time'] = stats['total_time'] / stats['count']
        stats['min_time'] = min(stats['min_time'], response_time)
        stats['max_time'] = max(stats['max_time'], response_time)
        stats['last_updated'] = datetime.now()
        
        if status_code >= 400:
            stats['error_count'] += 1
    
    def _update_system_stats(self, memory_usage: float, cpu_usage: float, active_connections: int):
        """Update system-wide statistics"""
        self.system_stats['memory_usage'].append(memory_usage)
        self.system_stats['cpu_usage'].append(cpu_usage)
        self.system_stats['active_connections'].append(active_connections)
    
    def get_endpoint_performance(self, endpoint: Optional[str] = None) -> Dict[str, Any]:
        """Get performance statistics for endpoints"""
        if endpoint:
            return dict(self.endpoint_stats.get(endpoint, {}))
        
        return {
            endpoint: dict(stats) 
            for endpoint, stats in self.endpoint_stats.items()
        }
    
    def get_system_performance(self) -> Dict[str, Any]:
        """Get system-wide performance statistics"""
        return {
            'memory': {
                'current': self.system_stats['memory_usage'][-1] if self.system_stats['memory_usage'] else 0,
                'average': sum(self.system_stats['memory_usage']) / len(self.system_stats['memory_usage']) if self.system_stats['memory_usage'] else 0,
                'max': max(self.system_stats['memory_usage']) if self.system_stats['memory_usage'] else 0
            },
            'cpu': {
                'current': self.system_stats['cpu_usage'][-1] if self.system_stats['cpu_usage'] else 0,
                'average': sum(self.system_stats['cpu_usage']) / len(self.system_stats['cpu_usage']) if self.system_stats['cpu_usage'] else 0,
                'max': max(self.system_stats['cpu_usage']) if self.system_stats['cpu_usage'] else 0
            },
            'connections': {
                'current': self.system_stats['active_connections'][-1] if self.system_stats['active_connections'] else 0,
                'average': sum(self.system_stats['active_connections']) / len(self.system_stats['active_connections']) if self.system_stats['active_connections'] else 0,
                'max': max(self.system_stats['active_connections']) if self.system_stats['active_connections'] else 0
            }
        }
    
    def get_slow_queries(self, threshold: float = 1.0) -> list:
        """Get queries that took longer than threshold seconds"""
        return [
            {
                'endpoint': metrics.endpoint,
                'method': metrics.method,
                'response_time': metrics.response_time,
                'timestamp': metrics.timestamp.isoformat()
            }
            for metrics in self.metrics_history
            if metrics.response_time > threshold
        ]
    
    def get_error_rate(self, endpoint: Optional[str] = None) -> float:
        """Get error rate for endpoint or overall"""
        if endpoint:
            stats = self.endpoint_stats.get(endpoint, {})
            total_requests = stats.get('count', 0)
            errors = stats.get('error_count', 0)
            return (errors / total_requests * 100) if total_requests > 0 else 0
        
        total_requests = sum(stats['count'] for stats in self.endpoint_stats.values())
        total_errors = sum(stats['error_count'] for stats in self.endpoint_stats.values())
        return (total_errors / total_requests * 100) if total_requests > 0 else 0
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get comprehensive performance summary"""
        return {
            'timestamp': datetime.now().isoformat(),
            'total_requests': sum(stats['count'] for stats in self.endpoint_stats.values()),
            'error_rate': self.get_error_rate(),
            'system_performance': self.get_system_performance(),
            'top_slow_endpoints': sorted(
                [(endpoint, stats['avg_time']) for endpoint, stats in self.endpoint_stats.items()],
                key=lambda x: x[1],
                reverse=True
            )[:5],
            'recent_slow_queries': self.get_slow_queries(threshold=0.5)[-10:]
        }

# Global performance monitor instance
performance_monitor = PerformanceMonitor()
