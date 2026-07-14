import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import LabelEncoder
from app.services.database import db
from app.services.road_retriever import StructuredRoadRetriever


class CostPredictor:
    _model: LinearRegression | None = None
    _region_encoder: LabelEncoder | None = None
    _road_type_encoder: LabelEncoder | None = None
    _mean_spent_per_km: float = 0.0
    _std_spent_per_km: float = 0.0
    _training_data: list[dict] = []
    _is_trained: bool = False

    @classmethod
    def train(cls):
        try:
            projects = db.query(
                "SELECT p.id, p.budget_spent, p.budget_allocated, "
                "r.length_km, r.road_type, rgn.code AS region_code "
                "FROM projects p "
                "JOIN roads r ON p.road_id = r.id "
                "JOIN authorities a ON r.authority_id = a.id "
                "JOIN regions rgn ON a.region_code = rgn.code "
                "WHERE p.status IN ('completed', 'in_progress') "
                "AND r.length_km > 0 AND p.budget_spent > 0"
            )
        except Exception as e:
            print(f"Database query failed in CostPredictor.train ({e}) — training skipped")
            cls._is_trained = False
            return
        if not projects or len(projects) < 3:
            cls._is_trained = False
            return

        cls._training_data = projects
        spent_per_km = np.array([
            float(p['budget_spent']) / float(p['length_km'])
            for p in projects
        ])
        cls._mean_spent_per_km = float(np.mean(spent_per_km))
        cls._std_spent_per_km = float(np.std(spent_per_km))

        cls._road_type_encoder = LabelEncoder()
        cls._region_encoder = LabelEncoder()
        road_types = cls._road_type_encoder.fit_transform([p['road_type'] for p in projects])
        regions = cls._region_encoder.fit_transform([p['region_code'] for p in projects])
        lengths = np.array([float(p['length_km']) for p in projects]).reshape(-1, 1)

        X = np.column_stack([road_types, regions, lengths])
        y = spent_per_km

        cls._model = LinearRegression()
        cls._model.fit(X, y)
        cls._is_trained = True

    @classmethod
    def is_trained(cls) -> bool:
        return cls._is_trained

    @classmethod
    def predict_cost_per_km(cls, road_type: str, region_code: str, length_km: float = 1.0) -> dict | None:
        if not cls._is_trained or not cls._model:
            if cls._mean_spent_per_km > 0:
                return {
                    "predicted_per_km": round(cls._mean_spent_per_km, 2),
                    "prediction_method": "regional_average",
                    "min_expected": round(max(0, cls._mean_spent_per_km - cls._std_spent_per_km), 2),
                    "max_expected": round(cls._mean_spent_per_km + cls._std_spent_per_km, 2),
                }
            return None

        try:
            rt_enc = cls._road_type_encoder.transform([road_type])[0]
            rg_enc = cls._region_encoder.transform([region_code])[0]
        except (ValueError, AttributeError):
            if cls._mean_spent_per_km > 0:
                return {
                    "predicted_per_km": round(cls._mean_spent_per_km, 2),
                    "prediction_method": "regional_average_fallback",
                    "min_expected": round(max(0, cls._mean_spent_per_km - cls._std_spent_per_km), 2),
                    "max_expected": round(cls._mean_spent_per_km + cls._std_spent_per_km, 2),
                }
            return None

        X_pred = np.array([[rt_enc, rg_enc, length_km]])
        predicted = float(cls._model.predict(X_pred)[0])
        residuals = np.abs([
            float(p['budget_spent']) / float(p['length_km']) - cls._model.predict(
                np.array([[
                    cls._road_type_encoder.transform([p['road_type']])[0],
                    cls._region_encoder.transform([p['region_code']])[0],
                    float(p['length_km'])
                ]])
            )[0]
            for p in cls._training_data
        ])
        std_residual = float(np.std(residuals)) if len(residuals) > 1 else cls._std_spent_per_km * 0.2

        return {
            "predicted_per_km": round(predicted, 2),
            "prediction_method": "linear_regression",
            "min_expected": round(max(0, predicted - 1.5 * std_residual), 2),
            "max_expected": round(predicted + 1.5 * std_residual, 2),
            "r2_score": round(float(cls._model.score(
                np.column_stack([
                    cls._road_type_encoder.transform([p['road_type'] for p in cls._training_data]),
                    cls._region_encoder.transform([p['region_code'] for p in cls._training_data]),
                    np.array([float(p['length_km']) for p in cls._training_data])
                ]),
                np.array([float(p['budget_spent']) / float(p['length_km']) for p in cls._training_data])
            )), 4) if len(cls._training_data) >= 4 else None,
        }

    @classmethod
    def get_anomalies(cls, threshold_std: float = 2.0) -> list[dict]:
        if not cls._is_trained and cls._mean_spent_per_km == 0:
            cls.train()
            if not cls._is_trained and cls._mean_spent_per_km == 0:
                return []

        anomalies = []
        cost_per_km_data = db.query(
            "SELECT p.id AS project_id, p.title, r.length_km, "
            "p.budget_spent, p.budget_allocated, "
            "r.name AS road_name, r.road_type, "
            "rgn.code AS region_code, c.name AS contractor_name "
            "FROM projects p "
            "JOIN roads r ON p.road_id = r.id "
            "JOIN authorities a ON r.authority_id = a.id "
            "JOIN regions rgn ON a.region_code = rgn.code "
            "LEFT JOIN contractors c ON p.contractor_id = c.id "
            "WHERE r.length_km > 0 AND p.budget_spent > 0"
        )

        for row in cost_per_km_data:
            actual_per_km = float(row['budget_spent']) / float(row['length_km'])
            prediction = cls.predict_cost_per_km(
                row['road_type'], row['region_code'], float(row['length_km'])
            )
            if not prediction:
                continue

            expected = prediction.get('predicted_per_km', cls._mean_spent_per_km)
            deviation = actual_per_km - expected
            threshold = cls._std_spent_per_km * threshold_std if cls._std_spent_per_km > 0 else expected * 0.5

            if abs(deviation) > threshold:
                anomalies.append({
                    "project_id": row['project_id'],
                    "project_title": row['title'],
                    "road_name": row['road_name'],
                    "contractor_name": row['contractor_name'],
                    "region_code": row['region_code'],
                    "actual_per_km": round(actual_per_km, 2),
                    "expected_per_km": round(expected, 2),
                    "deviation_pct": round((deviation / expected) * 100, 1),
                    "severity": "high" if abs(deviation) > threshold * 1.5 else "medium",
                    "direction": "over" if deviation > 0 else "under",
                })

        anomalies.sort(key=lambda x: abs(x['deviation_pct']), reverse=True)
        return anomalies

    @classmethod
    def get_model_metrics(cls) -> dict:
        return {
            "is_trained": cls._is_trained,
            "mean_cost_per_km": round(cls._mean_spent_per_km, 2),
            "std_cost_per_km": round(cls._std_spent_per_km, 2),
            "training_samples": len(cls._training_data),
        }


CostPredictor.train()
