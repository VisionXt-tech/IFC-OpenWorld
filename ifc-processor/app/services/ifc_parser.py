"""
IFC Parser Service
Extracts coordinates and metadata from IFC files using IfcOpenShell
"""
import logging
from typing import Optional, Tuple
import ifcopenshell
import ifcopenshell.geom

logger = logging.getLogger(__name__)


class IFCParserError(Exception):
    """Custom exception for IFC parsing errors"""
    pass


def extract_coordinates_from_ifc(file_path: str) -> Tuple[float, float]:
    """
    Extract geographic coordinates from IFC file.

    Looks for IfcSite with RefLatitude and RefLongitude attributes.
    Handles both decimal degrees and DMS (Degrees, Minutes, Seconds) format.

    Args:
        file_path: Path to IFC file on disk

    Returns:
        Tuple of (latitude, longitude) in decimal degrees

    Raises:
        IFCParserError: If file cannot be parsed or coordinates not found
    """
    try:
        logger.info(f"Opening IFC file: {file_path}")
        ifc_file = ifcopenshell.open(file_path)

        # Find IfcSite entity (contains geographic reference)
        sites = ifc_file.by_type("IfcSite")

        if not sites:
            raise IFCParserError("No IfcSite found in IFC file")

        site = sites[0]  # Use first site
        logger.info(f"Found IfcSite: {site.Name}")

        # Extract coordinates
        ref_latitude = site.RefLatitude
        ref_longitude = site.RefLongitude

        if ref_latitude is None or ref_longitude is None:
            raise IFCParserError(
                "This IFC file does not contain geographic coordinates (RefLatitude/RefLongitude). "
                "Please ensure your IFC file includes IfcSite with valid geolocation data, or use a different file."
            )

        # Convert from DMS to decimal degrees if necessary
        latitude = _convert_to_decimal(ref_latitude, "latitude")
        longitude = _convert_to_decimal(ref_longitude, "longitude")

        # Validate coordinates
        if not (-90 <= latitude <= 90):
            raise IFCParserError(f"Invalid latitude: {latitude} (must be between -90 and 90)")

        if not (-180 <= longitude <= 180):
            raise IFCParserError(f"Invalid longitude: {longitude} (must be between -180 and 180)")

        logger.info(f"Extracted coordinates: lat={latitude}, lon={longitude}")

        return (latitude, longitude)

    except ifcopenshell.Error as e:
        logger.error(f"IfcOpenShell error: {e}")
        raise IFCParserError(f"Failed to parse IFC file: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error parsing IFC: {e}")
        raise IFCParserError(f"Unexpected error: {str(e)}")


