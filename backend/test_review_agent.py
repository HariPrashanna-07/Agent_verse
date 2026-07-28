from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_review_code():
    response = client.post(
        "/api/review-code",
        json={
            "code_snippet": "def two_sum(nums, target):\n    for i in range(len(nums)):\n        for j in range(i+1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]",
            "language": "python",
            "context": "Two sum problem"
        }
    )
    print("Status:", response.status_code)
    print("JSON:", response.json())

if __name__ == "__main__":
    test_review_code()
