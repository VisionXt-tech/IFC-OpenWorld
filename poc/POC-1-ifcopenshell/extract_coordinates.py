#!/usr/bin/env python3
"""
POC-1: IFC Coordinate Extraction with IfcOpenShell

This script validates that we can extract geographic coordinates from IFC files
using the IfcOpenShell library.

Usage:
    python extract_coordinates.py [ifc_file_path]
    python extract_coordinates.py  # Processes all files in sample_files/

Expected output:
    [OK] File: building.ifc
       Coordinates: (lat, lon, elevation)
       Processing time: X.XXs
"""

import sys
import time
import json
from pathlib import Path
from typing import Optional, Tuple

try:
    import ifcopenshell
    from colorama import init, Fore, Style
    init()  # Initialize colorama for Windows
except ImportError as e:
    print(f"[FAIL] Error importing dependencies: {e}")
    print("\n[SETUP] Please install requirements:")
    print("   pip install -r requirements.txt")
    sys.exit(1)


def dms_to_decimal(degrees: int, minutes: int, seconds: int, milliseconds: int = 0) -> float:
    """
    Convert DMS (Degrees, Minutes, Seconds) to decimal degrees.

    IFC format: IfcCompoundPlaneAngleMeasure = (degrees, minutes, seconds, milliseconds)
    Example: (41, 53, 24, 800000) → 41.890222°

    Args:
        degrees: Integer degrees
        minutes: Integer minutes (0-59)
        seconds: Integer seconds (0-59)
        milliseconds: Integer microseconds (0-999999)

    Returns:
        Decimal degrees as float
    """
    decimal = abs(degrees) + minutes / 60.0 + seconds / 3600.0 + milliseconds / 3600000000.0
    return decimal if degrees >= 0 else -decimal


def extract_site_coordinates(ifc_file_path: str) -> Optional[Tuple[float, float, Optional[float]]]:
    """
    Extract geographic coordinates from IfcSite entity.

    Args:
        ifc_file_path: Path to IFC file

    Returns:
        Tuple of (latitude, longitude, elevation) or None if no IfcSite found
    """
    start_time = time.time()

    print(f"\n{Fore.CYAN}[FILE] Processing: {Path(ifc_file_path).name}{Style.RESET_ALL}")

    try:
        # Open IFC file
        ifc_file = ifcopenshell.open(ifc_file_path)
        print(f"   IFC Schema: {ifc_file.schema}")

        # Find IfcSite entities
        sites = ifc_file.by_type("IfcSite")

        if not sites:
            print(f"   {Fore.YELLOW}[WARN]  No IfcSite found in this file{Style.RESET_ALL}")
            return None

        # Use first site (most IFC files have only 1 site)
        site = sites[0]
        print(f"   Site Name: {site.Name or 'Unnamed'}")

        # Extract coordinates
        ref_latitude = site.RefLatitude
        ref_longitude = site.RefLongitude
        ref_elevation = site.RefElevation

        if not ref_latitude or not ref_longitude:
            print(f"   {Fore.YELLOW}[WARN]  IfcSite found but missing RefLatitude/RefLongitude{Style.RESET_ALL}")
            return None

        # Convert DMS to decimal
        # IFC format: tuple of (degrees, minutes, seconds, microseconds)
        lat_decimal = dms_to_decimal(*ref_latitude)
        lon_decimal = dms_to_decimal(*ref_longitude)
        elevation = ref_elevation if ref_elevation else None

        # Validate coordinate ranges
        if not (-90 <= lat_decimal <= 90):
            print(f"   {Fore.RED}[FAIL] Invalid latitude: {lat_decimal} (must be -90 to +90){Style.RESET_ALL}")
            return None

        if not (-180 <= lon_decimal <= 180):
            print(f"   {Fore.RED}[FAIL] Invalid longitude: {lon_decimal} (must be -180 to +180){Style.RESET_ALL}")
            return None

        # Success!
        elapsed = time.time() - start_time

        print(f"   {Fore.GREEN}[OK] Coordinates extracted successfully{Style.RESET_ALL}")
        print(f"   [LOC]  Latitude:  {lat_decimal:.6f}")
        print(f"   [LOC]  Longitude: {lon_decimal:.6f}")
        if elevation:
            print(f"   [LOC]  Elevation: {elevation:.2f}m")
        print(f"   [TIME] Processing time: {elapsed:.2f}s")

        # Performance check
        file_size_mb = Path(ifc_file_path).stat().st_size / (1024 * 1024)
        print(f"   [SIZE] File size: {file_size_mb:.2f} MB")

        if elapsed > 5.0:
            print(f"   {Fore.YELLOW}[WARN]  WARNING: Processing time exceeds 5s threshold{Style.RESET_ALL}")

        return (lat_decimal, lon_decimal, elevation)

    except Exception as e:
        elapsed = time.time() - start_time
        print(f"   {Fore.RED}[FAIL] Error: {str(e)}{Style.RESET_ALL}")
        print(f"   [TIME]  Failed after: {elapsed:.2f}s")
        return None


def main():
    """Main execution function"""
    print(f"{Fore.CYAN}{'='*60}")
    print("POC-1: IFC Coordinate Extraction Validation")
    print(f"{'='*60}{Style.RESET_ALL}\n")

    # Check if specific file provided or scan directory
    if len(sys.argv) > 1:
        ifc_files = [sys.argv[1]]
    else:
        sample_dir = Path(__file__).parent / "sample_files"
        if not sample_dir.exists():
            print(f"{Fore.RED}[FAIL] Error: sample_files/ directory not found{Style.RESET_ALL}")
            print("\n[DIR] Please create sample_files/ and add IFC test files")
            print("   Download from: https://github.com/buildingSMART/Sample-Test-Files")
            sys.exit(1)

        ifc_files = list(sample_dir.glob("*.ifc"))

        if not ifc_files:
            print(f"{Fore.YELLOW}[WARN]  No .ifc files found in sample_files/{Style.RESET_ALL}")
            print("\n[FILES] Please add IFC files to test")
            sys.exit(1)

    # Process all files
    results = []
    success_count = 0

    for ifc_file in ifc_files:
        coords = extract_site_coordinates(str(ifc_file))
        results.append({
            "file": Path(ifc_file).name,
            "success": coords is not None,
            "coordinates": coords
        })
        if coords:
            success_count += 1

    # Summary
    print(f"\n{Fore.CYAN}{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}{Style.RESET_ALL}\n")

    print(f"Files processed: {len(results)}")
    print(f"[OK] Successful extractions: {success_count}")
    print(f"[FAIL] Failed extractions: {len(results) - success_count}")

    # Export results to JSON
    output_file = Path(__file__).parent / "extraction_results.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)

    print(f"\n[SAVE] Results saved to: {output_file}")

    # Decision
    success_rate = success_count / len(results) if results else 0

    if success_rate >= 0.66:  # At least 2/3 files successful
        print(f"\n{Fore.GREEN}{'='*60}")
        print("[OK] POC-1 PASS - IfcOpenShell validation successful!")
        print(f"{'='*60}{Style.RESET_ALL}")
        print("\n[NEXT] Next step: Document findings in RESULTS.md")
        print("[NEXT] Then proceed to POC-2 (Cesium viewer)")
    else:
        print(f"\n{Fore.RED}{'='*60}")
        print("[FAIL] POC-1 FAIL - Consider alternative IFC parsers")
        print(f"{'='*60}{Style.RESET_ALL}")
        print("\n[NEXT] Document issues in RESULTS.md")
        print("[NEXT] Consider alternatives: IFC.js, ifc-pipeline")


if __name__ == "__main__":
    main()
