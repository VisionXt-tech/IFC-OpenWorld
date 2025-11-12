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
                # Create temp directory if it doesn't exist
                temp_dir = "/tmp/ifc_processing"
                os.makedirs(temp_dir, exist_ok=True)

                # Create temp file with .glb extension (binary glTF)
                temp_file = tempfile.NamedTemporaryFile(
                    suffix=".glb", delete=False, dir=temp_dir
                )
                output_path = temp_file.name
                temp_file.close()

            self.logger.info(f"Converting to glTF: {output_path}")

            # Use IfcConvert command-line tool directly (most reliable method)
            # IfcConvert is bundled with IfcOpenShell and handles glTF conversion natively
            self.logger.info("Using IfcConvert command-line tool")
            success = self._use_ifcconvert(ifc_file_path, output_path)

            if success:
                return True, output_path, None
            else:
                return False, None, "IfcConvert failed"

        except Exception as e:
            self.logger.error(f"Error converting IFC to glTF: {str(e)}")
            return False, None, str(e)

    def _convert_via_geometry_extraction(
        self, ifc_file, output_path: str, settings, ifc_file_path: str
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
            result = self._use_ifcconvert(ifc_file_path, output_path)

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

            self.logger.info(f"[3D Conversion] Running IfcConvert: {' '.join(cmd)}")
            self.logger.info(f"[3D Conversion] Input file size: {os.path.getsize(ifc_path) / (1024*1024):.2f} MB")

            import time
            start_time = time.time()

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300,  # 5 minute timeout
            )

            elapsed = time.time() - start_time

            if result.returncode == 0:
                if os.path.exists(output_path):
                    output_size = os.path.getsize(output_path) / (1024*1024)
                    self.logger.info(f"[3D Conversion] ✅ Success! Output: {output_path}")
                    self.logger.info(f"[3D Conversion] Output size: {output_size:.2f} MB")
                    self.logger.info(f"[3D Conversion] Conversion time: {elapsed:.2f}s")

                    # Log stdout for debugging (might contain useful info)
                    if result.stdout:
                        self.logger.debug(f"[3D Conversion] IfcConvert stdout: {result.stdout[:500]}")

                    return True
                else:
                    self.logger.error(f"[3D Conversion] IfcConvert reported success but output file not found: {output_path}")
                    return False
            else:
                self.logger.error(f"[3D Conversion] ❌ Failed (exit code {result.returncode})")
                self.logger.error(f"[3D Conversion] stderr: {result.stderr[:1000]}")
                if result.stdout:
                    self.logger.error(f"[3D Conversion] stdout: {result.stdout[:1000]}")
                return False

        except subprocess.TimeoutExpired:
            self.logger.error(f"[3D Conversion] ⏱️  Timeout after 5 minutes")
            self.logger.error(f"[3D Conversion] File might be too complex or large")
            return False
        except FileNotFoundError:
            self.logger.error("[3D Conversion] 🚫 IfcConvert command not found!")
            self.logger.error("[3D Conversion] Please ensure IfcOpenShell is installed with IfcConvert CLI")
            self.logger.error("[3D Conversion] Install with: conda install -c conda-forge ifcopenshell")
            return False
        except Exception as e:
            self.logger.error(f"[3D Conversion] 💥 Unexpected error: {str(e)}")
            import traceback
            self.logger.error(f"[3D Conversion] Traceback: {traceback.format_exc()}")
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
