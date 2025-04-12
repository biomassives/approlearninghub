import os
import json
import argparse
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import List, Dict, Any

# Load environment variables from .env file
load_dotenv()

class SupabaseDataMigrator:
    def __init__(
        self,
        source_url: str,
        source_key: str,
        dest_url: str,
        dest_key: str,
    ):
        """Initialize with source and destination Supabase credentials."""
        self.source_client = create_client(source_url, source_key)
        self.dest_client = create_client(dest_url, dest_key)
        
    def get_tables(self, client: Client) -> List[str]:
        """Get list of tables from database."""
        # Note: this is a simple approach and might need to be adjusted
        # depending on your Supabase configuration
        response = client.table("pg_tables").select("tablename").execute()
        
        if response.data:
            # Filter out system tables (those starting with 'pg_' or 'information_schema')
            tables = [
                table["tablename"] for table in response.data 
                if not table["tablename"].startswith(("pg_", "information_schema"))
            ]
            return tables
        return []
    
    def get_table_data(self, table_name: str) -> List[Dict[str, Any]]:
        """Get all data from a specific table in the source database."""
        response = self.source_client.table(table_name).select("*").execute()
        if response.data:
            return response.data
        return []
    
    def insert_data(self, table_name: str, data: List[Dict[str, Any]]) -> bool:
        """Insert data into destination database table."""
        if not data:
            print(f"No data to insert for table: {table_name}")
            return True
        
        try:
            response = self.dest_client.table(table_name).insert(data).execute()
            if hasattr(response, 'error') and response.error:
                print(f"Error inserting into {table_name}: {response.error}")
                return False
            return True
        except Exception as e:
            print(f"Exception inserting into {table_name}: {str(e)}")
            return False
    
    def backup_to_json(self, table_name: str, data: List[Dict[str, Any]], backup_dir: str = "backups") -> None:
        """Backup table data to a JSON file."""
        os.makedirs(backup_dir, exist_ok=True)
        
        filename = os.path.join(backup_dir, f"{table_name}.json")
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"Backed up {table_name} data to {filename}")
    
    def migrate_table(self, table_name: str, backup: bool = True) -> bool:
        """Migrate data from one table to another, optionally creating a backup."""
        print(f"Migrating table: {table_name}")
        
        # Get data from source
        data = self.get_table_data(table_name)
        print(f"Retrieved {len(data)} records from {table_name}")
        
        # Backup data if requested
        if backup:
            self.backup_to_json(table_name, data)
        
        # Insert into destination
        return self.insert_data(table_name, data)
    
    def migrate_all_tables(self, tables: List[str] = None, backup: bool = True) -> Dict[str, bool]:
        """Migrate all tables or a specified list of tables."""
        results = {}
        
        if not tables:
            tables = self.get_tables(self.source_client)
        
        for table in tables:
            results[table] = self.migrate_table(table, backup)
        
        return results


def main():
    parser = argparse.ArgumentParser(description="Migrate data between Supabase databases")
    parser.add_argument("--source-url", help="Source Supabase URL")
    parser.add_argument("--source-key", help="Source Supabase API key")
    parser.add_argument("--dest-url", help="Destination Supabase URL")
    parser.add_argument("--dest-key", help="Destination Supabase API key")
    parser.add_argument("--tables", nargs="+", help="Specific tables to migrate (default: all)")
    parser.add_argument("--no-backup", action="store_true", help="Skip JSON backup")
    
    args = parser.parse_args()
    
    # Use command line args or environment variables
    source_url = args.source_url or os.getenv("SOURCE_SUPABASE_URL")
    source_key = args.source_key or os.getenv("SOURCE_SUPABASE_KEY")
    dest_url = args.dest_url or os.getenv("DEST_SUPABASE_URL")
    dest_key = args.dest_key or os.getenv("DEST_SUPABASE_KEY")
    
    if not all([source_url, source_key, dest_url, dest_key]):
        print("Error: Missing Supabase credentials. Provide them via arguments or environment variables.")
        parser.print_help()
        return
    
    migrator = SupabaseDataMigrator(source_url, source_key, dest_url, dest_key)
    results = migrator.migrate_all_tables(args.tables, not args.no_backup)
    
    # Print summary
    success = sum(1 for result in results.values() if result)
    print(f"\nMigration complete: {success}/{len(results)} tables migrated successfully")
    
    if success < len(results):
        print("Failed tables:")
        for table, result in results.items():
            if not result:
                print(f"  - {table}")


if __name__ == "__main__":
    main()
