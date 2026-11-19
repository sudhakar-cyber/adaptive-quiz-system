import joblib

model = joblib.load("notebooks/best_model.pkl")

print("Model loaded successfully!")
print("Model type:", type(model))
print("Model:", model)