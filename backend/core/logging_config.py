"""Structured logging configuration"""
import logging
import sys
from pythonjsonlogger import jsonlogger
import structlog
from datetime import datetime

def setup_logging():
    """Configure structured logging for the application"""
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Create console handler with JSON formatter
    console_handler = logging.StreamHandler(sys.stdout)
    
    # JSON formatter for structured logs
    json_formatter = jsonlogger.JsonFormatter(
        '%(timestamp)s %(level)s %(name)s %(message)s',
        timestamp=True
    )
    console_handler.setFormatter(json_formatter)
    
    # Add handler to root logger
    root_logger.addHandler(console_handler)
    
    # Configure structlog
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )
    
    # Set up application logger
    logger = structlog.get_logger("support_management")
    logger.info("logging_configured", level="INFO", format="JSON")
    
    return logger

def get_logger(name: str = "support_management"):
    """Get a structured logger instance"""
    return structlog.get_logger(name)
