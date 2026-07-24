"""
ML incident classifier.

The trained TF-IDF + LogisticRegression model predicts the incident *category*
(e.g. "Database Failure", "Kubernetes Failure") and a calibrated confidence via
predict_proba. This runs FIRST in the agent pipeline so the orchestrator can
select the appropriate tools and retrieved knowledge before reasoning.
"""

import os
import joblib
from ml.preprocess import clean_text

_HERE = os.path.dirname(__file__)
MODEL_PATH = os.path.join(_HERE, "models", "incident_classifier.pkl")
VECTORIZER_PATH = os.path.join(_HERE, "models", "tfidf.pkl")

# Lazy singletons so importing this module never crashes if the model files
# aren't present yet (e.g. before the first `python -m ml.train`).
_model = None
_vectorizer = None


def _load():
    global _model, _vectorizer
    if _model is None or _vectorizer is None:
        _model = joblib.load(MODEL_PATH)
        _vectorizer = joblib.load(VECTORIZER_PATH)
    return _model, _vectorizer


def predict(incident: str) -> str:
    """Return only the predicted category label."""
    model, vectorizer = _load()
    X = vectorizer.transform([clean_text(incident)])
    return str(model.predict(X)[0])


def classify(incident: str) -> dict:
    """
    Classify an incident and return the label, confidence and the full
    probability distribution across categories.
    """
    model, vectorizer = _load()
    X = vectorizer.transform([clean_text(incident)])

    label = str(model.predict(X)[0])

    probabilities: dict[str, float] = {}
    confidence = 0.0
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(X)[0]
        classes = list(model.classes_)
        probabilities = {str(c): float(p) for c, p in zip(classes, proba)}
        confidence = float(max(proba))

    # Top-3 categories, most likely first.
    top = sorted(probabilities.items(), key=lambda kv: kv[1], reverse=True)[:3]

    return {
        "category": label,
        "confidence": round(confidence, 4),
        "top_categories": [{"category": c, "probability": round(p, 4)} for c, p in top],
        "probabilities": probabilities,
    }


def classify_safe(incident: str) -> dict:
    """classify() that never raises — falls back to 'Unknown' if the model is missing."""
    try:
        return classify(incident)
    except Exception as exc:  # noqa: BLE001
        print(f"[ml] classifier unavailable: {exc}")
        return {"category": "Unknown", "confidence": 0.0, "top_categories": [], "probabilities": {}}


if __name__ == "__main__":
    print(classify("PostgreSQL connection timeout after deployment"))
