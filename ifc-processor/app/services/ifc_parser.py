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
            raise IFCParserError("IfcSite does not have RefLatitude/RefLongitude")

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
    - Building name
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

        # Extract site information
        sites = ifc_file.by_type("IfcSite")
        if sites:
            site = sites[0]
            metadata["name"] = site.Name or "Unknown Building"
            metadata["address"] = site.LongName if hasattr(site, 'LongName') else None

            # Try to extract address from IfcPostalAddress
            if site.SiteAddress:
                address = site.SiteAddress
                if hasattr(address, 'AddressLines') and address.AddressLines:
                    metadata["address"] = ", ".join(address.AddressLines)
                metadata["city"] = address.Town if hasattr(address, 'Town') else None
                metadata["country"] = address.Country if hasattr(address, 'Country') else None

        # Extract building information
        buildings = ifc_file.by_type("IfcBuilding")
        if buildings:
            building = buildings[0]
            if metadata["name"] is None or metadata["name"] == "Unknown Building":
                metadata["name"] = building.Name or "Unknown Building"

        # Count floors
        storeys = ifc_file.by_type("IfcBuildingStorey")
        if storeys:
            metadata["floorCount"] = len(storeys)

            # Try to calculate building height from storeys
            try:
                elevations = [s.Elevation for s in storeys if s.Elevation is not None]
                if elevations and len(elevations) > 1:
                    metadata["height"] = round(max(elevations) - min(elevations), 2)
            except:
                pass

        logger.info(f"Extracted metadata: {metadata}")
        return metadata

    except Exception as e:
        logger.error(f"Error extracting metadata: {e}")
        return {
            "name": "Unknown Building",
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