"""
Google Sheets service for logging data
"""
from google.oauth2.credentials import Credentials
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import os
import json
from typing import List, Any, Dict

class SheetsService:
    def __init__(self):
        """Initialize Google Sheets service with credentials"""
        # Try service account first
        service_account_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
        
        if service_account_json:
            # Parse service account JSON
            try:
                service_account_info = json.loads(service_account_json)
            except json.JSONDecodeError as e:
                raise ValueError(
                    f"Invalid GOOGLE_SERVICE_ACCOUNT_JSON format: {str(e)}. "
                    f"Make sure it's valid JSON with double quotes. "
                    f"Error at position {e.pos}: {service_account_json[max(0, e.pos-50):e.pos+50]}"
                )
            
            credentials = service_account.Credentials.from_service_account_info(
                service_account_info,
                scopes=['https://www.googleapis.com/auth/spreadsheets']
            )
        else:
            # Fallback to OAuth credentials (if you have them)
            # This would require a more complex OAuth flow
            raise ValueError(
                "GOOGLE_SERVICE_ACCOUNT_JSON environment variable is required. "
                "Please provide a service account JSON credential."
            )
        
        self.service = build('sheets', 'v4', credentials=credentials)
    
    async def append_row(
        self, 
        spreadsheet_id: str, 
        sheet_name: str, 
        values: List[Any]
    ) -> Dict[str, Any]:
        """
        Append a row to a Google Sheet
        
        Args:
            spreadsheet_id: The ID of the spreadsheet
            sheet_name: The name of the sheet/tab
            values: List of values to append as a row
        
        Returns:
            Response from the Sheets API
        """
        try:
            range_name = f"{sheet_name}!A:Z"
            
            body = {
                'values': [values]
            }
            
            result = self.service.spreadsheets().values().append(
                spreadsheetId=spreadsheet_id,
                range=range_name,
                valueInputOption='RAW',
                insertDataOption='INSERT_ROWS',
                body=body
            ).execute()
            
            return {
                'success': True,
                'updated_range': result.get('updates', {}).get('updatedRange'),
                'updated_rows': result.get('updates', {}).get('updatedRows')
            }
            
        except HttpError as error:
            return {
                'success': False,
                'error': str(error)
            }
    
    async def append_rows(
        self, 
        spreadsheet_id: str, 
        sheet_name: str, 
        rows: List[List[Any]]
    ) -> Dict[str, Any]:
        """
        Append multiple rows to a Google Sheet
        
        Args:
            spreadsheet_id: The ID of the spreadsheet
            sheet_name: The name of the sheet/tab
            rows: List of rows, where each row is a list of values
        
        Returns:
            Response from the Sheets API
        """
        try:
            range_name = f"{sheet_name}!A:Z"
            
            body = {
                'values': rows
            }
            
            result = self.service.spreadsheets().values().append(
                spreadsheetId=spreadsheet_id,
                range=range_name,
                valueInputOption='RAW',
                insertDataOption='INSERT_ROWS',
                body=body
            ).execute()
            
            return {
                'success': True,
                'updated_range': result.get('updates', {}).get('updatedRange'),
                'updated_rows': result.get('updates', {}).get('updatedRows')
            }
            
        except HttpError as error:
            return {
                'success': False,
                'error': str(error)
            }

# Singleton instance
_sheets_service = None

def get_sheets_service() -> SheetsService:
    """Get or create Sheets service instance"""
    global _sheets_service
    if _sheets_service is None:
        _sheets_service = SheetsService()
    return _sheets_service

