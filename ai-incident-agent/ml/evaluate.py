import joblib
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report
from ml.preprocess import clean_text 

TEST_DATA = "./ml/data/test_incidents.csv"
MODEL_PATH = "./ml/models/incident_classifier.pkl"
VECTORIZER_PATH = "./ml/models/tfidf.pkl"

def evaluate():
    df = pd.read_csv(TEST_DATA)
    df["incident"] = df["incident"].apply(clean_text)

    y_true = df["category"]

    vectorizer = joblib.load(VECTORIZER_PATH)

    X_test = vectorizer.transform(df["incident"])

    model = joblib.load(MODEL_PATH)

    y_pred = model.predict(X_test)

    accuracy = accuracy_score(y_true, y_pred)
    report = classification_report(y_true, y_pred)

    print("Accuracy:", accuracy)
    print()
    print("Classification Report:")
    print(report)

if __name__ == "__main__":
    evaluate()