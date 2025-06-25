import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import pickle

# Sample data (you should replace this with actual logged data later)
data = {
    'emotion': ['happy', 'sad', 'angry', 'fear', 'neutral', 'sad', 'happy', 'fear'],
    'temp': [28, 34, 36, 33, 30, 35, 29, 32],
    'humidity': [45, 70, 60, 65, 50, 75, 48, 66],
    'risk': ['low', 'high', 'high', 'medium', 'low', 'high', 'low', 'medium']
}

df = pd.DataFrame(data)

# Encode emotion
df['emotion_code'] = df['emotion'].astype('category').cat.codes
df['risk_code'] = df['risk'].astype('category').cat.codes

X = df[['emotion_code', 'temp', 'humidity']]
y = df['risk_code']

model = RandomForestClassifier()
model.fit(X, y)

# Save model and label mappings
pickle.dump(model, open('risk_model.pkl', 'wb'))
pickle.dump(dict(enumerate(df['risk'].astype('category').cat.categories)), open('risk_labels.pkl', 'wb'))
pickle.dump(dict(enumerate(df['emotion'].astype('category').cat.categories)), open('emotion_labels.pkl', 'wb'))
