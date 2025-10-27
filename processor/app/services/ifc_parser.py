"""
IFC Parser Service - Extract coordinates from IFC files using IfcOpenShell
"""

import ifcopenshell
import ifcopenshell.geom
from typing import Optional, Tuple, Dict, Any
import logging
import re

logger = logging.getLogger(__name__)


class IFCCoordinateExtractor:
    """Extract geographical coordinates from IFC files"""

    def __init__(self, ifc_file_path: str):
        """
        Initialize IFC parser

        Args:
            ifc_file_path: Path to IFC file
        """
        self.ifc_file_path = ifc_file_path
        self.ifc_file: Optional[ifcopenshell.file] = None

    def open_file(self) -> None:
        """Open IFC file for parsing"""
        try:
            self.ifc_file = ifcopenshell.open(self.ifc_file_path)
            logger.info(f"Opened IFC file: {self.ifc_file_path}")
            logger.info(f"IFC Schema: {self.ifc_file.schema}")
        except Exception as e:
            logger.error(f"Failed to open IFC file: {e}")
            raise ValueError(f"Invalid IFC file: {str(e)}")

    def extract_site_coordinates(self) -> Optional[Tuple[float, float]]:
        """
        Extract coordinates from IfcSite entity

        Returns:
            Tuple of (latitude, longitude) in decimal degrees, or None if not found

        IFC coordinates can be in various formats:
        - IfcCompoundPlaneAngleMeasure (DMS - degrees, minutes, seconds)
        - Decimal degrees
        """
        if not self.ifc_file:
            raise RuntimeError("IFC file not opened. Call open_file() first")

        # Find IfcSite entity
        sites = self.ifc_file.by_type("IfcSite")

        if not sites:
            logger.warning("No IfcSite found in IFC file")
            return None

        site = sites[0]  # Use first site
        logger.info(f"Found IfcSite: {site.Name}")

        # Extract RefLatitude and RefLongitude
        ref_latitude = site.RefLatitude
        ref_longitude = site.RefLongitude

        if not ref_latitude or not ref_longitude:
            logger.warning("IfcSite missing RefLatitude or RefLongitude")
            return None

        # Convert to decimal degrees
        latitude_dd = self._to_decimal_degrees(ref_latitude)
        longitude_dd = self._to_decimal_degrees(ref_longitude)

        if latitude_dd is None or longitude_dd is None:
            logger.error("Failed to convert coordinates to decimal degrees")
            return None

        logger.info(f"Extracted coordinates: lat={latitude_dd}, lon={longitude_dd}")

        return (latitude_dd, longitude_dd)

    def _to_decimal_degrees(self, compound_angle: Any) -> Optional[float]:
        """
        Convert IfcCompoundPlaneAngleMeasure to decimal degrees

        IFC format: (degrees, minutes, seconds, microseconds) or (degrees, minutes, seconds)

        Args:
            compound_angle: IFC compound angle measure (tuple or single value)

        Returns:
            Decimal degrees or None if conversion fails
        """
        if compound_angle is None:
            return None

        try:
            # Handle tuple format (DMS)
            if isinstance(compound_angle, (tuple, list)):
                if len(compound_angle) >= 3:
                    degrees = float(compound_angle[0])
                    minutes = float(compound_angle[1])
                    seconds = float(compound_angle[2])

                    # Optional microseconds (some IFC files include this)
                    microseconds = float(compound_angle[3]) if len(compound_angle) > 3 else 0.0

                    # Convert to decimal degrees
                    decimal = abs(degrees) + minutes / 60.0 + seconds / 3600.0 + microseconds / 3600000000.0

                    # Preserve sign
                    if degrees < 0:
                        decimal = -decimal

                    return decimal
                else:
                    logger.warning(f"Unexpected compound angle format: {compound_angle}")
                    return None

            # Handle single value (already decimal degrees)
            return float(compound_angle)

        except (ValueError, TypeError) as e:
            logger.error(f"Failed to parse compound angle: {e}")
            return None

    def extract_building_metadata(self) -> Dict[str, Any]:
        """
        Extract additional building metadata from IFC file

        Returns:
            Dictionary with building information (name, address, etc.)
        """
        if not self.ifc_file:
            raise RuntimeError("IFC file not opened")

        metadata: Dict[str, Any] = {
            "name": None,
            "address": None,
            "city": None,
            "country": None,
            "height": None,
            "floor_count": None,
        }

        # Extract from IfcBuilding
        buildings = self.ifc_file.by_type("IfcBuilding")
        if buildings:
            building = buildings[0]
            metadata["name"] = building.Name

            # Try to extract postal address
            if hasattr(building, "BuildingAddress") and building.BuildingAddress:
                address = building.BuildingAddress
                if hasattr(address, "AddressLines") and address.AddressLines:
                    metadata["address"] = ", ".join(address.AddressLines)
                if hasattr(address, "Town"):
                    metadata["city"] = address.Town
                if hasattr(address, "Country"):
                    metadata["country"] = address.Country

        # Count floors
        storeys = self.ifc_file.by_type("IfcBuildingStorey")
        metadata["floor_count"] = len(storeys)

        # Estimate building height (simplified - would need proper geometry calculation)
        if storeys:
            elevations = [storey.Elevation for storey in storeys if hasattr(storey, "Elevation") and storey.Elevation]
            if elevations:
                metadata["height"] = max(elevations) - min(elevations)

        logger.info(f"Extracted building metadata: {metadata}")
        return metadata

    def close(self) -> None:
        """Close IFC file and cleanup"""
        self.ifc_file = None
        logger.info("Closed IFC file")


def parse_ifc_file(file_path: str) -> Dict[str, Any]:
    """
    Main function to parse IFC file and extract coordinates

    Args:
        file_path: Path to IFC file

    Returns:
        Dictionary with extracted data:
        {
            "latitude": float,
            "longitude": float,
            "metadata": {...}
        }

    Raises:
        ValueError: If IFC file is invalid or missing required data
    """
    extractor = IFCCoordinateExtractor(file_path)

    try:
        extractor.open_file()

        # Extract coordinates
        coordinates = extractor.extract_site_coordinates()
        if not coordinates:
            raise ValueError("No coordinates found in IFC file (missing IfcSite.RefLatitude/RefLongitude)")

        latitude, longitude = coordinates

        # Validate coordinate ranges
        if not (-90 <= latitude <= 90):
            raise ValueError(f"Invalid latitude: {latitude} (must be between -90 and 90)")
        if not (-180 <= longitude <= 180):
            raise ValueError(f"Invalid longitude: {longitude} (must be between -180 and 180)")

        # Extract metadata
        metadata = extractor.extract_building_metadata()

        return {
            "latitude": latitude,
            "longitude": longitude,
            "metadata": metadata,
        }

    finally:
        extractor.close()