def extract_metadata_from_ifc(file_path: str) -> dict:
    """
    Extract building metadata from IFC file.

    Extracts:
    - Building name (from multiple sources with fallback hierarchy)
    - Site address
    - Building height
    - Floor count
    - Other relevant metadata

    Args:
        file_path: Path to IFC file on disk

    Returns:
        Dictionary with metadata
    """
    try:
        ifc_file = ifcopenshell.open(file_path)

        metadata = {
            "name": None,
            "address": None,
            "city": None,
            "country": None,
            "height": None,
            "floorCount": None,
        }

        # Priority 1: Try to get building name from IfcBuilding
        buildings = ifc_file.by_type("IfcBuilding")
        if buildings:
            building = buildings[0]

            # Try LongName first (often contains full descriptive name)
            if hasattr(building, 'LongName') and building.LongName and building.LongName not in ['Default', 'default', '']:
                metadata["name"] = building.LongName
            # Then try Name
            elif building.Name and building.Name not in ['Default', 'default', '']:
                metadata["name"] = building.Name
            # Then try Description
            elif hasattr(building, 'Description') and building.Description:
                metadata["name"] = building.Description

            # Try to get address from BuildingAddress
            if hasattr(building, 'BuildingAddress') and building.BuildingAddress:
                address = building.BuildingAddress
                if hasattr(address, 'AddressLines') and address.AddressLines:
                    # Filter out empty strings and join
                    addr_lines = [line for line in address.AddressLines if line and line.strip()]
                    if addr_lines:
                        metadata["address"] = ", ".join(addr_lines)

                if hasattr(address, 'Town') and address.Town:
                    metadata["city"] = address.Town
                if hasattr(address, 'Country') and address.Country:
                    metadata["country"] = address.Country

        # Priority 2: If no building name yet, try IfcSite
        if not metadata["name"]:
            sites = ifc_file.by_type("IfcSite")
            if sites:
                site = sites[0]

                # Try LongName first
                if hasattr(site, 'LongName') and site.LongName and site.LongName not in ['Default', 'default', 'environment - site', '']:
                    metadata["name"] = site.LongName
                # Then try Name (but filter out generic names)
                elif site.Name and site.Name not in ['Default', 'default', 'environment - site', 'Site', '']:
                    metadata["name"] = site.Name
                # Then try Description
                elif hasattr(site, 'Description') and site.Description:
                    metadata["name"] = site.Description

                # Try to extract address from SiteAddress if not already set
                if not metadata["address"] and hasattr(site, 'SiteAddress') and site.SiteAddress:
                    address = site.SiteAddress
                    if hasattr(address, 'AddressLines') and address.AddressLines:
                        addr_lines = [line for line in address.AddressLines if line and line.strip()]
                        if addr_lines:
                            metadata["address"] = ", ".join(addr_lines)

                    if not metadata["city"] and hasattr(address, 'Town') and address.Town:
                        metadata["city"] = address.Town
                    if not metadata["country"] and hasattr(address, 'Country') and address.Country:
                        metadata["country"] = address.Country

        # Priority 3: If still no name, try IfcProject
        if not metadata["name"]:
            projects = ifc_file.by_type("IfcProject")
            if projects:
                project = projects[0]

                if hasattr(project, 'LongName') and project.LongName:
                    metadata["name"] = project.LongName
                elif project.Name and project.Name not in ['Default', 'default', 'Project', '']:
                    metadata["name"] = project.Name

        # Priority 4: If still no name, extract from filename (last resort)
        if not metadata["name"]:
            import os
            filename = os.path.basename(file_path)
            # Remove extension and clean up
            name_from_file = os.path.splitext(filename)[0]
            # Replace underscores and hyphens with spaces
            name_from_file = name_from_file.replace('_', ' ').replace('-', ' ')
            # Remove common prefixes/suffixes
            for prefix in ['tmp', 'temp', 'ifc', 'file']:
                if name_from_file.lower().startswith(prefix):
                    name_from_file = name_from_file[len(prefix):].strip()

            if name_from_file and len(name_from_file) > 3:
                metadata["name"] = name_from_file
            else:
                metadata["name"] = "Building"  # Generic fallback

        # Count floors (building storeys)
        storeys = ifc_file.by_type("IfcBuildingStorey")
        if storeys:
            metadata["floorCount"] = len(storeys)

            # Try to calculate building height from storeys
            try:
                elevations = [s.Elevation for s in storeys if s.Elevation is not None]
                if elevations and len(elevations) > 1:
                    # Height is difference between highest and lowest floor
                    metadata["height"] = round(max(elevations) - min(elevations), 2)
            except Exception as e:
                logger.warning(f"Could not calculate height from elevations: {e}")

        logger.info(f"Extracted metadata: {metadata}")
        return metadata

    except Exception as e:
        logger.error(f"Error extracting metadata: {e}")
        # Return minimal fallback
        import os
        filename = os.path.basename(file_path)
        name_from_file = os.path.splitext(filename)[0].replace('_', ' ').replace('-', ' ')

        return {
            "name": name_from_file if len(name_from_file) > 3 else "Building",
            "address": None,
            "city": None,
            "country": None,
            "height": None,
            "floorCount": None,
        }


def _convert_to_decimal(value, coord_type: str) -> float:
    """
    Convert coordinate from DMS to decimal degrees.

    IFC stores coordinates as tuple: (degrees, minutes, seconds, milliseconds)
    or as a simple float if already in decimal degrees.

    Args:
        value: Coordinate value (tuple or float)
        coord_type: "latitude" or "longitude" (for error messages)

    Returns:
        Coordinate in decimal degrees
    """
    if isinstance(value, (int, float)):
        # Already in decimal degrees
        return float(value)

    if isinstance(value, (list, tuple)):
        # DMS format: (degrees, minutes, seconds, milliseconds)
        if len(value) < 3:
            raise IFCParserError(f"Invalid {coord_type} format: {value}")

        degrees = value[0]
        minutes = value[1] if len(value) > 1 else 0
        seconds = value[2] if len(value) > 2 else 0
        milliseconds = value[3] if len(value) > 3 else 0

        # Convert to decimal
        decimal = abs(degrees) + minutes / 60 + (seconds + milliseconds / 1000) / 3600

        # Apply sign (negative for South/West)
        if degrees < 0:
            decimal = -decimal

        return decimal

    raise IFCParserError(f"Unsupported {coord_type} format: {type(value)}")