"""Computer vision inference for property type classification from images."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class CVPrediction:
    property_type: str
    image_quality_score: float
    coverage_score: float
    confidence: float
    status: str
    warnings: list[str] = field(default_factory=list)
    model_info: dict[str, Any] = field(default_factory=dict)


class CVModelService:
    """Load and use pre-trained ResNet50 CV model for property type classification."""

    def __init__(self, artifacts_dir: str | Path | None = None) -> None:
        root = Path(__file__).resolve().parents[3]
        self.artifacts_dir = Path(artifacts_dir) if artifacts_dir else root / "backend" / "valuation" / "artifacts" / "models"
        self.model_path = self.artifacts_dir / "image_property_type_fallback.pt"
        self.labels_path = self.artifacts_dir / "image_property_type_fallback.labels.json"

        self._model: Any | None = None
        self._labels: list[str] | None = None
        self._transform: Any | None = None

    def _load_model(self) -> bool:
        if self._model is not None:
            return True
        if not self.model_path.exists():
            return False
        try:
            import torch
            import torchvision.transforms as T
            import json

            self._model = torch.load(self.model_path, map_location="cpu", weights_only=False)
            self._model.eval()

            if self.labels_path.exists():
                with open(self.labels_path) as f:
                    self._labels = json.load(f)
            else:
                self._labels = ["apartment", "house", "land", "commercial"]

            self._transform = T.Compose([
                T.Resize((224, 224)),
                T.ToTensor(),
                T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ])
            return True
        except Exception:
            return False

    def analyze_images(self, image_files: list) -> CVPrediction | None:
        """Analyze images for property type classification."""
        if not image_files:
            return None

        model_available = self._load_model()

        if not model_available:
            coverage = min(len(image_files) / 4.0, 1.0)
            return CVPrediction(
                property_type="unknown",
                image_quality_score=0.5,
                coverage_score=round(coverage, 2),
                confidence=0.0,
                status="model_unavailable",
                warnings=["cv_model_not_available"],
                model_info={"status": "model_unavailable"},
            )

        try:
            import torch
            from PIL import Image as PILImage
            import io

            type_votes: dict[str, float] = {}
            quality_scores: list[float] = []

            for img_file in image_files:
                try:
                    data = img_file.read()
                    img_file.seek(0)
                    img = PILImage.open(io.BytesIO(data)).convert("RGB")
                    w, h = img.size
                    res_score = min((w * h) / (1280 * 720), 1.0)
                    quality_scores.append(res_score)

                    tensor = self._transform(img).unsqueeze(0)
                    with torch.no_grad():
                        logits = self._model(tensor)
                        probs = torch.softmax(logits, dim=1)[0]

                    for i, prob in enumerate(probs.tolist()):
                        label = self._labels[i] if i < len(self._labels) else f"class_{i}"
                        type_votes[label] = type_votes.get(label, 0.0) + prob
                except Exception:
                    quality_scores.append(0.5)

            best_type = max(type_votes, key=type_votes.__getitem__) if type_votes else "unknown"
            total_votes = sum(type_votes.values()) or 1.0
            confidence = type_votes.get(best_type, 0.0) / total_votes

            avg_quality = sum(quality_scores) / len(quality_scores) if quality_scores else 0.5
            coverage = min(len(image_files) / 4.0, 1.0)

            return CVPrediction(
                property_type=best_type,
                image_quality_score=round(avg_quality, 3),
                coverage_score=round(coverage, 2),
                confidence=round(confidence, 3),
                status="success",
                warnings=[],
                model_info={
                    "model": "resnet50_property_type",
                    "image_count": len(image_files),
                    "type_distribution": {k: round(v / total_votes, 3) for k, v in type_votes.items()},
                },
            )
        except Exception as exc:
            coverage = min(len(image_files) / 4.0, 1.0)
            return CVPrediction(
                property_type="unknown",
                image_quality_score=0.5,
                coverage_score=round(coverage, 2),
                confidence=0.0,
                status="inference_error",
                warnings=[f"cv_inference_error: {str(exc)}"],
                model_info={"error": str(exc)},
            )
