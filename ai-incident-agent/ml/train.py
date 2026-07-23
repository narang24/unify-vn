import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression
from ml.preprocess import clean_text, create_vectorizer

DATA_PATH = "./ml/data/incidents.csv"

MODEL_PATH = "./ml/models/incident_classifier.pkl"
VECTORIZER_PATH = "./ml/models/tfidf.pkl"

def train():
    df = pd.read_csv(DATA_PATH)

    df["incident"] = df["incident"].apply(clean_text)

    vectorizer = create_vectorizer()
    X = vectorizer.fit_transform(df["incident"])
    y = df["category"]

    model = LogisticRegression()
    model.fit(X, y)

    joblib.dump(model, MODEL_PATH)
    joblib.dump(vectorizer, VECTORIZER_PATH)

if __name__ == "__main__":
    train()