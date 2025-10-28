"""
Unit tests for IFC Parser Service
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from app.services.ifc_parser import IFCCoordinateExtractor, parse_ifc_file


class TestIFCCoordinateExtractor:
    """Test IFCCoordinateExtractor class"""

    def test_init(self):
        """Test extractor initialization"""
        extractor = IFCCoordinateExtractor("/path/to/file.ifc")
        assert extractor.ifc_file_path == "/path/to/file.ifc"
        assert extractor.ifc_file is None

    @patch("app.services.ifc_parser.ifcopenshell")
    def test_open_file_success(self, mock_ifcopenshell):
        """Test successful IFC file opening"""
        mock_file = Mock()
        mock_file.schema = "IFC4"
        mock_ifcopenshell.open.return_value = mock_file

        extractor = IFCCoordinateExtractor("/path/to/file.ifc")
        extractor.open_file()

        mock_ifcopenshell.open.assert_called_once_with("/path/to/file.ifc")
        assert extractor.ifc_file == mock_file

    @patch("app.services.ifc_parser.ifcopenshell")
    def test_open_file_invalid(self, mock_ifcopenshell):
        """Test opening invalid IFC file"""
        mock_ifcopenshell.open.side_effect = Exception("Invalid file")

        extractor = IFCCoordinateExtractor("/path/to/invalid.ifc")

        with pytest.raises(ValueError, match="Invalid IFC file"):
            extractor.open_file()

    def test_to_decimal_degrees_dms_format(self):
        """Test DMS to decimal degrees conversion (Rome, Italy)"""
        extractor = IFCCoordinateExtractor("/dummy.ifc")

        # Rome: 41°53'24.72000" N = 41.8902° (DMS with microseconds)
        result = extractor._to_decimal_degrees((41, 53, 24, 72000))
        assert abs(result - 41.890020) < 0.0001

        # Rome: 12°29'32.64000" E = 12.49224° (DMS with microseconds)
        result = extractor._to_decimal_degrees((12, 29, 32, 64000))
        assert abs(result - 12.49224) < 0.0001

    def test_to_decimal_degrees_dms_without_microseconds(self):
        """Test DMS conversion without microseconds"""
        extractor = IFCCoordinateExtractor("/dummy.ifc")

        # 41°53'24" N = 41.89° (DMS without microseconds)
        result = extractor._to_decimal_degrees((41, 53, 24))
        assert abs(result - 41.890000) < 0.000001

        # 12°29'32" E = 12.4922° (DMS without microseconds)
        result = extractor._to_decimal_degrees((12, 29, 32))
        assert abs(result - 12.492222) < 0.000001

    def test_to_decimal_degrees_negative_latitude(self):
        """Test negative DMS (Southern Hemisphere)"""
        extractor = IFCCoordinateExtractor("/dummy.ifc")

        # -33°51'25" (Sydney, Australia)
        result = extractor._to_decimal_degrees((-33, 51, 25))
        assert result < 0
        assert abs(result - (-33.856944)) < 0.000001

    def test_to_decimal_degrees_decimal_format(self):
        """Test decimal degrees input (already converted)"""
        extractor = IFCCoordinateExtractor("/dummy.ifc")

        # Already in decimal format
        result = extractor._to_decimal_degrees(41.8902)
        assert result == 41.8902

        result = extractor._to_decimal_degrees(12.4924)
        assert result == 12.4924

    def test_to_decimal_degrees_invalid_format(self):
        """Test invalid coordinate format"""
        extractor = IFCCoordinateExtractor("/dummy.ifc")

        # Too few values
        result = extractor._to_decimal_degrees((41, 53))
        assert result is None

        # None value
        result = extractor._to_decimal_degrees(None)
        assert result is None

        # Invalid type
        result = extractor._to_decimal_degrees("invalid")
        assert result is None

    def test_extract_site_coordinates_success(self):
        """Test successful coordinate extraction"""
        extractor = IFCCoordinateExtractor("/dummy.ifc")

        # Mock IFC file with IfcSite
        mock_site = Mock()
        mock_site.Name = "Building Site"
        mock_site.RefLatitude = (41, 53, 24, 72000)  # Rome
        mock_site.RefLongitude = (12, 29, 32, 64000)

        mock_file = Mock()
        mock_file.by_type.return_value = [mock_site]

        extractor.ifc_file = mock_file

        lat, lon = extractor.extract_site_coordinates()

        assert abs(lat - 41.890020) < 0.0001
        assert abs(lon - 12.49224) < 0.0001

    def test_extract_site_coordinates_no_site(self):
        """Test extraction when IfcSite is missing"""
        extractor = IFCCoordinateExtractor("/dummy.ifc")

        mock_file = Mock()
        mock_file.by_type.return_value = []  # No IfcSite

        extractor.ifc_file = mock_file

        result = extractor.extract_site_coordinates()
        assert result is None

    def test_extract_site_coordinates_missing_ref(self):
        """Test extraction when RefLatitude/RefLongitude are missing"""
        extractor = IFCCoordinateExtractor("/dummy.ifc")

        mock_site = Mock()
        mock_site.Name = "Building Site"
        mock_site.RefLatitude = None
        mock_site.RefLongitude = None

        mock_file = Mock()
        mock_file.by_type.return_value = [mock_site]

        extractor.ifc_file = mock_file

        result = extractor.extract_site_coordinates()
        assert result is None

    def test_extract_site_coordinates_file_not_opened(self):
        """Test extraction without opening file first"""
        extractor = IFCCoordinateExtractor("/dummy.ifc")

        with pytest.raises(RuntimeError, match="IFC file not opened"):
            extractor.extract_site_coordinates()

    def test_extract_building_metadata_full(self):
        """Test building metadata extraction with full data"""
        extractor = IFCCoordinateExtractor("/dummy.ifc")

        # Mock IfcBuilding
        mock_address = Mock()
        mock_address.AddressLines = ["Via del Corso 123"]
        mock_address.Town = "Rome"
        mock_address.Country = "Italy"

        mock_building = Mock()
        mock_building.Name = "Office Building"
        mock_building.BuildingAddress = mock_address

        # Mock IfcBuildingStorey
        mock_storey1 = Mock()
        mock_storey1.Elevation = 0.0

        mock_storey2 = Mock()
        mock_storey2.Elevation = 3.5

        mock_storey3 = Mock()
        mock_storey3.Elevation = 7.0

        mock_file = Mock()

        def mock_by_type(entity_type):
            if entity_type == "IfcBuilding":
                return [mock_building]
            elif entity_type == "IfcBuildingStorey":
                return [mock_storey1, mock_storey2, mock_storey3]
            return []

        mock_file.by_type = mock_by_type

        extractor.ifc_file = mock_file

        metadata = extractor.extract_building_metadata()

        assert metadata["name"] == "Office Building"
        assert metadata["address"] == "Via del Corso 123"
        assert metadata["city"] == "Rome"
        assert metadata["country"] == "Italy"
        assert metadata["floor_count"] == 3
        # Height = max(3.5, 7.0) - min(3.5, 7.0) = 3.5 (0.0 is filtered out as falsy)
        assert abs(metadata["height"] - 3.5) < 0.001

    def test_extract_building_metadata_minimal(self):
        """Test building metadata extraction with minimal data"""
        extractor = IFCCoordinateExtractor("/dummy.ifc")

        # Mock minimal building (no address, no storeys)
        mock_building = Mock()
        mock_building.Name = "Simple Building"
        mock_building.BuildingAddress = None

        mock_file = Mock()

        def mock_by_type(entity_type):
            if entity_type == "IfcBuilding":
                return [mock_building]
            elif entity_type == "IfcBuildingStorey":
                return []
            return []

        mock_file.by_type = mock_by_type

        extractor.ifc_file = mock_file

        metadata = extractor.extract_building_metadata()

        assert metadata["name"] == "Simple Building"
        assert metadata["address"] is None
        assert metadata["city"] is None
        assert metadata["country"] is None
        assert metadata["floor_count"] == 0
        assert metadata["height"] is None

    def test_extract_building_metadata_file_not_opened(self):
        """Test metadata extraction without opening file first"""
        extractor = IFCCoordinateExtractor("/dummy.ifc")

        with pytest.raises(RuntimeError, match="IFC file not opened"):
            extractor.extract_building_metadata()

    def test_close(self):
        """Test closing extractor"""
        extractor = IFCCoordinateExtractor("/dummy.ifc")
        extractor.ifc_file = Mock()

        extractor.close()

        assert extractor.ifc_file is None


class TestParseIFCFile:
    """Test parse_ifc_file function"""

    @patch("app.services.ifc_parser.IFCCoordinateExtractor")
    def test_parse_ifc_file_success(self, MockExtractor):
        """Test successful IFC file parsing"""
        # Mock extractor instance
        mock_extractor = Mock()
        mock_extractor.extract_site_coordinates.return_value = (41.8902, 12.4924)
        mock_extractor.extract_building_metadata.return_value = {
            "name": "Test Building",
            "address": "Test Address",
            "city": "Rome",
            "country": "Italy",
            "height": 48.5,
            "floor_count": 4,
        }

        MockExtractor.return_value = mock_extractor

        result = parse_ifc_file("/path/to/file.ifc")

        assert result["latitude"] == 41.8902
        assert result["longitude"] == 12.4924
        assert result["metadata"]["name"] == "Test Building"
        assert result["metadata"]["city"] == "Rome"

        # Verify methods were called
        mock_extractor.open_file.assert_called_once()
        mock_extractor.extract_site_coordinates.assert_called_once()
        mock_extractor.extract_building_metadata.assert_called_once()
        mock_extractor.close.assert_called_once()

    @patch("app.services.ifc_parser.IFCCoordinateExtractor")
    def test_parse_ifc_file_no_coordinates(self, MockExtractor):
        """Test parsing when coordinates are missing"""
        mock_extractor = Mock()
        mock_extractor.extract_site_coordinates.return_value = None

        MockExtractor.return_value = mock_extractor

        with pytest.raises(ValueError, match="No coordinates found"):
            parse_ifc_file("/path/to/file.ifc")

        mock_extractor.close.assert_called_once()

    @patch("app.services.ifc_parser.IFCCoordinateExtractor")
    def test_parse_ifc_file_invalid_latitude(self, MockExtractor):
        """Test parsing with invalid latitude"""
        mock_extractor = Mock()
        mock_extractor.extract_site_coordinates.return_value = (95.0, 12.4924)  # Invalid lat

        MockExtractor.return_value = mock_extractor

        with pytest.raises(ValueError, match="Invalid latitude"):
            parse_ifc_file("/path/to/file.ifc")

        mock_extractor.close.assert_called_once()

    @patch("app.services.ifc_parser.IFCCoordinateExtractor")
    def test_parse_ifc_file_invalid_longitude(self, MockExtractor):
        """Test parsing with invalid longitude"""
        mock_extractor = Mock()
        mock_extractor.extract_site_coordinates.return_value = (41.8902, 200.0)  # Invalid lon

        MockExtractor.return_value = mock_extractor

        with pytest.raises(ValueError, match="Invalid longitude"):
            parse_ifc_file("/path/to/file.ifc")

        mock_extractor.close.assert_called_once()

    @patch("app.services.ifc_parser.IFCCoordinateExtractor")
    def test_parse_ifc_file_boundary_coordinates(self, MockExtractor):
        """Test parsing with boundary coordinate values"""
        mock_extractor = Mock()
        mock_extractor.extract_site_coordinates.return_value = (-90.0, -180.0)  # Boundary values
        mock_extractor.extract_building_metadata.return_value = {
            "name": None,
            "address": None,
            "city": None,
            "country": None,
            "height": None,
            "floor_count": 0,
        }

        MockExtractor.return_value = mock_extractor

        result = parse_ifc_file("/path/to/file.ifc")

        assert result["latitude"] == -90.0
        assert result["longitude"] == -180.0

    @patch("app.services.ifc_parser.IFCCoordinateExtractor")
    def test_parse_ifc_file_exception_cleanup(self, MockExtractor):
        """Test that cleanup happens even on exception"""
        mock_extractor = Mock()
        mock_extractor.open_file.side_effect = Exception("Open failed")

        MockExtractor.return_value = mock_extractor

        with pytest.raises(Exception, match="Open failed"):
            parse_ifc_file("/path/to/file.ifc")

        # Verify cleanup was called despite exception
        mock_extractor.close.assert_called_once()
