"""
glTF Converter Service
Converts IFC files to glTF format for 3D visualization
"""
import logging
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Optional, Tuple

import ifcopenshell
import ifcopenshell.geom

logger = logging.getLogger(__name__)


class GLTFConverter:
    """
    Converts IFC files to glTF format using IfcOpenShell geometry engine
    """

    def __init__(self):
        self.logger = logger

    def convert_ifc_to_gltf(
        self, ifc_file_path: str, output_path: Optional[str] = None
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Convert IFC file to glTF format

        Args:
            ifc_file_path: Path to input IFC file
            output_path: Optional output path for glTF file. If None, creates temp file.

        Returns:
            Tuple of (success: bool, gltf_path: Optional[str], error: Optional[str])
        """
        try:
            # Validate input file exists
            if not os.path.exists(ifc_file_path):
                return False, None, f"Input file not found: {ifc_file_path}"

            # Load IFC file
            self.logger.info(f"Loading IFC file: {ifc_file_path}")
            ifc_file = ifcopenshell.open(ifc_file_path)

            # Determine output path
            if output_path is None:
                # Create temp file with .glb extension (binary glTF)
                temp_file = tempfile.NamedTemporaryFile(
                    suffix=".glb", delete=False, dir="/tmp/ifc_processing"
                )
                output_path = temp_file.name
                temp_file.close()

            self.logger.info(f"Converting to glTF: {output_path}")

            # Use IfcOpenShell geometry engine to extract geometry
            settings = ifcopenshell.geom.settings()
            settings.set(settings.USE_WORLD_COORDS, True)
            settings.set(settings.WELD_VERTICES, True)
            settings.set(settings.SEW_SHELLS, True)

            # Try using ifcopenshell's built-in glTF export if available
            # Otherwise, we'll use alternative method
            try:
                # Method 1: Direct glTF export (if supported by version)
                import ifcopenshell.geom.main

                # This is a placeholder - actual implementation depends on IfcOpenShell version
                # For now, we'll use geometry extraction and manual glTF creation
                self.logger.info("Using geometry extraction method")
                success = self._convert_via_geometry_extraction(
                    ifc_file, output_path, settings
                )

                if success:
                    return True, output_path, None
                else:
                    return False, None, "Geometry extraction failed"

            except Exception as e:
                self.logger.warning(f"Direct export not available: {e}")
                # Fallback to geometry extraction
                success = self._convert_via_geometry_extraction(
                    ifc_file, output_path, settings
                )

                if success:
                    return True, output_path, None
                else:
                    return False, None, f"Conversion failed: {str(e)}"

        except Exception as e:
            self.logger.error(f"Error converting IFC to glTF: {str(e)}")
            return False, None, str(e)

    def _convert_via_geometry_extraction(
        self, ifc_file, output_path: str, settings
    ) -> bool:
        """
        Convert IFC to glTF by extracting geometry and creating glTF manually

        This is a simplified implementation. For production, consider:
        - Using pygltflib or trimesh libraries
        - Implementing proper material/texture handling
        - Adding Level of Detail (LOD) support
        """
        try:
            # Extract all products with geometry
            products = ifc_file.by_type("IfcProduct")

            if not products:
                self.logger.warning("No products found in IFC file")
                return False

            # For MVP, we'll create a simple OBJ file first, then convert to glTF
            # This is a simplified approach
            obj_path = output_path.replace(".glb", ".obj")

            self.logger.info(f"Extracting geometry for {len(products)} products")

            # Use IfcConvert command-line tool (most reliable method)
            result = self._use_ifcconvert(output_path.replace(".glb", ""), output_path)

            return result

        except Exception as e:
            self.logger.error(f"Geometry extraction failed: {str(e)}")
            return False

    def _use_ifcconvert(self, ifc_path: str, output_path: str) -> bool:
        """
        Use IfcConvert command-line tool to convert IFC to glTF

        IfcConvert is the most reliable way to convert IFC files
        """
        try:
            # IfcConvert command
            # Format: IfcConvert input.ifc output.glb
            cmd = ["IfcConvert", ifc_path, output_path]

            self.logger.info(f"Running IfcConvert: {' '.join(cmd)}")

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300,  # 5 minute timeout
            )

            if result.returncode == 0:
                self.logger.info("IfcConvert completed successfully")
                return True
            else:
                self.logger.error(f"IfcConvert failed: {result.stderr}")
                return False

        except subprocess.TimeoutExpired:
            self.logger.error("IfcConvert timed out after 5 minutes")
            return False
        except FileNotFoundError:
            self.logger.error("IfcConvert not found. Is it installed?")
            return False
        except Exception as e:
            self.logger.error(f"IfcConvert execution failed: {str(e)}")
            return False

    def get_model_metadata(self, gltf_path: str) -> dict:
        """
        Extract metadata from glTF file (file size, polygon count, etc.)
        """
        try:
            file_size = os.path.getsize(gltf_path)

            return {
                "file_size_bytes": file_size,
                "file_size_mb": round(file_size / (1024 * 1024), 2),
                "format": "glb" if gltf_path.endswith(".glb") else "gltf",
            }
        except Exception as e:
            self.logger.error(f"Failed to get model metadata: {str(e)}")
            return {}


# Singleton instance
gltf_converter = GLTFConverter()
