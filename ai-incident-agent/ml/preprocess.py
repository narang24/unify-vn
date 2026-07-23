import re

from sklearn.feature_extraction.text import TfidfVectorizer

def clean_text(text: str) -> str:
    """
    Clean incident description.
    """
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()

    return text

def create_vectorizer():
    return TfidfVectorizer(
        stop_words = "english",
        max_features=1000
    )