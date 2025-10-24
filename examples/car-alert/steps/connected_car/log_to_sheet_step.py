"""
Logger Event Step
Logs agent results to local JSON file (or Google Sheets if configured)
"""
from pydantic import BaseModel, Field
import os
import json
from datetime import datetime
from pathlib import Path

# Import services (optional for Google Sheets)
import sys

class LogInput(BaseModel):
    """Input for logging to sheets"""
    session_id: str = Field(..., description="Session ID")
    query: str = Field(..., description="User query")
    response: str = Field(..., description="AI response")
    num_chunks_used: int = Field(..., description="Number of chunks used for context")

config = {
    "type": "event",
    "name": "LogToSheet",
    "description": "Logs car alert processing results to Google Sheets",
    "subscribes": ["log-result"],
    "emits": [],
    "input": LogInput.model_json_schema(),
    "flows": ["connected-car-alert"]
}

async def handler(input_data, context):
    """
    Log results to local JSON file or Google Sheets
    - Format the log entry
    - Append to local JSON file (default)
    - Or append to Google Sheets if configured
    """
    try:
        log_input = LogInput(**input_data)
        
        # Prepare log entry
        timestamp = datetime.utcnow().isoformat()
        log_entry = {
            "timestamp": timestamp,
            "session_id": log_input.session_id,
            "query": log_input.query,
            "response": log_input.response,
            "num_chunks_used": log_input.num_chunks_used
        }
        
        # Check if Google Sheets is configured
        use_sheets = (
            os.getenv("GOOGLE_SHEETS_ID") and 
            os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
        )
        
        if use_sheets:
            # Try Google Sheets logging
            try:
                from services.sheets_service import get_sheets_service
                
                context.logger.info("Logging to Google Sheets", {
                    "session_id": log_input.session_id
                })
                
                sheets_service = get_sheets_service()
                sheet_name = os.getenv("GOOGLE_SHEETS_TAB_NAME", "Log")
                
                row_data = [
                    timestamp,
                    log_input.session_id,
                    log_input.query,
                    log_input.response,
                    log_input.num_chunks_used
                ]
                
                result = await sheets_service.append_row(
                    spreadsheet_id=os.getenv("GOOGLE_SHEETS_ID"),
                    sheet_name=sheet_name,
                    values=row_data
                )
                
                if result.get("success"):
                    context.logger.info("Successfully logged to Google Sheets", {
                        "session_id": log_input.session_id,
                        "updated_range": result.get("updated_range")
                    })
                    return
                else:
                    context.logger.error("Failed to log to Google Sheets, falling back to local file", {
                        "error": result.get("error")
                    })
            except Exception as e:
                context.logger.error("Google Sheets logging failed, using local file", {
                    "error": str(e)
                })
        
        # Local JSON file logging (default or fallback)
        context.logger.info("Logging to local JSON file", {
            "session_id": log_input.session_id
        })
        
        # Create logs directory if it doesn't exist
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        
        # Log file path
        log_file = log_dir / "car_alerts.json"
        
        # Read existing logs
        logs = []
        if log_file.exists():
            try:
                with open(log_file, "r") as f:
                    logs = json.load(f)
            except json.JSONDecodeError:
                context.logger.error("Existing log file is corrupted, starting fresh")
                logs = []
        
        # Append new log
        logs.append(log_entry)
        
        # Write back to file
        with open(log_file, "w") as f:
            json.dump(logs, f, indent=2)
        
        context.logger.info("Successfully logged to local file", {
            "session_id": log_input.session_id,
            "log_file": str(log_file),
            "total_logs": len(logs)
        })
        
    except Exception as e:
        context.logger.error("Logging failed", {
            "error": str(e),
            "session_id": input_data.get("session_id")
        })
        # Don't raise - logging failure shouldn't break the workflow

