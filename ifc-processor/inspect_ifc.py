"""
Script to inspect IFC file structure and metadata
Usage: python inspect_ifc.py <s3_key>
"""
import sys
import os
import tempfile
from app.services.s3_service import download_file_from_s3
import ifcopenshell

def inspect_ifc(s3_key):
    """Download and inspect IFC file from S3"""

    # Download file
    with tempfile.NamedTemporaryFile(suffix='.ifc', delete=False) as tmp_file:
        local_path = tmp_file.name

    print(f"Downloading {s3_key} from S3...")
    download_file_from_s3(s3_key, local_path)
    print(f"Downloaded to {local_path}\n")

    try:
        # Open IFC file
        ifc_file = ifcopenshell.open(local_path)
        print(f"IFC Schema: {ifc_file.schema}\n")

        # Inspect IfcSite
        print("=" * 80)
        print("IfcSite Information:")
        print("=" * 80)
        sites = ifc_file.by_type("IfcSite")
        for i, site in enumerate(sites):
            print(f"\nSite {i+1}:")
            print(f"  Name: {site.Name}")
            print(f"  LongName: {site.LongName if hasattr(site, 'LongName') else 'N/A'}")
            print(f"  Description: {site.Description if hasattr(site, 'Description') else 'N/A'}")
            print(f"  RefLatitude: {site.RefLatitude}")
            print(f"  RefLongitude: {site.RefLongitude}")
            print(f"  RefElevation: {site.RefElevation if hasattr(site, 'RefElevation') else 'N/A'}")

            if site.SiteAddress:
                addr = site.SiteAddress
                print(f"  SiteAddress:")
                print(f"    AddressLines: {addr.AddressLines if hasattr(addr, 'AddressLines') else 'N/A'}")
                print(f"    Town: {addr.Town if hasattr(addr, 'Town') else 'N/A'}")
                print(f"    Region: {addr.Region if hasattr(addr, 'Region') else 'N/A'}")
                print(f"    PostalCode: {addr.PostalCode if hasattr(addr, 'PostalCode') else 'N/A'}")
                print(f"    Country: {addr.Country if hasattr(addr, 'Country') else 'N/A'}")

        # Inspect IfcBuilding
        print("\n" + "=" * 80)
        print("IfcBuilding Information:")
        print("=" * 80)
        buildings = ifc_file.by_type("IfcBuilding")
        for i, building in enumerate(buildings):
            print(f"\nBuilding {i+1}:")
            print(f"  Name: {building.Name}")
            print(f"  LongName: {building.LongName if hasattr(building, 'LongName') else 'N/A'}")
            print(f"  Description: {building.Description if hasattr(building, 'Description') else 'N/A'}")
            print(f"  ElevationOfRefHeight: {building.ElevationOfRefHeight if hasattr(building, 'ElevationOfRefHeight') else 'N/A'}")
            print(f"  ElevationOfTerrain: {building.ElevationOfTerrain if hasattr(building, 'ElevationOfTerrain') else 'N/A'}")

            if building.BuildingAddress:
                addr = building.BuildingAddress
                print(f"  BuildingAddress:")
                print(f"    AddressLines: {addr.AddressLines if hasattr(addr, 'AddressLines') else 'N/A'}")
                print(f"    Town: {addr.Town if hasattr(addr, 'Town') else 'N/A'}")
                print(f"    Region: {addr.Region if hasattr(addr, 'Region') else 'N/A'}")
                print(f"    PostalCode: {addr.PostalCode if hasattr(addr, 'PostalCode') else 'N/A'}")
                print(f"    Country: {addr.Country if hasattr(addr, 'Country') else 'N/A'}")

        # Inspect IfcBuildingStorey
        print("\n" + "=" * 80)
        print("IfcBuildingStorey Information:")
        print("=" * 80)
        storeys = ifc_file.by_type("IfcBuildingStorey")
        print(f"Total Storeys: {len(storeys)}")
        if storeys:
            elevations = []
            for i, storey in enumerate(storeys[:5]):  # Show first 5
                print(f"\nStorey {i+1}:")
                print(f"  Name: {storey.Name}")
                print(f"  LongName: {storey.LongName if hasattr(storey, 'LongName') else 'N/A'}")
                print(f"  Elevation: {storey.Elevation}")
                if storey.Elevation is not None:
                    elevations.append(storey.Elevation)

            if len(storeys) > 5:
                print(f"\n... and {len(storeys) - 5} more storeys")

            if len(elevations) > 1:
                height = max(elevations) - min(elevations)
                print(f"\nCalculated Height: {height:.2f} (from elevations)")

        # Inspect IfcProject
        print("\n" + "=" * 80)
        print("IfcProject Information:")
        print("=" * 80)
        projects = ifc_file.by_type("IfcProject")
        for i, project in enumerate(projects):
            print(f"\nProject {i+1}:")
            print(f"  Name: {project.Name}")
            print(f"  LongName: {project.LongName if hasattr(project, 'LongName') else 'N/A'}")
            print(f"  Description: {project.Description if hasattr(project, 'Description') else 'N/A'}")

        # Look for property sets
        print("\n" + "=" * 80)
        print("Property Sets (Pset_BuildingCommon):")
        print("=" * 80)
        psets = ifc_file.by_type("IfcPropertySet")
        for pset in psets:
            if pset.Name and "Building" in pset.Name:
                print(f"\nPropertySet: {pset.Name}")
                if hasattr(pset, 'HasProperties'):
                    for prop in pset.HasProperties:
                        if hasattr(prop, 'Name') and hasattr(prop, 'NominalValue'):
                            print(f"  {prop.Name}: {prop.NominalValue.wrappedValue if hasattr(prop.NominalValue, 'wrappedValue') else prop.NominalValue}")

    finally:
        # Cleanup
        if os.path.exists(local_path):
            os.unlink(local_path)
            print(f"\nCleaned up {local_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python inspect_ifc.py <s3_key>")
        sys.exit(1)

    s3_key = sys.argv[1]
    inspect_ifc(s3_key)
