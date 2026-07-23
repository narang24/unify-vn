import joblib
from ml.preprocess import clean_text

MODEL_PATH = "./ml/models/incident_classifier.pkl"
VECTORIZER_PATH = "./ml/models/tfidf.pkl"

model = joblib.load(MODEL_PATH)
vectorizer = joblib.load(VECTORIZER_PATH)

def predict(incident: str):
    incident = clean_text(incident)

    X = vectorizer.transform([incident])

    prediction = model.predict(X)

    return prediction[0]

if __name__ == "__main__":
    incident = "PostgreSQL connection timeout after deployment"

    print(predict(incident))